import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'You\u2019re offline',
};

// Deliberately a plain static page with no data fetching of its own — it
// has to render correctly with zero network access, since it's exactly
// what the service worker falls back to when there is none. See the
// scope note at the top of public/sw.js.
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--bg-base, #F7F5F1)' }}>
      <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary, #152F28)' }}>
        You&rsquo;re offline
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--text-muted, #6b6b6b)' }}>
        This page hasn&rsquo;t been loaded before, so there&rsquo;s nothing saved to show without a
        connection. Trees, people, and media you&rsquo;ve already opened will still work offline.
      </p>
      <p className="mt-6 text-xs" style={{ color: 'var(--text-faint, #999)' }}>
        Reconnect and try again.
      </p>
    </div>
  );
}
