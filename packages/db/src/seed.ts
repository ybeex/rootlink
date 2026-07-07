import { createDb } from './client.js';
import { eq } from 'drizzle-orm';
import {
  users, trees, treeMembers, persons, vitalEvents, relationships,
} from './schema.js';
import * as argon2 from 'argon2';

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) throw new Error('DATABASE_URL is required');

const { db } = createDb({ url: DATABASE_URL });

async function seed() {
  console.log('Seeding development data...');

  // ── Demo user ──────────────────────────────────────────────────────────
  const passwordHash = await argon2.hash('DevPassword123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const [user] = await db
    .insert(users)
    .values({
      email:         'dev@rootlink.app',
      passwordHash,
      firstName:     'Dev',
      lastName:      'User',
      emailVerified: true,
      subscriptionTier: 'plus',
    })
    .onConflictDoNothing()
    .returning();

  if (!user) {
    console.log('Demo user already exists — skipping seed.');
    process.exit(0);
  }

  console.log(`Created demo user: ${user.email} (password: DevPassword123!)`);

  // ── Demo tree ──────────────────────────────────────────────────────────
  const [tree] = await db
    .insert(trees)
    .values({
      name:         'Murphy Family Tree',
      description:  'An Irish-American family from County Cork',
      privacyLevel: 'family',
      ownerId:      user.id,
      personCount:  0,
    })
    .returning();

  if (!tree) throw new Error('Failed to create demo tree');
  console.log(`Created demo tree: ${tree.name}`);

  // ── Persons ────────────────────────────────────────────────────────────
  const personData = [
    {
      firstName: 'Patrick',  lastName: 'Murphy',
      sex: 'male'   as const, isLiving: false,
      birthYear: 1880, deathYear: 1952,
      birthPlace: 'Cork, County Cork, Ireland',
    },
    {
      firstName: 'Brigid',   lastName: 'Murphy', maidenName: 'O\'Brien',
      sex: 'female' as const, isLiving: false,
      birthYear: 1882, deathYear: 1965,
      birthPlace: 'Killarney, County Kerry, Ireland',
    },
    {
      firstName: 'Seamus',   lastName: 'Murphy',
      sex: 'male'   as const, isLiving: false,
      birthYear: 1905, deathYear: 1978,
      birthPlace: 'Boston, Massachusetts, USA',
    },
    {
      firstName: 'Mary',     lastName: 'Murphy', maidenName: 'Kelly',
      sex: 'female' as const, isLiving: false,
      birthYear: 1908, deathYear: 1990,
      birthPlace: 'Boston, Massachusetts, USA',
    },
    {
      firstName: 'Thomas',   lastName: 'Murphy',
      sex: 'male'   as const, isLiving: false,
      birthYear: 1932, deathYear: 2001,
      birthPlace: 'Quincy, Massachusetts, USA',
    },
    {
      firstName: 'Catherine', lastName: 'Murphy',
      sex: 'female' as const, isLiving: true,
      birthYear: 1960,
      birthPlace: 'Boston, Massachusetts, USA',
    },
  ];

  const insertedPersons: Array<{ id: string; firstName: string | null }> = [];

  for (const p of personData) {
    const [person] = await db
      .insert(persons)
      .values({
        treeId:        tree.id,
        firstName:     p.firstName,
        lastName:      p.lastName,
        maidenName:    'maidenName' in p ? p.maidenName : null,
        sex:           p.sex,
        isLiving:      p.isLiving,
        privacyLevel:  'family',
        birthYear:     p.birthYear,
        deathYear:     'deathYear' in p ? p.deathYear : null,
        dataQualityScore: 65,
        createdBy:     user.id,
        lastEditedBy:  user.id,
      })
      .returning();

    if (!person) continue;
    insertedPersons.push(person);

    // Birth event
    await db.insert(vitalEvents).values({
      personId:         person.id,
      treeId:           tree.id,
      type:             'birth',
      dateYear:         p.birthYear,
      placeDisplayName: p.birthPlace,
      placeCountry:     p.birthPlace.includes('Ireland') ? 'Ireland' : 'United States',
      placeCountryCode: p.birthPlace.includes('Ireland') ? 'IE' : 'US',
      certainty:        'confirmed',
      sourceIds:        [],
      sortOrder:        0,
    });

    // Death event for deceased
    if (!p.isLiving && 'deathYear' in p && p.deathYear) {
      await db.insert(vitalEvents).values({
        personId:     person.id,
        treeId:       tree.id,
        type:         'death',
        dateYear:     p.deathYear,
        certainty:    'confirmed',
        sourceIds:    [],
        sortOrder:    1,
      });
    }
  }

  // Update person count
  await db
    .update(trees)
    .set({ personCount: insertedPersons.length })
    .where(eq(trees.id, tree.id));

  // ── Relationships ──────────────────────────────────────────────────────
  const [patrick, brigid, seamus, mary, thomas, catherine] = insertedPersons;

  if (patrick && brigid) {
    // Patrick & Brigid married
    await db.insert(relationships).values({
      treeId:       tree.id,
      fromPersonId: patrick.id,
      toPersonId:   brigid.id,
      type:         'spouse',
      certainty:    'confirmed',
      sourceIds:    [],
    });
  }

  if (seamus && mary) {
    // Seamus & Mary married
    await db.insert(relationships).values({
      treeId:       tree.id,
      fromPersonId: seamus.id,
      toPersonId:   mary.id,
      type:         'spouse',
      certainty:    'confirmed',
      sourceIds:    [],
    });
  }

  if (patrick && seamus) {
    // Patrick is parent of Seamus
    await db.insert(relationships).values({
      treeId:       tree.id,
      fromPersonId: patrick.id,
      toPersonId:   seamus.id,
      type:         'biological_parent',
      certainty:    'confirmed',
      sourceIds:    [],
    });
  }

  if (brigid && seamus) {
    await db.insert(relationships).values({
      treeId:       tree.id,
      fromPersonId: brigid.id,
      toPersonId:   seamus.id,
      type:         'biological_parent',
      certainty:    'confirmed',
      sourceIds:    [],
    });
  }

  if (seamus && thomas) {
    await db.insert(relationships).values({
      treeId:       tree.id,
      fromPersonId: seamus.id,
      toPersonId:   thomas.id,
      type:         'biological_parent',
      certainty:    'confirmed',
      sourceIds:    [],
    });
  }

  if (mary && thomas) {
    await db.insert(relationships).values({
      treeId:       tree.id,
      fromPersonId: mary.id,
      toPersonId:   thomas.id,
      type:         'biological_parent',
      certainty:    'confirmed',
      sourceIds:    [],
    });
  }

  if (thomas && catherine) {
    await db.insert(relationships).values({
      treeId:       tree.id,
      fromPersonId: thomas.id,
      toPersonId:   catherine.id,
      type:         'biological_parent',
      certainty:    'confirmed',
      sourceIds:    [],
    });
  }

  console.log(`Created ${insertedPersons.length} persons with relationships`);
  console.log('\nSeed complete.');
  console.log('  Login: dev@rootlink.app / DevPassword123!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
