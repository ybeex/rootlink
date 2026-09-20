'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2, Shield, CreditCard, Trash2, Check, Key, Copy, X, Link2, Unlink } from 'lucide-react';
import { api, ApiClientError } from '../../../lib/api-client';
import { useAuthStore } from '../../../store/auth.store';
import type { User, ApiKeySummary, CreatedApiKey } from '@rootlink/shared';
import { SUBSCRIPTION_LIMITS } from '@rootlink/shared';
import { useRouter, useSearchParams } from 'next/navigation';

const SECTIONS = [
  { id: 'profile',      label: 'Profile',      icon: null    },
  { id: 'security',     label: 'Security',     icon: Shield  },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'danger',       label: 'Danger Zone',  icon: Trash2  },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>('profile');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const fsStatus = searchParams.get('familysearch');
    if (fsStatus === 'connected') {
      toast.success('FamilySearch account connected.');
      router.replace('/settings');
    } else if (fsStatus === 'error') {
      toast.error('Could not connect your FamilySearch account. Please try again.');
      router.replace('/settings');
    }
  }, [searchParams, router]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        Settings
      </h1>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-40 shrink-0 space-y-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActive(id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{
                background: active === id ? 'var(--bg-subtle)' : 'transparent',
                color:      active === id ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: active === id ? '500' : '400',
              }}>
              {Icon && <Icon size={14} />}
              {label}
            </button>
          ))}
        </nav>

        {/* Panel */}
        <div className="flex-1">
          {active === 'profile'      && (
            <div className="space-y-6">
              <ProfileSection />
              <ConnectedAccountsSection />
            </div>
          )}
          {active === 'security'     && <SecuritySection />}
          {active === 'subscription' && (
            <div className="space-y-6">
              <SubscriptionSection />
              <ApiKeysSection />
            </div>
          )}
          {active === 'danger'       && <DangerSection />}
        </div>
      </div>
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────────────────────
function ProfileSection() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/v1/users/me'),
  });

  const form = useForm({
    values: {
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName  ?? '',
      timezone:  user?.timezone  ?? 'UTC',
      locale:    user?.locale    ?? 'en',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; timezone: string; locale: string }) =>
      api.patch<User>('/v1/users/me', data),
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(['me'], updated);
      toast.success('Profile updated.');
    },
    onError: () => toast.error('Failed to update profile.'),
  });

  if (!user) return <SectionSkeleton />;

  return (
    <SettingsCard title="Profile" description="Your public name and locale preferences.">
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <SettingsField label="First Name">
            <SettingsInput {...form.register('firstName')} />
          </SettingsField>
          <SettingsField label="Last Name">
            <SettingsInput {...form.register('lastName')} />
          </SettingsField>
        </div>
        <SettingsField label="Email">
          <SettingsInput value={user.email} disabled />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
            Email changes require re-verification.
          </p>
        </SettingsField>
        <div className="grid grid-cols-2 gap-4">
          <SettingsField label="Timezone">
            <SettingsInput {...form.register('timezone')} placeholder="UTC" />
          </SettingsField>
          <SettingsField label="Language">
            <SettingsSelect {...form.register('locale')}>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="ga">Gaeilge</option>
            </SettingsSelect>
          </SettingsField>
        </div>
        <div className="flex justify-end pt-2">
          <SubmitButton loading={mutation.isPending}>Save Changes</SubmitButton>
        </div>
      </form>
    </SettingsCard>
  );
}

