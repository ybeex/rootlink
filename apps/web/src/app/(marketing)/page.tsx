import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { RootLinkLogo } from '../../components/brand/Logo';
import { VaultFeatureIcon, CollabFeatureIcon, AIFeatureIcon, ExportFeatureIcon } from '../../components/brand/icons';
import { LandingAuthRedirect } from '../../components/marketing/LandingAuthRedirect';

// HeroTree uses requestAnimationFrame sequencing and window.matchMedia —
// must be client-only. The placeholder height prevents layout shift
// while the animation chunk loads.
const HeroTree = dynamic(
  () => import('../../components/marketing/HeroTree').then(m => ({ default: m.HeroTree })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ height: 280 }}
        className="flex items-center justify-center"
        aria-hidden="true"
      >
        <svg width={80} height={60} viewBox="0 0 80 60" fill="none" className="animate-pulse">
          <line x1="40" y1="58" x2="40" y2="38"
            stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
          <path d="M40 46 Q26 36 16 26"
            stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M40 46 Q54 36 64 26"
            stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="40" cy="22" r="8" fill="rgba(201,123,47,0.3)" />
          <circle cx="14" cy="22" r="6" fill="rgba(255,255,255,0.2)" />
          <circle cx="66" cy="22" r="6" fill="rgba(255,255,255,0.2)" />
        </svg>
      </div>
    ),
  }
);

// ── Landing page ─────────────────────────────────────────────────────────────
//
// Design mode: GROVE (dark forest green) for hero + final CTA
//              VAULT (warm bone) for feature sections
//              The contrast between modes carries the product's dual identity:
//              depth of heritage + crispness of modern tooling.

