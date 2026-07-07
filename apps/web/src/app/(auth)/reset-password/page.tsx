'use client';

import { use, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { RootLinkIcon } from '../../../components/brand/Logo';
import { toast } from 'sonner';
import { api, ApiClientError } from '../../../lib/api-client';
import { resetPasswordSchema } from '@rootlink/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

type ResetForm = z.infer<typeof resetPasswordSchema>;

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default function ResetPasswordPage({ searchParams }: Props) {
  const { token }    = use(searchParams);
  const router       = useRouter();
  const [done, setDone]       = useState(false);
  const [showPass, setShowPass] = useState(false);

  const form = useForm<ResetForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token ?? '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: ResetForm) =>
      api.post('/v1/auth/reset-password', data, { skipAuth: true }),
    onSuccess: () => {
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        if (err.code === 'TOKEN_EXPIRED') {
          toast.error('This reset link has expired. Please request a new one.');
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    },
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4"
        style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <p className="mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Invalid reset link.
          </p>
          <Link href="/forgot-password" className="text-sm font-medium"
            style={{ color: 'var(--accent-ember)' }}>
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4"
        style={{ background: 'var(--bg-base)' }}>
        <div className="w-full max-w-sm rounded-2xl p-8 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(74,124,89,0.12)' }}>
            <CheckCircle2 size={28} style={{ color: '#4a7c59' }} />
          </div>
          <h1 className="mb-2 text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Password reset
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Your password has been updated. Redirecting to sign in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}>

        <div className="mb-8 flex flex-col items-center gap-2">
          <RootLinkIcon size={44} />
          <h1 className="text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Set new password
          </h1>
          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Choose a strong password for your account.
          </p>
        </div>

        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} noValidate>
          {/* Hidden token field */}
          <input type="hidden" {...form.register('token')} />

          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                {...form.register('password')}
                placeholder="Min. 12 characters"
                className="w-full rounded-xl px-3 py-2.5 pr-10 text-sm outline-none transition-colors"
                style={{
                  background: 'var(--bg-subtle)',
                  border: `1px solid ${form.formState.errors.password ? '#e33209' : 'var(--border-default)'}`,
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = form.formState.errors.password ? '#e33209' : 'var(--border-default)'; }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label={showPass ? 'Hide password' : 'Show password'}>
                {showPass
                  ? <EyeOff size={15} style={{ color: 'var(--text-faint)' }} />
                  : <Eye    size={15} style={{ color: 'var(--text-faint)' }} />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="mt-1 text-xs" style={{ color: '#e33209' }}>
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <button type="submit" disabled={mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--accent-primary)' }}>
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
