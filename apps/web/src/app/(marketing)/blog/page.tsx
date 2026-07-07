import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';

export const metadata = {
  title: 'Blog — RootLink',
  description: 'How to think about family history, research, and the tools that help.',
};

const POSTS = [
  {
    slug: 'how-to-start',
    title: 'How to start a family tree when you don\'t know where to begin',
    excerpt: 'The most common mistake is waiting until you have complete information. You never will. Here\'s how to start with a name and let the gaps guide the research.',
    category: 'How-To',
    readTime: '6 min',
    featured: true,
    accentColor: 'var(--accent-canopy)',
    date: 'June 12, 2026',
  },
  {
    slug: 'privacy-problem',
    title: 'The privacy problem with genealogy software nobody talks about',
    excerpt: 'Most genealogy tools assume your living relatives consented to being in a database. They didn\'t. Here\'s why that matters and what responsible handling actually looks like.',
    category: 'Thinking',
    readTime: '8 min',
    date: 'June 5, 2026',
  },
  {
    slug: 'ai-hints-approach',
    title: 'We rebuilt how AI hints work. Here\'s why the old approach was wrong.',
    excerpt: 'Generating research suggestions from outside records sounds useful. It produced hallucinations. Our new approach never leaves your own data — and that makes it more honest.',
    category: 'Product',
    readTime: '5 min',
    date: 'May 28, 2026',
  },
  {
    slug: 'three-generations',
    title: 'Three generations in an afternoon: a practical method',
    excerpt: 'You can build a meaningful tree in a few hours with the right approach. The trick is knowing which information to skip for now — and why filling gaps later is better than waiting.',
    category: 'How-To',
    readTime: '7 min',
    date: 'May 18, 2026',
  },
  {
    slug: 'gedcom-explained',
    title: 'GEDCOM explained for people who don\'t work in software',
    excerpt: 'Your family\'s record deserves to outlast any single app. GEDCOM is the reason it can. Here\'s what it is, what it includes, and how to use it to protect your work.',
    category: 'Research',
    readTime: '4 min',
    date: 'May 8, 2026',
  },
  {
    slug: 'photographs-in-trees',
    title: 'How to attach photographs in a way that actually survives',
    excerpt: 'A photo stored separately from the person it shows is a photo waiting to be lost. Here\'s a discipline for attaching, labelling, and preserving photographs inside a family tree.',
    category: 'How-To',
    readTime: '5 min',
    date: 'April 28, 2026',
  },
];

const CATEGORIES = ['All', 'How-To', 'Thinking', 'Product', 'Research'];

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  'How-To':   { bg: 'rgba(45,100,85,0.1)',  text: 'var(--accent-canopy)' },
  'Thinking': { bg: 'var(--bg-muted)',       text: 'var(--text-muted)'   },
  'Product':  { bg: 'var(--accent-ember-soft)', text: 'var(--accent-ember)' },
  'Research': { bg: 'rgba(74,124,89,0.1)',   text: '#4a7c59'             },
};

export default function BlogPage() {
  const featured = POSTS.find(p => p.featured)!;
  const rest     = POSTS.filter(p => !p.featured);

  return (
    <div style={{ background: 'var(--bg-base)' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="mx-auto max-w-5xl px-6 py-12">
          <p className="text-xs font-mono uppercase tracking-widest mb-3"
            style={{ color: 'var(--accent-ember)' }}>
            From the team
          </p>
          <h1 className="font-display text-4xl font-semibold"
            style={{ color: 'var(--text-primary)' }}>
            How to think about family history
          </h1>
          <p className="mt-3 max-w-lg text-base" style={{ color: 'var(--text-muted)' }}>
            Research methods, product thinking, and the practical art of keeping
            a family&rsquo;s record in one place.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* ── Featured post — large editorial hero ────────────────────── */}
        <Link href={`/blog/${featured.slug}`} className="group block mb-14">
          {/* Coloured accent bar */}
          <div className="h-1 w-16 rounded-full mb-6 transition-all duration-300 group-hover:w-32"
            style={{ background: 'var(--accent-canopy)' }} />

          <div className="flex flex-col lg:flex-row lg:items-end lg:gap-16">
            <div className="flex-1">
              <CategoryPill category={featured.category} />
              <h2 className="mt-3 font-display text-3xl font-semibold leading-snug group-hover:text-[var(--accent-primary)] transition-colors"
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {featured.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {featured.excerpt}
              </p>
            </div>
            <div className="mt-6 lg:mt-0 lg:w-48 shrink-0 flex lg:flex-col items-center lg:items-start gap-4 lg:gap-2">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
                <Clock size={11} /> {featured.readTime} read
              </div>
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                {featured.date}
              </span>
              <div className="mt-auto flex items-center gap-1 text-sm font-medium"
                style={{ color: 'var(--accent-canopy)' }}>
                Read article <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </Link>

        {/* ── Category filter ─────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap mb-10 pb-10 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={cat === 'All'
                ? { background: 'var(--accent-primary)', color: '#fff' }
                : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Post grid ──────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="group flex flex-col gap-3">
              {/* Accent line */}
              <div className="h-0.5 rounded-full w-8 transition-all duration-300 group-hover:w-16"
                style={{ background: CATEGORY_STYLE[post.category]?.text ?? 'var(--border-strong)' }} />

              <CategoryPill category={post.category} />

              <h3 className="font-display font-semibold text-lg leading-snug group-hover:text-[var(--accent-primary)] transition-colors"
                style={{ color: 'var(--text-primary)' }}>
                {post.title}
              </h3>
              <p className="text-sm leading-relaxed flex-1"
                style={{ color: 'var(--text-muted)' }}>
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-2xs" style={{ color: 'var(--text-faint)' }}>{post.date}</span>
                <div className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: CATEGORY_STYLE[post.category]?.text ?? 'var(--accent-canopy)' }}>
                  <Clock size={10} /> {post.readTime}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryPill({ category }: { category: string }) {
  const s = CATEGORY_STYLE[category] ?? { bg: 'var(--bg-subtle)', text: 'var(--text-muted)' };
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-2xs font-medium font-mono uppercase tracking-wider"
      style={{ background: s.bg, color: s.text }}>
      {category}
    </span>
  );
}
