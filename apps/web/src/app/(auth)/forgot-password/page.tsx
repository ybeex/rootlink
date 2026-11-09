'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2, CheckCircle2, ChevronLeft } from 'lucide-react';
import { RootLinkIcon } from '../../../components/brand/Logo';
import { AuthShell } from '../../../components/auth/AuthShell';
import { api } from '../../../lib/api-client';

// Need to add ForgotPasswordInput to shared exports
type ForgotPasswordFormInput = { email: string };

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordFormInput>({
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordFormInput) =>
      api.post('/v1/auth/forgot-password', data, { skipAuth: true }),
    onSuccess: () => setSent(true),
    // Always show success to prevent email enumeration
    onError: () => setSent(true),
  });

  if (sent) {
    return (
      <AuthShell image="/auth/forgot-password.webp" contentClassName="lg:min-h-[32rem]">
        <div className="w-full max-w-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(74,124,89,0.12)' }}>
            <CheckCircle2 size={28} style={{ color: '#4a7c59' }} />
          </div>
          <h1 className="mb-2 text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Check your email
          </h1>
          <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            If an account exists for that email address, we have sent a password reset link.
            The link expires in 1 hour.
          </p>
          <Link href="/login"
            className="text-sm font-medium" style={{ color: 'var(--accent-ember)' }}>
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell image="/auth/forgot-password.webp" contentClassName="lg:min-h-[32rem]">
      <div className="w-full max-w-sm">

        <div className="mb-8 flex flex-col items-center gap-2">
          <RootLinkIcon size={44} />
          <h1 className="text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Reset your password
          </h1>
          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Enter your email and we will send a reset link.
          </p>
        </div>

        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} noValidate>
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}>
              Email address
            </label>
            <input
              type="email"
              autoComplete="email"
              {...form.register('email', { required: true })}
              placeholder="you@example.com"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            />
          </div>

          <button type="submit" disabled={mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--accent-primary)' }}>
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Send Reset Link
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link href="/login"
            className="flex items-center justify-center gap-1 text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <ChevronLeft size={13} /> Back to sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
