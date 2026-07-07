import { Worker } from 'bullmq';
import Anthropic from '@anthropic-ai/sdk';
import { getRedis } from '../lib/redis.js';
import { getDb, persons, vitalEvents, notifications, researchHints } from '@rootlink/db';
import { eq, and } from 'drizzle-orm';
import { QUEUE_NAMES } from '@rootlink/shared';
import { env } from '../config/env.js';
import type { AiBioJob, AiHintJob } from './queues.js';
import { getDisplayName, formatPartialDate } from '@rootlink/shared';
import pino from 'pino';

const logger = pino({ name: 'ai-worker' });

function getAnthropic(): Anthropic | null {
  if (!env.ENABLE_AI_FEATURES || !env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

// ── Bio generation worker ──────────────────────────────────────────────────

async function generateBiography(personId: string, treeId: string): Promise<string> {
  const { db } = getDb();

  const [person] = await db.select().from(persons)
    .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)))
    .limit(1);

  if (!person) throw new Error('Person not found');

  const events = await db.select().from(vitalEvents)
    .where(eq(vitalEvents.personId, personId));

  const displayName = getDisplayName({
    firstName: person.firstName,
    middleName: person.middleName ?? null,
    lastName: person.lastName,
    preferredName: person.preferredName ?? null,
  });

  const birthEvent = events.find((e) => e.type === 'birth');
  const deathEvent = events.find((e) => e.type === 'death');
  const otherEvents = events.filter((e) => e.type !== 'birth' && e.type !== 'death');

  const factsList = [
    `Full name: ${displayName}`,
    person.maidenName ? `Maiden name: ${person.maidenName}` : null,
    `Sex: ${person.sex}`,
    birthEvent
      ? `Born: ${formatPartialDate({ year: birthEvent.dateYear, month: birthEvent.dateMonth, day: birthEvent.dateDay, circa: birthEvent.dateCirca, beforeYear: birthEvent.dateBeforeYear, afterYear: birthEvent.dateAfterYear })}${birthEvent.placeDisplayName ? ` in ${birthEvent.placeDisplayName}` : ''}`
      : null,
    deathEvent && !person.isLiving
      ? `Died: ${formatPartialDate({ year: deathEvent.dateYear, month: deathEvent.dateMonth, day: deathEvent.dateDay, circa: deathEvent.dateCirca, beforeYear: deathEvent.dateBeforeYear, afterYear: deathEvent.dateAfterYear })}${deathEvent.placeDisplayName ? ` in ${deathEvent.placeDisplayName}` : ''}`
      : null,
    ...otherEvents.map((e) => {
      const date = formatPartialDate({ year: e.dateYear, month: e.dateMonth, day: e.dateDay, circa: e.dateCirca, beforeYear: e.dateBeforeYear, afterYear: e.dateAfterYear });
      const place = e.placeDisplayName ? ` in ${e.placeDisplayName}` : '';
      return `${e.type.replace(/_/g, ' ')}: ${date}${place}${e.description ? ` — ${e.description}` : ''}`;
    }),
  ].filter(Boolean).join('\n');

  const anthropic = getAnthropic();
  if (!anthropic) {
    return `${displayName} is a member of this family tree. Add more details and enable AI features to generate a full biography.`;
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Write a concise, warm biographical paragraph for a genealogy profile. Use only the facts provided — do not invent or assume any details. Write in third person, past tense for deceased individuals and present tense for living ones. Keep it to 3–4 sentences, around 100–150 words.

Facts:
${factsList}

Write only the biography text with no preamble or explanation.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text in AI response');
  return textBlock.text.trim();
}

// ── Hint generation (FamilySearch stub) ───────────────────────────────────

async function fetchHints(personId: string, treeId: string): Promise<void> {
  const { db } = getDb();

  const [person] = await db.select().from(persons)
    .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)))
    .limit(1);

  if (!person) return;

  const events = await db.select().from(vitalEvents)
    .where(eq(vitalEvents.personId, personId));

  const birthEvent = events.find((e) => e.type === 'birth');

  // Only generate hints for deceased individuals with a known birth year
  // (living persons should not be sent to external services)
  if (person.isLiving || !birthEvent?.dateYear) return;

  const displayName = getDisplayName({
    firstName: person.firstName,
    middleName: person.middleName ?? null,
    lastName: person.lastName,
    preferredName: person.preferredName ?? null,
  });

  // --- FamilySearch API integration point ---
  // In production: call https://api.familysearch.org/platform/records/matches
  // with OAuth2 token and person facts. For now, generate AI-based hints.

  const anthropic = getAnthropic();
  if (!anthropic) return;

  // Ask Claude to suggest record types to look for based on facts
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Given this genealogy record: ${displayName}, born ${birthEvent.dateYear}${birthEvent.placeDisplayName ? ` in ${birthEvent.placeDisplayName}` : ''}.

List 2–3 specific record types that are likely to exist for this person (e.g. "1920 US Federal Census", "Ellis Island immigration record", "County Cork birth register"). For each, provide: record type, estimated repository, and confidence (high/medium/low).

Respond as JSON array: [{"title": "...", "description": "...", "provider": "...", "confidence": 0.0-1.0}]
Only respond with the JSON array, nothing else.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return;

  let hints: Array<{ title: string; description: string; provider: string; confidence: number }>;
  try {
    hints = JSON.parse(textBlock.text.trim()) as typeof hints;
  } catch {
    return;
  }

  for (const hint of hints.slice(0, 3)) {
    await db.insert(researchHints).values({
      personId,
      treeId,
      provider: hint.provider ?? 'AI Suggestion',
      externalRecordId: `ai_${personId}_${Date.now()}`,
      title: hint.title,
      description: hint.description,
      confidence: Math.min(Math.max(hint.confidence, 0), 1),
      status: 'pending',
    }).onConflictDoNothing();
  }
}

// ── Worker factory ─────────────────────────────────────────────────────────

export function startAiWorkers() {
  const bioWorker = new Worker<AiBioJob>(
    QUEUE_NAMES.aiBioGeneration,
    async (job) => {
      const { personId, treeId, userId } = job.data;
      const { db } = getDb();

      job.log(`Generating biography for person ${personId}`);

      const bio = await generateBiography(personId, treeId);

      await db.update(persons)
        .set({ biography: bio, biographyGeneratedAt: new Date() })
        .where(eq(persons.id, personId));

      await db.insert(notifications).values({
        userId,
        type: 'bio_ready',
        title: 'Biography ready',
        body: 'A biography draft has been generated and is ready for review.',
        data: { personId, treeId },
      });

      job.log('Biography generation complete');
    },
    { connection: getRedis(), concurrency: 3 },
  );

  const hintWorker = new Worker<AiHintJob>(
    QUEUE_NAMES.aiHintGeneration,
    async (job) => {
      const { personId, treeId } = job.data;
      job.log(`Fetching hints for person ${personId}`);
      await fetchHints(personId, treeId);
      job.log('Hint generation complete');
    },
    { connection: getRedis(), concurrency: 5 },
  );

  bioWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Bio generation job failed');
  });

  hintWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Hint generation job failed');
  });

  return { bioWorker, hintWorker };
}
