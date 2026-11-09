'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { RootLinkIcon } from '../../../components/brand/Logo';
import { AuthShell } from '../../../components/auth/AuthShell';
import { loginSchema, type LoginInput } from '@rootlink/shared';
import { api, ApiClientError, setAccessToken } from '../../../lib/api-client';
import { useAuthStore } from '../../../store/auth.store';
import { safeRedirect } from '../../../lib/safe-redirect';

export default function LoginPage() {
  const router      = useRouter();
  const { setAuth } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [needsTotp, setNeedsTotp] = useState(false);

  // Support ?redirect= param for auth-gated pages (e.g. accept-invite)
  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null;
  const redirectTo = safeRedirect(searchParams?.get('redirect'), '/dashboard');

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: LoginInput) => api.post<{
      accessToken: string; expiresIn: string;
    }>('/v1/auth/login', data, { skipAuth: true }),
    onSuccess: async (tokens) => {
      setAccessToken(tokens.accessToken);

      // Fetch profile
      const user = await api.get('/v1/users/me') as Parameters<typeof setAuth>[0];
      setAuth(user, tokens.accessToken);
      router.replace(redirectTo);
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        if (err.code === 'AUTH_005') {
          setNeedsTotp(true);
          return;
        }
        if (err.code === 'AUTH_007') {
          toast.error('Account temporarily locked. Try again in 15 minutes.');
          return;
        }
        toast.error(err.message);
      } else {
        toast.error('Could not sign in. Please try again.');
      }
    },
  });

  return (
    <AuthShell image="/auth/login.webp" contentClassName="lg:min-h-[32rem]">
      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <RootLinkIcon size={44} />
          <h1 className="text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Welcome back
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Sign in to continue to RootLink
          </p>
        </div>

        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} noValidate>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                {...form.register('email')}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                style={{
                  background: 'var(--bg-subtle)',
                  border: `1px solid ${form.formState.errors.email ? 'var(--danger)' : 'var(--border-default)'}`,
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = form.formState.errors.email ? 'var(--danger)' : 'var(--border-default)'; }}
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs transition-colors"
                  style={{ color: 'var(--accent-ember)' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...form.register('password')}
                  className="w-full rounded-xl px-3 py-2.5 pr-10 text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: `1px solid ${form.formState.errors.password ? 'var(--danger)' : 'var(--border-default)'}`,
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = form.formState.errors.password ? 'var(--danger)' : 'var(--border-default)'; }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showPass ? 'Hide password' : 'Show password'}>
                  {showPass
                    ? <EyeOff size={15} style={{ color: 'var(--text-faint)' }} />
                    : <Eye    size={15} style={{ color: 'var(--text-faint)' }} />}
                </button>
              </div>
            </div>

            {/* TOTP (shown conditionally) */}
            {needsTotp && (
              <div>
                <label className="mb-1.5 block text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}>
                  Authenticator Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  {...form.register('totpCode')}
                  placeholder="000000"
                  className="w-full rounded-xl px-3 py-2.5 text-center font-mono text-lg tracking-[0.5em] outline-none transition-colors"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                />
              </div>
            )}
          </div>

          <button type="submit" disabled={mutation.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--accent-primary)' }}>
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          No account?{' '}
          <Link href="/register" className="font-medium transition-colors"
            style={{ color: 'var(--accent-ember)' }}>
            Create one free
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
