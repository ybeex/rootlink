import Link from 'next/link';
import {
  EmptySeedlingIllustration,
  EmptyPeopleIllustration,
  EmptyMediaIllustration,
} from '../brand/icons';

// ── EmptyState component ────────────────────────────────────────────────────
// Philosophy: Empty states are product moments. They should:
//   1. Explain what's missing with warmth, not bureaucracy
//   2. Show what's POSSIBLE (the illustration hints at the future state)
//   3. Offer a single, clear next action

interface EmptyStateProps {
  variant: 'trees' | 'people' | 'media' | 'search' | 'notifications' | 'audit' | 'dna';
  action?: { label: string; href?: string; onClick?: () => void };
}

const CONTENT: Record<EmptyStateProps['variant'], {
  illustration: React.ReactNode;
  headline: string;
  body: string;
}> = {
  trees: {
    illustration: <EmptySeedlingIllustration size={120} />,
    headline: 'Your first tree is waiting to grow',
    body: 'Every family has a story that starts somewhere. Yours starts here — with your name, and whatever you know right now. You can always add more.',
  },
  people: {
    illustration: <EmptyPeopleIllustration size={120} />,
    headline: 'No one recorded in this tree yet',
    body: 'Start with yourself, then add parents, grandparents, or children. You don\'t need complete information to begin — just a name.',
  },
  media: {
    illustration: <EmptyMediaIllustration size={120} />,
    headline: 'No photos or documents yet',
    body: 'Attach photographs, scanned certificates, or documents directly to the people they belong to — not in a separate folder somewhere.',
  },
  search: {
    illustration: (
      <svg width={80} height={80} viewBox="0 0 80 80" fill="none">
        <circle cx="33" cy="33" r="20" stroke="var(--border-strong)" strokeWidth="3" />
        <line x1="48" y1="48" x2="68" y2="68" stroke="var(--border-strong)" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="28" cy="28" r="6" fill="var(--bg-subtle)" stroke="var(--border-default)" strokeWidth="2" />
      </svg>
    ),
    headline: 'Nothing matched that search',
    body: 'Try searching by first name, last name, or a birth year. Living relatives are shown only to members — they won\'t appear in public searches.',
  },
  notifications: {
    illustration: (
      <svg width={80} height={80} viewBox="0 0 80 80" fill="none">
        <path d="M40 12 Q58 12 58 28 L58 48 L64 54 L16 54 L22 48 L22 28 Q22 12 40 12 Z"
          stroke="var(--border-strong)" strokeWidth="2.5" fill="var(--bg-subtle)" />
        <path d="M33 58 Q33 66 40 66 Q47 66 47 58" stroke="var(--border-strong)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="40" cy="11" r="3" fill="var(--bg-subtle)" stroke="var(--border-default)" strokeWidth="2" />
      </svg>
    ),
    headline: 'No notifications',
    body: 'You\'re up to date. We\'ll let you know when someone edits a shared tree, accepts an invitation, or a new research hint is ready.',
  },
  audit: {
    illustration: (
      <svg width={80} height={80} viewBox="0 0 80 80" fill="none">
        <rect x="16" y="12" width="48" height="56" rx="4" stroke="var(--border-strong)" strokeWidth="2.5" fill="var(--bg-subtle)" />
        <line x1="26" y1="28" x2="54" y2="28" stroke="var(--border-default)" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="36" x2="46" y2="36" stroke="var(--border-default)" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="44" x2="50" y2="44" stroke="var(--border-default)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    headline: 'No audit events yet',
    body: 'Admin actions, login events, and security-relevant changes will appear here as they occur.',
  },
  dna: {
    illustration: (
      <svg width={80} height={80} viewBox="0 0 80 80" fill="none">
        <path
          d="M28 8 C28 20, 52 20, 52 32 C52 44, 28 44, 28 56 C28 68, 52 68, 52 72"
          stroke="var(--border-strong)" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path
          d="M52 8 C52 20, 28 20, 28 32 C28 44, 52 44, 52 56 C52 68, 28 68, 28 72"
          stroke="var(--border-strong)" strokeWidth="3" strokeLinecap="round" fill="none" />
        <line x1="29" y1="15" x2="51" y2="15" stroke="var(--border-default)" strokeWidth="2.25" strokeLinecap="round" />
        <line x1="28" y1="32" x2="52" y2="32" stroke="var(--border-default)" strokeWidth="2.25" strokeLinecap="round" />
        <line x1="29" y1="49" x2="51" y2="49" stroke="var(--border-default)" strokeWidth="2.25" strokeLinecap="round" />
        <line x1="28" y1="65" x2="52" y2="65" stroke="var(--border-default)" strokeWidth="2.25" strokeLinecap="round" />
      </svg>
    ),
    headline: 'No DNA kits uploaded yet',
    body: 'Upload a raw data export from AncestryDNA, 23andMe, MyHeritage, or FamilyTreeDNA to find genetic matches with other RootLink members.',
  },
};

export function EmptyState({ variant, action }: EmptyStateProps) {
  const c = CONTENT[variant];

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="mb-8 opacity-80">
        {c.illustration}
      </div>
      <h3
        className="font-display text-xl font-semibold max-w-xs"
        style={{ color: 'var(--text-primary)' }}
      >
        {c.headline}
      </h3>
      <p
        className="mt-2 text-sm leading-relaxed max-w-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        {c.body}
      </p>

      {action && (
        <div className="mt-7">
          {action.href ? (
            <Link
              href={action.href}
              className="btn btn-primary px-5 py-2.5 text-sm"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="btn btn-primary px-5 py-2.5 text-sm"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
