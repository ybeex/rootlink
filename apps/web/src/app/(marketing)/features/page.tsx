import Link from 'next/link';
import {
  GitBranch, Users2, ImageIcon, BookOpen, FileDown, Sparkles,
  History, KeyRound, ArrowRight, ScanSearch,
} from 'lucide-react';

export const metadata = {
  title: 'Features',
  description: 'What RootLink actually does, organized by the part of building a family tree it helps with.',
};

export default function FeaturesPage() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-6 pb-12 pt-16 text-center">
        <span
          className="inline-block rounded-full px-3 py-1 font-mono text-2xs font-medium uppercase tracking-wider"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
        >
          Features
        </span>
        <h1 className="mt-5 text-balance font-display text-4xl tracking-tight sm:text-5xl">
          Built for the actual work of building a tree.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-lg" style={{ color: 'var(--text-muted)' }}>
          Not a feature list for its own sake — each of these exists because
          a specific part of researching and recording a family was tedious
          or risky without it.
        </p>
      </section>

      {/* ── Visualization ─────────────────────────────────────────────────── */}
      <FeatureBlock
        icon={GitBranch}
        eyebrow="Visualization"
        image="/features-page/visualization.webp"
        title="See the tree the way you're thinking about it"
        body="A pedigree chart for tracing ancestors backward, a descendant chart for following one person's line forward, and a fan chart for seeing several generations at once. Switch between them without losing your place — the underlying data is the same, only the shape changes."
        points={[
          'Zoom and pan on desktop or touch',
          'Each person card shows a data-quality indicator, so you can see at a glance who needs more research',
          'Click any person to open their full record without leaving the canvas',
        ]}
      />

      {/* ── Collaboration ─────────────────────────────────────────────────── */}
      <FeatureBlock
        icon={Users2}
        eyebrow="Collaboration"
        image="/features-page/collaboration.webp"
        reverse
        title="A tree more than one person can work on"
        body="Invite relatives with the role that fits them — a viewer who just wants to look, a contributor who can add what they know, an editor or admin who helps maintain it. You'll see who else has the tree open while you're working."
        points={[
          'Five roles, from read-only viewer up to owner',
          'Public share links for relatives who don\u2019t want an account — living people stay private on those links automatically',
          'Every change is attributed to whoever made it',
        ]}
      />

      {/* ── Edit history ──────────────────────────────────────────────────── */}
      <FeatureBlock
        icon={History}
        eyebrow="Edit history"
        image="/features-page/edit-history.webp"
        title="Nothing gets overwritten by accident"
        body="Every change to a person is recorded — who changed it, what it was before, and when. If a well-meaning edit turns out to be wrong, restoring the previous version takes one click, not a re-entry of everything that was lost."
        points={[
          'Full before/after on every field, not just a timestamp',
          'Restore any past version of a person',
          'Useful when two relatives remember a date differently',
        ]}
      />

      {/* ── Media ─────────────────────────────────────────────────────────── */}
      <FeatureBlock
        icon={ImageIcon}
        eyebrow="Photos & documents"
        image="/features-page/media.webp"
        reverse
        title="The paper trail, attached to the people in it"
        body="Upload a photograph, a certificate, a scanned letter — attach it directly to the person or the event it documents, instead of leaving it in a folder disconnected from the tree it's evidence for."
        points={[
          'Automatic thumbnails for fast browsing',
          'Tag the people who appear in a photo',
          'Supports image, document, audio, and video formats',
        ]}
      />

      {/* ── Sources ───────────────────────────────────────────────────────── */}
      <FeatureBlock
        icon={BookOpen}
        eyebrow="Source citations"
        image="/features-page/sources.webp"
        title="Where a fact came from matters as much as the fact"
        body="Attach a proper citation to a vital event — a census record, a parish register, a family bible — with a confidence level, so anyone looking at the tree later can tell a well-documented fact from a family rumor."
        points={[
          'Citations link directly to the events they support',
          'A confidence rating distinguishes confirmed facts from family stories',
        ]}
      />

      {/* ── AI ────────────────────────────────────────────────────────────── */}
      <FeatureBlock
        icon={Sparkles}
        eyebrow="AI assistance"
        image="/features-page/ai-assistance.webp"
        reverse
        title="A starting point, not a substitute for research"
        body="Generate a first-draft biography from the facts already in a person's record — useful for turning a list of dates into something readable. Research prompts work the same way: they're AI-generated suggestions based on patterns in your own tree, not matches against historical archives, and we'd rather say that plainly than let the word \u2018hint\u2019 imply more than it does."
        points={[
          'Biographies are generated only from facts you\u2019ve already entered',
          'Research prompts flag likely gaps — a missing death year next to a 19th-century birth year, for instance',
          'Both are starting points to verify, not finished research',
        ]}
      />

      {/* ── GEDCOM ────────────────────────────────────────────────────────── */}
      <FeatureBlock
        icon={FileDown}
        eyebrow="Import & export"
        image="/features-page/gedcom.webp"
        title="Your tree was never only ours to keep"
        body="Bring in years of existing research from another program via a standard GEDCOM file, or export your RootLink tree the same way at any time. No format lock-in either direction."
        points={[
          'Supports GEDCOM 5.5.1, the format most genealogy software reads',
          'Export is available on every plan, including free',
        ]}
      />

      {/* ── Privacy + security closing note ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div
          className="flex flex-col items-start gap-6 rounded-3xl p-10 sm:flex-row sm:items-center sm:p-14"
          style={{ background: 'var(--bg-subtle)' }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--accent-ember-soft)', color: 'var(--accent-ember)' }}
          >
            <KeyRound size={22} />
          </div>
          <div>
            <h2 className="font-display text-2xl tracking-tight">
              Account security, the unglamorous way
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Two-factor authentication, hashed passwords, and short-lived
              sessions. None of it is exciting to read about, which is exactly
              the point — it should be invisible until the one day it matters.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 text-center">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.03]"
          style={{ background: 'var(--accent-ember)' }}
        >
          Start your tree — free
          <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}

function FeatureBlock({
  icon: Icon, eyebrow, title, body, points, image, reverse = false,
}: {
  icon: React.ComponentType<{ size?: number }>;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  image: string;
  reverse?: boolean;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div className={reverse ? 'md:order-2' : 'md:order-1'}>
          <span
            className="inline-flex items-center gap-1.5 font-mono text-2xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--accent-ember)' }}
          >
            <Icon size={13} /> {eyebrow}
          </span>
          <h2 className="mt-3 text-balance font-display text-3xl tracking-tight sm:text-[2.1rem]">
            {title}
          </h2>
          <p className="mt-4 text-balance leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {body}
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <ScanSearch size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-ember)' }} />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`overflow-hidden rounded-3xl ${reverse ? 'md:order-1' : 'md:order-2'}`}
          style={{ border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" loading="lazy" decoding="async"
            className="block w-full" style={{ aspectRatio: '4 / 3', objectFit: 'cover' }} />
        </div>
      </div>
    </section>
  );
}
