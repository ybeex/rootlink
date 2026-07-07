'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api, ApiClientError } from '../../lib/api-client';
import { useAuthStore } from '../../store/auth.store';
import { RootLinkIcon } from '../../components/brand/Logo';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

type Status = 'idle' | 'loading' | 'success' | 'error' | 'auth-required';

export default function AcceptInvitePage({ searchParams }: Props) {
  const { token }          = use(searchParams);
  const router             = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<Status>('idle');
  const [treeId, setTreeId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('No invite token provided.'); return; }
    if (!isAuthenticated) { setStatus('auth-required'); return; }

    setStatus('loading');
    api.post<{ treeId: string }>('/v1/trees/accept-invite', { inviteToken: token })
      .then((result) => {
        setTreeId(result.treeId);
        setStatus('success');
        setTimeout(() => router.push(`/trees/${result.treeId}`), 2500);
      })
      .catch((err) => {
        setStatus('error');
        if (err instanceof ApiClientError) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg('Failed to accept invite. The link may have expired.');
        }
      });
  }, [token, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}>

        <div className="mb-4 flex justify-center">
          <RootLinkIcon size={44} />
        </div>

        {(status === 'idle' || status === 'loading') && (
          <>
            <h1 className="mb-2 text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Accepting invite…
            </h1>
            <Loader2 size={20} className="mx-auto animate-spin" style={{ color: 'var(--text-muted)' }} />
          </>
        )}

        {status === 'auth-required' && (
          <>
            <h1 className="mb-2 text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Sign in to accept
            </h1>
            <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>
              You need to be signed in to accept this tree invitation.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token ?? ''}`)}`}
                className="rounded-xl py-2.5 text-sm font-medium text-white"
                style={{ background: 'var(--accent-primary)' }}>
                Sign In
              </Link>
              <Link
                href={`/register?redirect=${encodeURIComponent(`/accept-invite?token=${token ?? ''}`)}`}
                className="rounded-xl py-2.5 text-sm transition-colors hover:bg-[var(--bg-muted)]"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                Create Account
              </Link>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4 flex justify-center">
              <CheckCircle2 size={28} style={{ color: '#4a7c59' }} />
            </div>
            <h1 className="mb-2 text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Welcome to the tree!
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              You have been added. Redirecting you now…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4 flex justify-center">
              <XCircle size={28} style={{ color: '#e33209' }} />
            </div>
            <h1 className="mb-2 text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Invite failed
            </h1>
            <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>
              {errorMsg}
            </p>
            <Link href="/dashboard" className="text-sm font-medium"
              style={{ color: 'var(--accent-ember)' }}>
              Go to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
