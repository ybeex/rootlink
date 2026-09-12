import Link from 'next/link';
import { ArrowLeft, Clock, ChevronRight } from 'lucide-react';
import { notFound } from 'next/navigation';

// ── Post content store ───────────────────────────────────────────────────────
// In production this would be a CMS (Contentful, Sanity) or MDX.
// For now: seeded static content that reads naturally and honestly.

const POSTS: Record<string, {
  title: string; category: string; date: string; readTime: string;
  author: { name: string; role: string };
  image: string;
  body: string;
}> = {
  'how-to-start': {
    title: 'How to start a family tree when you don\'t know where to begin',
    category: 'How-To', date: 'June 12, 2026', readTime: '6 min',
    image: '/blog/how-to-start.webp',
    author: { name: 'RootLink Team', role: '' },
    body: `
The most common reason people don't start a family tree is that they don't know enough to start. They're waiting for the information they need to arrive before they begin. It doesn't work that way.

**Start with yourself.**

Open RootLink. Add your name. Add your birth year and place, if you know them. That's it. You now have a tree with one person in it, which is infinitely more than a tree with no one in it.

## Then add one parent.

You don't need both. You don't need birth dates. You don't need to know where they were born. You need a name — even an approximate one — and the relationship.

What happens when you add a parent is the tree starts to become a tree. There are now two nodes connected by a line. That line is the beginning of a record.

## Why gaps are good

Here's the thing about gaps: they're not a sign the tree is incomplete. They're the research agenda. Every empty date field is a question. Every missing birthplace is a thread to pull.

A tree without gaps is a tree that's stopped growing. The gaps are the work.

## The practical method

1. You (name, birth year, location if known)
2. Both parents (names only is fine)
3. Four grandparents (surnames are enough to start)
4. Stop. Look at what you have.

By the time you've added seven people — yourself, two parents, four grandparents — you have a three-generation tree. That's real. That's already more than most families have in one place.

Then the next question becomes obvious: which of these people do I know the least about? Start there.

## What to skip (for now)

Don't try to fill in every field. Don't worry about sources yet. Don't try to go back five generations on your first session.

The goal of the first session is to make the tree exist. You can spend the rest of the time making it better.
    `.trim(),
  },
  'privacy-problem': {
    title: 'The privacy problem with genealogy software nobody talks about',
    category: 'Thinking', date: 'June 5, 2026', readTime: '8 min',
    image: '/blog/privacy-problem.webp',
    author: { name: 'RootLink Team', role: '' },
    body: `
When you add your grandmother to a family tree, she probably doesn't know she's there.

She didn't sign up for an account. She didn't click an "I agree" button. She didn't consent to having her maiden name, birth year, birthplace, and current photograph stored in a database.

Most genealogy software ignores this entirely. The assumption is that because the person building the tree has the right to know this information about their own family, the act of storing it in a web application is automatically fine.

It isn't, really.

## The specific problem

The issue isn't storing information about family members — that's the whole point of a family tree. The issue is what happens when that information is made accessible to people outside the family.

The public share link. The "discover relatives" matching feature. The tree that's set to public by default.

These features take information about people who never chose to be in a database and expose it to strangers. That's different from keeping a private family record.

## What responsible handling looks like

We think about this in two ways:

**Living people.** If someone is alive, their information is sensitive. Full stop. We treat any person marked as "living" as someone who explicitly hasn't consented to being in a public record. When you share a tree link, every living person on that tree is automatically hidden — name, dates, biography, photographs, everything. You don't have to remember to ask.

**The right to be removed.** If a living person who appears in someone else's tree contacts us and asks to be removed or corrected, we act on that request. Even if the tree owner disagrees. We document this in our privacy policy rather than burying it.

## Why this matters now

Genealogy databases have become one of the primary ways families are surprised to find their information somewhere unexpected. The expectation that the internet has your family's data already doesn't make it less surprising when it shows up in a context no one anticipated.

Building software that handles family history responsibly means taking the non-consenting people in that history seriously — not as an afterthought, but as a design principle.

We're not claiming to have solved this perfectly. But we think being explicit about it is better than pretending it isn't a real question.
    `.trim(),
  },
  'ai-hints-approach': {
    title: 'We rebuilt how AI hints work. Here\'s why the old approach was wrong.',
    category: 'Product', date: 'May 28, 2026', readTime: '5 min',
    image: '/blog/ai-hints-approach.webp',
    author: { name: 'RootLink Team', role: '' },
    body: `
The original approach to AI research hints in RootLink pulled from outside sources. The idea was: describe someone in the tree, find matching records from historical databases, surface the most likely matches.

It produced hallucinations.

Not dramatically wrong suggestions — the wrong kind of wrong. Plausible suggestions. A birth date that was off by two years. A location that was the same state but the wrong town. A marriage record for someone with the same name but a different person entirely.

The problem is that plausible-but-wrong suggestions in genealogy are worse than no suggestions at all. They get written down. They propagate. They become the "sources" for the next generation of the tree.

## The approach we use now

Every research hint now comes entirely from patterns in your own data. We never look outside the tree.

What this means in practice: if your great-grandmother has a birth year but no birthplace, the hint is "No birthplace recorded — this might be worth researching." Not "We found a possible match in a database." The hint comes from the shape of the data you've already entered.

This sounds less impressive. We think it's more honest.

## What we're explicit about

The AI biography feature does something different — it writes a short narrative from the facts already in the tree. That's generative, and we label it clearly: the biography is a draft from your own data, not a verified historical account.

We don't show confidence levels above what we actually have. A "probable" hint means the pattern in the data is suggestive, not confirmed. A "confirmed" fact requires a source you've attached yourself.

The distinction matters because a family tree is a record that outlasts the software. It shouldn't have fabricated certainty baked into it.
    `.trim(),
  },
  'three-generations': {
    title: 'Three generations in an afternoon: a practical method',
    category: 'How-To', date: 'May 18, 2026', readTime: '7 min',
    image: '/blog/three-generations.webp',
    author: { name: 'RootLink Team', role: '' },
    body: `
Three generations sounds modest. It's seven people: you, two parents, four grandparents. In practice, this is a meaningful family record — and you can build the structure in a few hours.

Here's the method.

## Before you open RootLink

Call or message someone who knows things. Ideally: a parent, a grandparent if they're available, an aunt or uncle who pays attention to family history. Tell them you're building a family tree and you're starting with names and approximate dates.

Write down whatever they tell you on paper. Don't try to organize it yet.

## The first session: structure only

Open RootLink. Add yourself. Don't fill in every field — just your name and birth year.

Then add your parents. Names only is fine. Then add your grandparents. Surnames are enough to start.

At the end of this session you should have seven nodes in the tree, connected by lines. That's the goal. Don't do anything else today.

## The second session: fill what you know

Go back through each person and add the details you actually know. Birth year. City. First name you weren't sure of.

Don't research anything yet. Don't look anything up. Only add facts you personally know or were told by someone who knew.

## Where the gaps are

By the end of the second session, the gaps should be obvious. Missing birthplaces. Grandparents with only a surname. A generation that's entirely blank on one side.

These gaps are your research agenda. Start with whichever gap you find most interesting, because that's the one you'll actually pursue.

## What "done" means

A three-generation tree is never fully done. But it reaches a useful state — a state where someone else could read it and understand the basic structure of your family — faster than most people expect.

That useful state is the goal of an afternoon, not a comprehensive family history. Start there.
    `.trim(),
  },
  'gedcom-explained': {
    title: 'GEDCOM explained for people who don\'t work in software',
    category: 'Research', date: 'May 8, 2026', readTime: '4 min',
    image: '/blog/gedcom-explained.webp',
    author: { name: 'RootLink Team', role: '' },
    body: `
GEDCOM stands for Genealogical Data Communication. It's a file format created in 1984 by the Church of Jesus Christ of Latter-day Saints, originally designed to standardize how genealogy software exchanged data between programs.

It became the universal standard for family tree data. Every major genealogy platform — Ancestry, MyHeritage, FamilySearch, and RootLink — can read and write GEDCOM files.

## Why it matters for you

Your family's record is only as permanent as the software that holds it. Companies change, platforms shut down, pricing models shift. If your tree is locked into one application's proprietary format, it can disappear.

GEDCOM is the reason it doesn't have to. A .ged file is a plain text file. It can be opened in any genealogy application. It can be read by a human. It will still be readable in thirty years.

## What's in a GEDCOM file

A GEDCOM file contains:
- Every person in the tree, with their facts and notes
- Relationships between people (parent-child, marriages)
- Source citations attached to facts
- Notes and biographies
- Media references (though not the media files themselves — those export separately)

## What's not in it

Photographs and document scans don't embed in the GEDCOM file itself. They're typically exported separately as a ZIP of the media files, with the GEDCOM file containing references to them.

## How to use your GEDCOM export

Download your GEDCOM file from RootLink's settings. Keep a copy in cloud storage or a hard drive. This is your backup and your escape hatch.

If you ever want to move your tree to a different application, import the GEDCOM there. If you want to share your tree with a relative who uses a different app, send them the file. If the internet disappears, your family's record is still in that .ged file on your computer.
    `.trim(),
  },
  'photographs-in-trees': {
    title: 'How to attach photographs in a way that actually survives',
    category: 'How-To', date: 'April 28, 2026', readTime: '5 min',
    image: '/blog/photographs-in-trees.webp',
    author: { name: 'RootLink Team', role: '' },
    body: `
A photograph separated from its context is a photograph waiting to be lost. A box of unlabelled family photos is one of the most common things to surface after someone dies, and one of the hardest things to do anything useful with.

The solution isn't to label the photos once and hope the labels survive. It's to attach the photographs directly to the people they show, in a structured record.

## The principle: attach, don't store

RootLink lets you attach photographs directly to a person's profile or to a specific life event. That's different from storing photographs in a folder called "grandma."

The attachment creates a relationship: this photo is of this person at this approximate time. When someone else looks at the person's profile, the photo is there. When you export the tree as a GEDCOM, the media reference travels with the person record.

## A practical system

For each photograph you have access to, ask three questions:

**Who is in it?** Attach the photo to each person shown, not just the most prominent.

**When was it taken?** An approximate decade is enough. "1950s" is better than nothing.

**What's the occasion?** If you know it — a wedding, a military service photo, a family reunion — note it in the caption.

## What to do with old physical photographs

Scan them. A flatbed scanner produces better results than a phone camera for small prints. 600 dpi is enough for archival purposes.

Don't throw the originals away. Scan them and keep them.

## The test of a good photograph record

Show someone who didn't know the family the tree. If they can identify who's who from the photographs attached to each person's profile, the record is working.

If the photographs require explanation, the attachment isn't specific enough yet.
    `.trim(),
  },
};

