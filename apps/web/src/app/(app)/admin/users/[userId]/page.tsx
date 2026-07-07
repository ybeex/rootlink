'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ShieldCheck, ShieldOff, Unlock,
  AlertTriangle, RotateCcw,
} from 'lucide-react';
import { TreeNavIcon } from '../../../../../components/brand/icons';
import { BranchLoader } from '../../../../../components/ui/BrandedLoader';
import { api, ApiClientError } from '../../../../../lib/api-client';
import { toast } from 'sonner';
import { useState } from 'react';

interface UserDetail {
  id: string; email: string;
  firstName: string; lastName: string;
  emailVerified: boolean;
  subscriptionTier: string;
  stripeCustomerId: string | null;
  totalStorageUsedBytes: number;
  twoFactorEnabled: boolean;
  isAdmin: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  treeCount: number;
  trees: { id: string; name: string; personCount: number; createdAt: string }[];
}

function formatBytes(b: number) {
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function dt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TIER_COLORS: Record<string, string> = {
  free: 'var(--text-faint)', plus: '#3b82f6', pro: 'var(--accent-ember)',
};

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const [tier, setTier] = useState('');

  const { data: user, isLoading } = useQuery<UserDetail>({
    queryKey: ['admin', 'user', userId],
    queryFn:  () => api.get(`/v1/admin/users/${userId}`),
  });

  // Sync the tier selector to the loaded user's current tier
  const currentTier = user?.subscriptionTier ?? '';
  if (tier === '' && currentTier) setTier(currentTier);

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch(`/v1/admin/users/${userId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success('Updated');
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Update failed'),
  });

  if (isLoading || !user) return (
    <div className="flex h-64 items-center justify-center">
      <BranchLoader size="md" />
    </div>
  );

  const suspended = !!user.deletedAt;
  const locked    = !!user.lockedUntil && new Date(user.lockedUntil) > new Date();

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      {/* Back */}
      <Link href="/admin/users"
        className="mb-6 flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
        style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft size={13} /> All users
      </Link>

      {/* Header */}
      <div className="card mb-6 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: 'var(--gradient-amber)' }}>
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {user.firstName} {user.lastName}
              </h1>
              {user.isAdmin && <span title="Admin"><ShieldCheck size={15} style={{ color: 'var(--accent-ember)' }} /></span>}
              {suspended && (
                <span className="rounded-full px-2 py-0.5 text-2xs font-medium"
                  style={{ background: 'rgba(212,43,43,0.1)', color: '#B02020' }}>Suspended</span>
              )}
              {locked && (
                <span className="rounded-full px-2 py-0.5 text-2xs font-medium"
                  style={{ background: 'rgba(212,43,43,0.1)', color: '#B02020' }}>Locked</span>
              )}
            </div>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            <p className="mt-1 text-xs font-mono" style={{ color: 'var(--text-faint)' }}>ID: {user.id}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Joined',     value: dt(user.createdAt)      },
            { label: 'Last login', value: dt(user.lastLoginAt)    },
            { label: 'Trees',      value: String(user.treeCount)  },
            { label: 'Storage',    value: formatBytes(user.totalStorageUsedBytes) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-3" style={{ background: 'var(--bg-subtle)' }}>
              <p className="text-2xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{label}</p>
              <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit controls */}
      <div className="card mb-6 p-6 space-y-5">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Account controls</h2>

        {/* Tier */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Subscription tier</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Stripe ID: {user.stripeCustomerId ?? 'none'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={tier}
              onChange={e => setTier(e.target.value)}
              className="h-8 rounded-lg px-2 text-sm focus:outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: TIER_COLORS[tier] ?? 'var(--text-primary)' }}
            >
              {['free', 'plus', 'pro'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              onClick={() => patch.mutate({ subscriptionTier: tier })}
              disabled={tier === user.subscriptionTier || patch.isPending}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              style={{ background: 'var(--accent-ember)' }}
            >
              Save
            </button>
          </div>
        </div>

        {/* Admin toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Admin access</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Can view this dashboard and all queues
            </p>
          </div>
          <button
            onClick={() => {
              if (!confirm(user.isAdmin ? 'Remove admin access?' : 'Grant admin access?')) return;
              patch.mutate({ isAdmin: !user.isAdmin });
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={user.isAdmin
              ? { background: 'rgba(212,43,43,0.08)', color: '#B02020' }
              : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
          >
            {user.isAdmin
              ? <><ShieldOff size={12} /> Revoke admin</>
              : <><ShieldCheck size={12} /> Grant admin</>}
          </button>
        </div>

        {/* Locked */}
        {locked && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Account locked</p>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                {user.failedLoginAttempts} failed attempts · until {dt(user.lockedUntil)}
              </p>
            </div>
            <button
              onClick={() => patch.mutate({ unlockAccount: true })}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}
            >
              <Unlock size={12} /> Unlock
            </button>
          </div>
        )}

        {/* Suspend */}
        <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: suspended ? '#B02020' : 'var(--text-secondary)' }}>
              {suspended ? 'Account suspended' : 'Suspend account'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {suspended ? `Suspended ${dt(user.deletedAt)}` : 'Prevents login, does not delete data'}
            </p>
          </div>
          {suspended ? (
            <button
              onClick={() => patch.mutate({ suspended: false })}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: 'rgba(61,117,84,0.1)', color: '#3D7554' }}
            >
              <RotateCcw size={12} /> Restore
            </button>
          ) : (
            <button
              onClick={() => { if (confirm(`Suspend ${user.email}?`)) patch.mutate({ suspended: true }); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: 'rgba(212,43,43,0.08)', color: '#B02020' }}
            >
              <AlertTriangle size={12} /> Suspend
            </button>
          )}
        </div>
      </div>

      {/* Trees */}
      {user.trees.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Owned trees ({user.treeCount})
            </h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {user.trees.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <TreeNavIcon size={14} color="var(--text-faint)" />
                      <span style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t.personCount.toLocaleString()} people
                  </td>
                  <td className="px-5 py-3 text-xs text-right" style={{ color: 'var(--text-faint)' }}>
                    {dt(t.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