// ── Security ───────────────────────────────────────────────────────────────
function SecuritySection() {
  const [totpSetup, setTotpSetup] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [totpCode, setTotpCode]   = useState('');
  const { data: user }            = useQuery({ queryKey: ['me'], queryFn: () => api.get<User>('/v1/users/me') });

  const setupMutation = useMutation({
    mutationFn: () => api.post<{ secret: string; qrCodeDataUrl: string }>('/v1/auth/totp/setup', {}),
    onSuccess: setTotpSetup,
    onError:   () => toast.error('Failed to set up 2FA.'),
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post('/v1/auth/totp/confirm', { totpCode }),
    onSuccess: () => {
      toast.success('Two-factor authentication enabled.');
      setTotpSetup(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : '2FA confirmation failed.');
    },
  });

  return (
    <SettingsCard title="Security" description="Manage your password and two-factor authentication.">
      <div className="space-y-6">
        {/* 2FA */}
        <div className="flex items-start justify-between gap-4 rounded-xl p-4"
          style={{ background: 'var(--bg-subtle)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Two-Factor Authentication
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {user?.twoFactorEnabled
                ? 'Enabled — your account has extra protection.'
                : 'Add a second layer of security to your account.'}
            </p>
          </div>
          {user?.twoFactorEnabled ? (
            <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: 'rgba(74,124,89,0.12)', color: '#4a7c59' }}>
              <Check size={11} /> Enabled
            </span>
          ) : (
            <button onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: 'var(--accent-primary)', color: 'white' }}>
              {setupMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Enable'}
            </button>
          )}
        </div>

        {/* TOTP setup flow */}
        {totpSetup && (
          <div className="rounded-xl p-4 space-y-3"
            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Scan this QR code with your authenticator app
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={totpSetup.qrCodeDataUrl} alt="TOTP QR code"
              className="mx-auto h-36 w-36 rounded-lg" />
            <p className="text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {totpSetup.secret}
            </p>
            <div className="flex gap-2">
              <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)}
                maxLength={6} inputMode="numeric" placeholder="000000"
                className="flex-1 rounded-xl px-3 py-2 text-center font-mono tracking-widest text-sm outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
              <button onClick={() => confirmMutation.mutate()}
                disabled={totpCode.length !== 6 || confirmMutation.isPending}
                className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--accent-primary)' }}>
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}

// ── Subscription ───────────────────────────────────────────────────────────
function SubscriptionSection() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => api.get<User>('/v1/users/me') });

  const checkoutMutation = useMutation({
    mutationFn: (tier: 'plus' | 'pro') => api.post<{ url: string }>('/v1/billing/checkout', { tier }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not start checkout. Please try again.');
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.post<{ url: string }>('/v1/billing/portal', {}),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not open the billing portal.');
    },
  });

  if (!user) return <SectionSkeleton />;

  const tier    = user.subscriptionTier;
  const limits  = SUBSCRIPTION_LIMITS[tier];
  const gbUsed  = (user.totalStorageUsedBytes / (1024 ** 3)).toFixed(2);
  const gbTotal = (limits.totalStorageBytes   / (1024 ** 3)).toFixed(0);
  const pct     = Math.min((user.totalStorageUsedBytes / limits.totalStorageBytes) * 100, 100);

  const TIERS = [
    { id: 'free', name: 'Free',          price: '$0',       features: ['3 trees', '500 people', '500 media', '1 GB storage'] },
    { id: 'plus', name: 'Plus',          price: '$9.99/mo', features: ['20 trees', '10k people', '10k media', '50 GB storage', 'AI features', 'Offline access'] },
    { id: 'pro',  name: 'Pro',           price: '$19.99/mo',features: ['100 trees', '100k people', 'DNA tools', '500 GB storage', 'API access'] },
  ] as const;

  return (
    <SettingsCard title="Subscription" description="Manage your plan and storage usage.">
      {tier !== 'free' && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            className="text-xs font-medium underline"
            style={{ color: 'var(--text-muted)' }}
          >
            {portalMutation.isPending ? 'Opening…' : 'Manage payment method & invoices'}
          </button>
        </div>
      )}

      {/* Storage bar */}
      <div className="mb-6 rounded-xl p-4" style={{ background: 'var(--bg-subtle)' }}>
        <div className="mb-2 flex items-center justify-between text-xs"
          style={{ color: 'var(--text-muted)' }}>
          <span>Storage used</span>
          <span>{gbUsed} GB / {gbTotal} GB</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-muted)' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct > 80 ? 'var(--danger)' : 'var(--accent-primary)' }} />
        </div>
      </div>

      {/* Plan cards */}
      <div className="space-y-3">
        {TIERS.map((t) => (
          <div key={t.id}
            className="flex items-start justify-between gap-4 rounded-xl p-4"
            style={{
              background: t.id === tier ? 'rgba(30,46,84,0.05)' : 'var(--bg-surface)',
              border: `1px solid ${t.id === tier ? 'var(--accent-primary)' : 'var(--border-default)'}`,
            }}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t.name}
                </span>
                {t.id === tier && (
                  <span className="rounded-full px-2 py-0.5 text-2xs font-medium"
                    style={{ background: 'var(--accent-primary)', color: 'white' }}>
                    Current
                  </span>
                )}
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs"
                    style={{ color: 'var(--text-muted)' }}>
                    <Check size={10} /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.price}</p>
              {t.id !== tier && t.id !== 'free' && (
                <button
                  onClick={() => { if (t.id !== 'free') checkoutMutation.mutate(t.id); }}
                  disabled={checkoutMutation.isPending}
                  className="mt-1.5 rounded-lg px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                  style={{ background: 'var(--accent-ember)' }}>
                  {checkoutMutation.isPending && checkoutMutation.variables === t.id ? 'Redirecting…' : 'Upgrade'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

// ── Connected Accounts (FamilySearch) ─────────────────────────────────────
function ConnectedAccountsSection() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['familysearchStatus'],
    queryFn: () => api.get<{ connected: boolean }>('/v1/integrations/familysearch/status'),
  });

  const connectMutation = useMutation({
    mutationFn: () => api.get<{ url: string }>('/v1/integrations/familysearch/connect-url'),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not start the FamilySearch connection.');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete('/v1/integrations/familysearch'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['familysearchStatus'] });
      toast.success('FamilySearch account disconnected.');
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not disconnect.');
    },
  });

  return (
    <SettingsCard title="Connected Accounts" description="Connect FamilySearch to search for possible matches for people in your trees.">
      <div className="flex items-center justify-between gap-3 rounded-xl p-3.5"
        style={{ border: '1px solid var(--border-default)' }}>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>FamilySearch</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {isLoading ? 'Checking…' : data?.connected ? 'Connected' : 'Not connected'}
          </p>
        </div>
        {data?.connected ? (
          <button
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <Unlink size={12} /> Disconnect
          </button>
        ) : (
          <button
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending || isLoading}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--accent-primary)' }}>
            {connectMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
            Connect
          </button>
        )}
      </div>
    </SettingsCard>
  );
}

