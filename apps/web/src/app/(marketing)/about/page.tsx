import { RootLinkIcon } from '../../../components/brand/Logo';

export const metadata = {
  title: 'About',
  description: 'Why RootLink exists, and the one decision that shaped everything else.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <span
        className="inline-block rounded-full px-3 py-1 font-mono text-2xs font-medium uppercase tracking-wider"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
      >
        About
      </span>

      <h1 className="mt-5 text-balance font-display text-4xl tracking-tight sm:text-5xl">
        A family tree holds other people&rsquo;s lives, not just yours.
      </h1>

      <div className="mt-10 flex flex-col gap-6 text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <p>
          Most family-tree software is built around the person using it.
          That makes sense right up until you remember what a family tree
          actually contains: not just your own history, but the names,
          birthdates, and photographs of living relatives who never signed
          up for anything and were never asked.
        </p>

        <p>
          A cousin you added because your mother mentioned her. A sibling
          who has no idea their birthday is sitting in a database. An aunt
          whose photo you uploaded because it was the only one anyone in
          the family still had.
        </p>

        <p>
          That asymmetry — between the person building the tree and the
          people inside it — is the actual design problem RootLink starts
          from. Living people are hidden from public share links by
          default, not as a setting tucked into an account menu somewhere.
          It is the first decision the product makes, not the last one.
        </p>

        <p>
          Everything else followed from taking that seriously: real
          collaboration, so a tree reflects more than one person&rsquo;s
          memory; honest AI assistance that says plainly when it&rsquo;s
          generating a suggestion rather than finding a record; and an
          export button that works on the free plan, because a family&rsquo;s
          history shouldn&rsquo;t be held hostage by the software it was
          typed into.
        </p>

        <p style={{ color: 'var(--text-muted)' }}>
          RootLink is early. It will get a lot of small things wrong before
          it gets them right. But the part it starts from — whose data this
          actually is, and who gets a say in how it&rsquo;s shown — was decided
          before the first line of the product was built, and that part
          isn&rsquo;t up for revision later to make something else easier.
        </p>
      </div>

      <div
        className="mt-12 flex items-center gap-3 rounded-2xl p-6"
        style={{ background: 'var(--bg-subtle)' }}
      >
        <RootLinkIcon size={40} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Questions, feedback, or something that looks broken —{' '}
          <a href="/contact" className="font-medium underline" style={{ color: 'var(--text-primary)' }}>
            reach out
          </a>
          . Early means we&rsquo;re actually listening.
        </p>
      </div>
    </div>
  );
}
