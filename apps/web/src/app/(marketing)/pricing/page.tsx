import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Pricing',
  description: 'Three plans, all of them honest about what they include.',
};

interface Tier {
  name: string;
  price: string;
  cadence: string;
  description: string;
  cta: string;
  highlighted?: boolean;
  features: string[];
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    description: 'Enough for most family trees most people actually build.',
    cta: 'Start free',
    features: [
      '3 trees',
      'Up to 500 people per tree',
      '1 GB of photos & documents',
      '10 MB per file',
      '10 AI research prompts / month',
      '2 AI biographies / month',
      'GEDCOM import & export',
    ],
  },
  {
    name: 'Plus',
    price: '$9',
    cadence: '/ month',
    description: 'For a tree that has outgrown one branch of the family.',
    cta: 'Start free, upgrade anytime',
    highlighted: true,
    features: [
      '20 trees',
      'Up to 10,000 people per tree',
      '50 GB of photos & documents',
      '50 MB per file',
      '200 AI research prompts / month',
      '50 AI biographies / month',
      'Offline access',
      'GEDCOM import & export',
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    cadence: '/ month',
    description: 'For a researcher maintaining trees for the whole extended family.',
    cta: 'Start free, upgrade anytime',
    features: [
      '100 trees',
      'Up to 100,000 people per tree',
      '500 GB of photos & documents',
      '200 MB per file',
      '2,000 AI research prompts / month',
      '500 AI biographies / month',
      'Offline access',
      'DNA match support',
      'API access',
    ],
  },
];

const FAQS = [
  {
    q: 'Do I need a credit card to start?',
    a: 'No. The free plan needs only an email address, and it is generous enough that most people never need to upgrade.',
  },
  {
    q: 'What happens to living relatives if I share a link?',
    a: 'Anyone you have marked as living is automatically hidden on public share links, regardless of plan. This is not a setting you opt into — it is the default on every tier.',
  },
  {
    q: 'Can I get my data out if I leave?',
    a: 'Yes, on every plan including free. Export to a standard GEDCOM file any time, no questions asked.',
  },
  {
    q: 'What counts toward the people-per-tree limit?',
    a: 'Every person you have added to that specific tree, living or not. Deleted people do not count against the limit.',
  },
  {
    q: 'Is the AI generating real historical records?',
    a: 'No — research prompts and biographies are generated from the facts already in your tree, not matched against external archives. We would rather be plain about that than let the word "hint" imply more.',
  },
];

export default function PricingPage() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-6 pb-12 pt-16 text-center">
        <span
          className="inline-block rounded-full px-3 py-1 font-mono text-2xs font-medium uppercase tracking-wider"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
        >
          Pricing
        </span>
        <h1 className="mt-5 text-balance font-display text-4xl tracking-tight sm:text-5xl">
          Plans sized to the tree, not the wallet.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-balance text-lg" style={{ color: 'var(--text-muted)' }}>
          Every plan includes full GEDCOM export and the same privacy
          guarantees for living relatives. Upgrading only changes how much
          room you have.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="flex flex-col rounded-3xl p-8"
              style={{
                background: tier.highlighted ? 'var(--accent-primary)' : 'var(--bg-surface)',
                border: tier.highlighted ? 'none' : '1px solid var(--border-default)',
                boxShadow: tier.highlighted ? 'var(--shadow-lg)' : 'var(--shadow-xs)',
              }}
            >
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: tier.highlighted ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
              >
                {tier.name}
              </h2>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span
                  className="font-display text-4xl font-semibold tracking-tight"
                  style={{ color: tier.highlighted ? 'white' : 'var(--text-primary)' }}
                >
                  {tier.price}
                </span>
                <span style={{ color: tier.highlighted ? 'rgba(255,255,255,0.6)' : 'var(--text-faint)' }}>
                  {tier.cadence}
                </span>
              </div>

              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: tier.highlighted ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}
              >
                {tier.description}
              </p>

              <Link
                href="/register"
                className="mt-6 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-transform hover:scale-[1.02]"
                style={
                  tier.highlighted
                    ? { background: 'var(--accent-ember)', color: 'white' }
                    : { background: 'var(--bg-subtle)', color: 'var(--text-primary)' }
                }
              >
                {tier.cta}
                <ArrowRight size={14} />
              </Link>

              <ul className="mt-8 flex flex-col gap-3">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm"
                    style={{ color: tier.highlighted ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)' }}
                  >
                    <Check
                      size={15}
                      className="mt-0.5 shrink-0"
                      style={{ color: tier.highlighted ? 'white' : 'var(--accent-ember)' }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="text-center font-display text-2xl tracking-tight">Questions worth asking</h2>
        <div className="mt-8 flex flex-col divide-y" style={{ borderColor: 'var(--border-default)' }}>
          {FAQS.map((faq) => (
            <div key={faq.q} className="py-5" style={{ borderColor: 'var(--border-default)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{faq.q}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