const RELATED: Record<string, string[]> = {
  'how-to-start':     ['three-generations', 'gedcom-explained'],
  'privacy-problem':  ['how-to-start', 'photographs-in-trees'],
  'ai-hints-approach':['privacy-problem', 'how-to-start'],
  'three-generations':['how-to-start', 'photographs-in-trees'],
  'gedcom-explained': ['how-to-start', 'three-generations'],
  'photographs-in-trees':['three-generations', 'gedcom-explained'],
};

export async function generateStaticParams() {
  return Object.keys(POSTS).map(slug => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = POSTS[params.slug];
  if (!post) return {};
  return {
    title: `${post.title} — RootLink`,
    openGraph: { images: [{ url: post.image, width: 1200, height: 630, alt: post.title }] },
    twitter: { card: 'summary_large_image', images: [post.image] },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = POSTS[params.slug];
  if (!post) notFound();

  const relatedSlugs = RELATED[params.slug] ?? [];
  const relatedPosts = relatedSlugs.map(s => ({ slug: s, ...POSTS[s] })).filter(Boolean);

  return (
    <div style={{ background: 'var(--bg-base)' }}>
      {/* Back */}
      <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="mx-auto max-w-2xl px-6 py-5">
          <Link href="/blog"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={13} /> All articles
          </Link>
        </div>
      </div>

      {/* Article */}
      <article className="mx-auto max-w-2xl px-6 py-14">
        {/* Cover image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image} alt="" className="mb-10 w-full rounded-2xl" style={{ aspectRatio: '1200 / 630', objectFit: 'cover' }} />

        {/* Header */}
        <header className="mb-12">
          <span className="text-2xs font-mono uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: 'var(--accent-ember-soft)', color: 'var(--accent-ember)' }}>
            {post.category}
          </span>
          <h1 className="mt-4 font-display text-3xl sm:text-4xl font-bold leading-snug"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {post.title}
          </h1>
          <div className="mt-4 flex items-center gap-4 text-xs" style={{ color: 'var(--text-faint)' }}>
            <span>{post.date}</span>
            <div className="flex items-center gap-1">
              <Clock size={10} /> {post.readTime} read
            </div>
          </div>
          {/* Accent rule */}
          <div className="mt-8 h-px" style={{ background: 'var(--border-default)' }} />
        </header>

        {/* Body — prose-rl handles all the typographic rhythm */}
        <div className="prose-rl">
          {post.body.split('\n\n').map((block, i) => {
            if (block.startsWith('## ')) {
              return (
                <h2 key={i} className="font-display text-2xl font-semibold mt-10 mb-4"
                  style={{ color: 'var(--text-primary)' }}>
                  {block.slice(3)}
                </h2>
              );
            }
            if (block.startsWith('**') && block.endsWith('**')) {
              return (
                <p key={i} className="font-semibold mt-6 mb-2"
                  style={{ color: 'var(--text-primary)' }}>
                  {block.slice(2, -2)}
                </p>
              );
            }
            if (block.includes('\n-')) {
              const [intro, ...items] = block.split('\n-');
              return (
                <div key={i}>
                  {intro && <p className="mb-3">{renderInline(intro)}</p>}
                  <ul className="space-y-2 mb-4 pl-4">
                    {items.map((item, j) => (
                      <li key={j} className="flex gap-2">
                        <span style={{ color: 'var(--accent-ember)' }} className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 block" />
                        <span>{renderInline(item.trim())}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            return <p key={i} className="mb-5">{renderInline(block)}</p>;
          })}
        </div>

        {/* Footer rule */}
        <div className="mt-16 pt-8 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-faint)' }}>Written by</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {post.author.name}
              </p>
            </div>
            <Link href="/register"
              className="btn btn-primary px-4 py-2 text-sm gap-1.5">
              Start your tree <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </article>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <div className="border-t py-14" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="font-display text-xl font-semibold mb-8"
              style={{ color: 'var(--text-primary)' }}>
              Continue reading
            </h2>
            <div className="space-y-6">
              {relatedPosts.map(rp => rp && (
                <Link key={rp.slug} href={`/blog/${rp.slug}`} className="group flex gap-4 items-start">
                  <div className="h-0.5 w-8 mt-3 shrink-0 rounded-full transition-all group-hover:w-14"
                    style={{ background: 'var(--accent-canopy)' }} />
                  <div>
                    <h3 className="font-display font-semibold group-hover:text-[var(--accent-primary)] transition-colors"
                      style={{ color: 'var(--text-primary)' }}>
                      {rp.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs"
                      style={{ color: 'var(--text-faint)' }}>
                      <Clock size={10} /> {rp.readTime}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline formatting — **bold** support ─────────────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      : <span key={i}>{part}</span>
  );
}