export default function LandingPage() {
  return (
    <>
      <LandingAuthRedirect />

      {/* ── HERO — Grove mode ──────────────────────────────────────────── */}
      <section className="hero-bg min-h-screen flex flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5 relative z-10">
          <RootLinkLogo size="md" inverted />
          <div className="hidden md:flex items-center gap-8">
            {[
              ['Features', '/features'],
              ['Pricing', '/pricing'],
              ['Blog', '/blog'],
              ['About', '/about'],
            ].map(([label, href]) => (
              <Link key={href} href={href}
                className="text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: 'rgba(255,255,255,0.65)' }}>
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="hidden sm:inline text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'rgba(255,255,255,0.55)' }}>
              Log in
            </Link>
            <Link href="/register"
              className="btn btn-amber px-4 py-2 text-sm">
              Start free
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-20 relative z-10 text-center">
          {/* Y-Combinator / trust signal */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
            style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-ember)' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Private by design · Used by 3,200+ families
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-balance"
            style={{ color: '#FFFFFF', lineHeight: 1.05, letterSpacing: '-0.035em' }}>
            Your family&rsquo;s story,{' '}
            <em className="not-italic" style={{ color: 'var(--accent-ember)' }}>kept whole.</em>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.55)' }}>
            Build the tree. Attach the photographs and certificates that prove it.
            Control who sees what — down to keeping living relatives off anything shared publicly.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register" className="btn btn-amber px-6 py-3 text-base gap-2">
              Start your tree
              <ArrowRight size={16} />
            </Link>
            <Link href="/features"
              className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              See how it works <ChevronRight size={14} />
            </Link>
          </div>

          {/* The hero tree — the product IS the visual */}
          <div className="mt-16 w-full max-w-2xl mx-auto animate-slide-up delay-300">
            <HeroTree />
          </div>
        </div>

        {/* Wave transition to light section */}
        <div className="relative h-16 -mb-1">
          <svg viewBox="0 0 1440 64" preserveAspectRatio="none"
            className="absolute bottom-0 left-0 w-full h-full">
            <path d="M0,64 Q360,0 720,40 Q1080,64 1440,20 L1440,64 Z"
              fill="var(--bg-base)" />
          </svg>
        </div>
      </section>

      {/* ── STATS — Numbers as protagonists ─────────────────────────────── */}
      <section style={{ background: 'var(--bg-base)' }} className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-3 divide-x" style={{ divideColor: 'var(--border-default)' }}>
            {[
              { n: '3,200+',  label: 'families with active trees'       },
              { n: '48,000+', label: 'people recorded and growing'      },
              { n: '100%',    label: 'living relatives kept private'    },
            ].map(({ n, label }) => (
              <div key={label} className="px-8 text-center">
                <p className="font-display font-bold text-4xl sm:text-5xl tabular-nums"
                  style={{ color: 'var(--accent-primary)', letterSpacing: '-0.03em' }}>
                  {n}
                </p>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES — Vault mode, alternating sections ──────────────────── */}

      {/* Feature 1: Privacy */}
      <FeatureSection
        icon={<VaultFeatureIcon size={64} />}
        label="Privacy first"
        headline="Living relatives are never shown by accident."
        body="Mark someone as living and they vanish from any share link you send — name, dates, photo, biography. All of it. You don't have to remember to ask; RootLink asks itself before the link ever goes out."
        bullets={['Public share links auto-redact living people', 'Five roles: viewer through owner', 'Per-tree privacy levels: public, family, private']}
        reverse={false}
        accent="forest"
      />

      {/* Feature 2: Collaboration */}
      <FeatureSection
        icon={<CollabFeatureIcon size={64} />}
        label="Real collaboration"
        headline="The relative with the old photographs shouldn't need to type them up."
        body="Invite anyone with a role attached. They arrive directly in the tree. You see each other's presence in real-time. Edit history lets you untangle conflicts cleanly, without a conversation about who changed what."
        bullets={['Live presence — see who else is viewing', 'Full edit history with restore', 'Email invites with scoped roles']}
        reverse={true}
        accent="amber"
      />

      {/* Feature 3: AI Research */}
      <FeatureSection
        icon={<AIFeatureIcon size={64} />}
        label="AI that doesn't invent"
        headline="Research hints from your own data. Not the internet."
        body="When a profile looks thin — a missing birthplace, an unexplained gap between events — RootLink flags it as something worth researching, generated entirely from the shape of your own data. No fabricated suggestions from outside records."
        bullets={['Biography drafts from facts you\'ve entered', 'Research hints label confidence clearly', 'No hallucinated historical records']}
        reverse={false}
        accent="forest"
      />

      {/* Feature 4: GEDCOM */}
      <FeatureSection
        icon={<ExportFeatureIcon size={64} />}
        label="Your data leaves whenever you want"
        headline="GEDCOM export on every plan, including free."
        body="GEDCOM is the format every other genealogy tool reads. Export the entire tree — structure, dates, relationships, sources — and import it into anything. Your family's record isn't locked inside RootLink."
        bullets={['Import existing GEDCOM files', 'Export the full tree on any plan', 'Standard format, readable everywhere']}
        reverse={true}
        accent="amber"
      />

      {/* ── BLOG TEASER ──────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'var(--bg-base)' }}>
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest mb-2"
                style={{ color: 'var(--accent-ember)' }}>From the blog</p>
              <h2 className="font-display text-3xl font-semibold"
                style={{ color: 'var(--text-primary)' }}>
                How to think about family history
              </h2>
            </div>
            <Link href="/blog"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium"
              style={{ color: 'var(--accent-canopy)' }}>
              All articles <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {BLOG_POSTS.slice(0, 3).map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`}
                className="group card card-lift p-5 flex flex-col gap-3">
                <span className="text-2xs font-mono uppercase tracking-wider px-2 py-0.5 rounded-full w-fit"
                  style={{ background: 'var(--accent-ember-soft)', color: 'var(--accent-ember)' }}>
                  {post.category}
                </span>
                <h3 className="font-display font-semibold text-base leading-snug group-hover:text-[var(--accent-primary)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}>
                  {post.title}
                </h3>
                <p className="text-sm leading-relaxed flex-1"
                  style={{ color: 'var(--text-muted)' }}>
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: 'var(--accent-canopy)' }}>
                  Read <ChevronRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA — Grove mode ────────────────────────────────────────── */}
      <section className="hero-bg py-32 text-center relative">
        <div className="relative z-10 px-6 max-w-xl mx-auto">
          <RootLinkLogo size="lg" inverted className="justify-center mb-8" />
          <h2 className="font-display font-bold text-4xl sm:text-5xl"
            style={{ color: '#FFFFFF', letterSpacing: '-0.03em' }}>
            Start with your name.
          </h2>
          <p className="mt-4 text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Everything else grows from there.
          </p>
          <Link href="/register"
            className="btn btn-amber mt-8 inline-flex px-8 py-4 text-base gap-2">
            Create your tree — it&rsquo;s free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}

// ── Feature section component ───────────────────────────────────────────────

function FeatureSection({
  icon, label, headline, body, bullets, reverse, accent,
}: {
  icon: React.ReactNode;
  label: string;
  headline: string;
  body: string;
  bullets: string[];
  reverse: boolean;
  accent: 'forest' | 'amber';
}) {
  return (
    <section className="py-24" style={{ background: reverse ? 'var(--bg-subtle)' : 'var(--bg-base)' }}>
      <div className={`mx-auto max-w-5xl px-6 flex flex-col gap-12 ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center`}>
        {/* Icon side */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="relative flex items-center justify-center rounded-3xl p-12"
            style={{
              background: accent === 'forest'
                ? 'linear-gradient(135deg, var(--bg-subtle), var(--bg-muted))'
                : 'linear-gradient(135deg, var(--accent-ember-soft), #FEF7ED)',
              border: '1px solid var(--border-default)',
              boxShadow: accent === 'forest' ? 'var(--shadow-lg)' : '0 12px 40px rgba(201,123,47,0.10)',
            }}
          >
            <div className="animate-float-slow">{icon}</div>
          </div>
        </div>

        {/* Text side */}
        <div className="flex-1">
          <p className="text-xs font-mono uppercase tracking-widest mb-3"
            style={{ color: accent === 'forest' ? 'var(--accent-canopy)' : 'var(--accent-ember)' }}>
            {label}
          </p>
          <h2 className="font-display text-3xl font-semibold leading-snug"
            style={{ color: 'var(--text-primary)' }}>
            {headline}
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {body}
          </p>
          <ul className="mt-6 space-y-2.5">
            {bullets.map(b => (
              <li key={b} className="flex items-start gap-2.5 text-sm"
                style={{ color: 'var(--text-secondary)' }}>
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: accent === 'forest' ? 'var(--accent-canopy)' : 'var(--accent-ember)' }} />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Blog post data (seeded) ─────────────────────────────────────────────────

const BLOG_POSTS = [
  {
    slug: 'how-to-start',
    title: 'How to start a family tree when you don\'t know where to begin',
    excerpt: 'The most common mistake is waiting until you have complete information. You never will. Start with yourself and let the gaps guide you.',
    category: 'How-To',
  },
  {
    slug: 'privacy-problem',
    title: 'The privacy problem with genealogy software nobody talks about',
    excerpt: 'Most tools assume your living relatives agreed to be in a database. They didn\'t. Here\'s how we think about that.',
    category: 'Thinking',
  },
  {
    slug: 'ai-hints-approach',
    title: 'We rebuilt how AI hints work. Here\'s why the old approach was wrong.',
    excerpt: 'Generating research suggestions from outside records sounds helpful. It produces hallucinations. Our new approach never leaves your own data.',
    category: 'Product',
  },
  {
    slug: 'three-generations',
    title: 'Three generations in an afternoon: a practical method',
    excerpt: 'You can build a meaningful tree in a few hours with the right approach. The trick is knowing what information to skip for now.',
    category: 'How-To',
  },
];