// ── API Keys (Pro tier "API Access") ──────────────────────────────────────
function ApiKeysSection() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => api.get<User>('/v1/users/me') });
  const [newLabel, setNewLabel] = useState('');
  // Held only in local state, only until the user dismisses the panel — this
  // is the one and only time the plaintext key is ever available to show.
  const [revealedKey, setRevealedKey] = useState<CreatedApiKey | null>(null);

  const { data: keys } = useQuery({
    queryKey: ['apiKeys'],
    queryFn:  () => api.get<ApiKeySummary[]>('/v1/api-keys'),
    enabled:  user?.subscriptionTier === 'pro',
  });

  const createMutation = useMutation({
    mutationFn: (label: string) => api.post<CreatedApiKey>('/v1/api-keys', { label }),
    onSuccess: (key) => {
      setRevealedKey(key);
      setNewLabel('');
      void queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not create API key.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => api.delete(`/v1/api-keys/${keyId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('Key revoked.');
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Could not revoke key.');
    },
  });

  if (!user) return null;

  if (user.subscriptionTier !== 'pro') {
    return (
      <SettingsCard title="API Access" description="Read-only API access for building your own tools against your trees.">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          API access is available on the Pro plan.
        </p>
      </SettingsCard>
    );
  }

  const activeKeys = (keys ?? []).filter((k) => !k.revokedAt);

  return (
    <SettingsCard title="API Access" description="Generate keys for read-only access to your trees.">
      <a href="/docs/api" target="_blank" rel="noopener noreferrer"
        className="mb-5 -mt-3 inline-block text-xs font-medium underline"
        style={{ color: 'var(--accent-primary)' }}>
        View API reference →
      </a>
      {revealedKey && (
        <div className="mb-5 rounded-xl p-4" style={{ background: 'var(--accent-ember-soft)' }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: 'var(--accent-ember)' }}>
              Copy this key now — it won't be shown again
            </p>
            <button onClick={() => setRevealedKey(null)} aria-label="Dismiss">
              <X size={14} style={{ color: 'var(--accent-ember)' }} />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-surface)' }}>
            <code className="flex-1 overflow-x-auto whitespace-nowrap text-xs" style={{ color: 'var(--text-primary)' }}>
              {revealedKey.plaintextKey}
            </code>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(revealedKey.plaintextKey);
                toast.success('Copied to clipboard.');
              }}
              className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-[var(--bg-subtle)]"
              aria-label="Copy key"
            >
              <Copy size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      )}

      <div className="mb-5 flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder='Key label — e.g. "My export script"'
          className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        />
        <button
          onClick={() => newLabel.trim() && createMutation.mutate(newLabel.trim())}
          disabled={createMutation.isPending || !newLabel.trim()}
          className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'var(--accent-primary)' }}
        >
          {createMutation.isPending ? 'Generating…' : 'Generate key'}
        </button>
      </div>

      {activeKeys.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          No active API keys yet.
        </p>
      ) : (
        <div className="space-y-2">
          {activeKeys.map((k) => (
            <div key={k.id}
              className="flex items-center justify-between gap-3 rounded-xl p-3"
              style={{ border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Key size={14} className="shrink-0" style={{ color: 'var(--text-faint)' }} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{k.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    <code>{k.keyPrefix}…</code>
                    {k.lastUsedAt
                      ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                      : ' · Never used'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => revokeMutation.mutate(k.id)}
                disabled={revokeMutation.isPending}
                className="shrink-0 text-xs font-medium underline"
                style={{ color: 'var(--danger)' }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </SettingsCard>
  );
}

// ── Danger Zone ────────────────────────────────────────────────────────────
function DangerSection() {
  const router   = useRouter();
  const { clearAuth } = useAuthStore();
  const [confirm, setConfirm] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/v1/users/me'),
    onSuccess: () => {
      clearAuth();
      toast.success('Account deleted. We\'re sorry to see you go.');
      router.replace('/register');
    },
    onError: () => toast.error('Failed to delete account. Please contact support.'),
  });

  return (
    <SettingsCard title="Danger Zone" description="Irreversible actions. Please read carefully.">
      <div className="rounded-xl p-4" style={{ border: '1px solid var(--danger)', background: 'rgba(227,50,9,0.03)' }}>
        <h3 className="text-sm font-medium" style={{ color: 'var(--danger)' }}>Delete Account</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Permanently deletes your account and all associated data. This cannot be undone.
          Your trees will be archived for 30 days before permanent deletion.
        </p>
        <div className="mt-3 space-y-2">
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Type <strong>delete my account</strong> to confirm
          </label>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="delete my account"
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={confirm !== 'delete my account' || deleteMutation.isPending}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ background: 'var(--danger)' }}>
            {deleteMutation.isPending && <Loader2 size={13} className="animate-spin" />}
            <Trash2 size={13} />
            Delete My Account
          </button>
        </div>
      </div>
    </SettingsCard>
  );
}

// ── Primitives ─────────────────────────────────────────────────────────────
import React from 'react';

function SettingsCard({ title, description, children }: {
  title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-6"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <h2 className="mb-0.5 text-base font-semibold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        {title}
      </h2>
      <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
      {children}
    </div>
  );
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const SettingsInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => (
    <input ref={ref} {...props}
      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors disabled:opacity-50"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; props.onFocus?.(e); }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; props.onBlur?.(e); }} />
  ),
);
SettingsInput.displayName = 'SettingsInput';

const SettingsSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  (props, ref) => (
    <select ref={ref} {...props}
      className="w-full appearance-none rounded-xl px-3 py-2.5 text-sm outline-none"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
  ),
);
SettingsSelect.displayName = 'SettingsSelect';

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={loading}
      className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      style={{ background: 'var(--accent-primary)' }}>
      {loading && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl p-6"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="shimmer h-5 w-32 rounded" />
      <div className="shimmer h-4 w-full rounded" />
      <div className="shimmer h-10 w-full rounded-xl" />
      <div className="shimmer h-10 w-full rounded-xl" />
    </div>
  );
}
