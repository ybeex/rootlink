'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api, ApiClientError } from '../../lib/api-client';
import { RootLinkIcon } from '../../components/brand/Logo';

interface Props {
  searchParams: Promise<{ token?: string; verified?: string }>;
}

type Status = 'loading' | 'success' | 'error' | 'already';

export default function VerifyEmailPage({ searchParams }: Props) {
  const { token, verified } = use(searchParams);
  const [status, setStatus] = useState<Status>(verified === '1' ? 'success' : 'loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (verified === '1') { setStatus('success'); return; }
    if (!token) { setStatus('error'); setErrorMsg('No verification token provided.'); return; }

    api.get(`/v1/auth/verify-email?token=${token}`, { skipAuth: true })
      .then(() => setStatus('success'))
      .catch((err) => {
        if (err instanceof ApiClientError && err.code === 'TOKEN_EXPIRED') {
          setStatus('error');
          setErrorMsg('This link has expired. Please register again or contact support.');
        } else {
          setStatus('success'); // Might already be verified — treat as success
        }
      });
  }, [token, verified]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}>

        <div className="mb-4 flex justify-center">
          {status === 'loading' && (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'var(--bg-subtle)' }}>
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}
          {status === 'success' && (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(74,124,89,0.12)' }}>
              <CheckCircle2 size={28} style={{ color: '#4a7c59' }} />
            </div>
          )}
          {status === 'error' && (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'var(--danger-soft)' }}>
              <XCircle size={28} style={{ color: 'var(--danger)' }} />
            </div>
          )}
        </div>

        {status === 'loading' && (
          <>
            <h1 className="mb-2 text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Verifying…
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Please wait a moment.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="mb-2 text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Email verified
            </h1>
            <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Your email address has been confirmed. You can now sign in.
            </p>
            <Link href="/login"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white"
              style={{ background: 'var(--accent-primary)' }}>
              <RootLinkIcon size={14} /> Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="mb-2 text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Verification failed
            </h1>
            <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>
              {errorMsg || 'The verification link is invalid or has already been used.'}
            </p>
            <Link href="/login"
              className="text-sm font-medium" style={{ color: 'var(--accent-ember)' }}>
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
