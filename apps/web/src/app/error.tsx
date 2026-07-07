'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RootLinkIcon } from '../components/brand/Logo';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Unhandled render error:', error); }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--bg-base)' }}>
      {/* Tilted icon — something went sideways */}
      <div style={{ transform: 'rotate(-12deg)', marginBottom: '2rem' }}>
        <RootLinkIcon size={56} />
      </div>

      <p className="font-mono text-xs uppercase tracking-widest mb-3"
        style={{ color: 'var(--accent-ember)' }}>
        Something went wrong
      </p>
      <h1 className="font-display text-3xl font-semibold mb-3"
        style={{ color: 'var(--text-primary)' }}>
        The branch snapped.
      </h1>
      <p className="text-base max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
        An unexpected error occurred. Your data is fine — this is a rendering
        problem, not a data problem. Refreshing usually clears it.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
          Error ID: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button onClick={reset} className="btn btn-amber px-5 py-2.5 text-sm">
          Try again
        </button>
        <Link href="/dashboard" className="btn btn-ghost px-5 py-2.5 text-sm"
          style={{ color: 'var(--text-muted)' }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
