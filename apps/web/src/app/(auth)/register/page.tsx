'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { RootLinkIcon } from '../../../components/brand/Logo';
import { AuthShell } from '../../../components/auth/AuthShell';
import { registerSchema, type RegisterInput } from '@rootlink/shared';
import { api, ApiClientError } from '../../../lib/api-client';

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 12,           label: 'At least 12 characters'  },
  { test: (p: string) => /[A-Z]/.test(p),           label: 'One uppercase letter'    },
  { test: (p: string) => /[0-9]/.test(p),           label: 'One number'              },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p),   label: 'One special character'   },
];

export default function RegisterPage() {
  const router = useRouter();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '' },
    mode: 'onChange',
  });

  const password = form.watch('password') ?? '';

  const mutation = useMutation({
    mutationFn: (data: RegisterInput) =>
      api.post('/v1/auth/register', data, { skipAuth: true }),
    onSuccess: () => {
      toast.success('Account created! Please check your email to verify your address.');
      router.push('/login');
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        if (err.code === 'AUTH_008') {
          form.setError('email', { message: 'An account with this email already exists.' });
          return;
        }
        toast.error(err.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    },
  });

  return (
    <AuthShell image="/auth/register.webp" contentClassName="lg:min-h-[32rem]">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <RootLinkIcon size={44} />
          <h1 className="text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Create your account
          </h1>
          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Free forever. No credit card required.
          </p>
        </div>

        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} noValidate>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" error={form.formState.errors.firstName?.message}>
                <input type="text" autoComplete="given-name"
                  {...form.register('firstName')}
                  placeholder="Ada"
                  className="field-input" />
              </FormField>
              <FormField label="Last Name" error={form.formState.errors.lastName?.message}>
                <input type="text" autoComplete="family-name"
                  {...form.register('lastName')}
                  placeholder="Lovelace"
                  className="field-input" />
              </FormField>
            </div>

            <FormField label="Email" error={form.formState.errors.email?.message}>
              <input type="email" autoComplete="email"
                {...form.register('email')}
                placeholder="you@example.com"
                className="field-input" />
            </FormField>

            <FormField label="Password" error={form.formState.errors.password?.message}>
              <input type="password" autoComplete="new-password"
                {...form.register('password')}
                placeholder="Min. 12 characters"
                className="field-input" />
              {/* Password strength indicators */}
              {password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {PASSWORD_RULES.map(({ test, label }) => {
                    const passed = test(password);
                    return (
                      <li key={label} className="flex items-center gap-1.5 text-xs"
                        style={{ color: passed ? '#4a7c59' : 'var(--text-faint)' }}>
                        <CheckCircle2 size={11}
                          style={{ opacity: passed ? 1 : 0.3 }} />
                        {label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </FormField>
          </div>

          <button type="submit" disabled={mutation.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--accent-primary)' }}>
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Create Free Account
          </button>

          <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-faint)' }}>
            By signing up you agree to our{' '}
            <Link href="/terms" className="underline">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </form>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-medium" style={{ color: 'var(--accent-ember)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function FormField({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium"
        style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <style>{`
        .field-input {
          width: 100%;
          border-radius: 0.75rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
        }
        .field-input:focus {
          border-color: var(--accent-ember);
        }
      `}</style>
      {children}
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
      )}
    </div>
  );
}
