'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, ApiClientError } from '../../../../lib/api-client';
import { AdminNavIcon, PrivacyNavIcon } from '../../../../components/brand/icons';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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
}

interface PagedResult { data: AdminUser[]; total: number; pages: number; page: number; }

const TIER_STYLE: Record<string, { bg: string; color: string }> = {
  free:  { bg: 'var(--bg-subtle)',      color: 'var(--text-muted)'     },
  plus:  { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6'               },
  pro:   { bg: 'var(--accent-ember-soft)', color: 'var(--accent-ember)' },
};

function formatBytes(b: number) {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function rel(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [tier, setTier]         = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTier, setNewTier]   = useState<string>('');

  const params = new URLSearchParams({
    page: String(page), perPage: '25',
    ...(search      ? { search } : {}),
    ...(tier        ? { tier   } : {}),
    ...(showDeleted ? { includeDeleted: 'true' } : {}),
  });

  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['admin', 'users', page, search, tier, showDeleted],
    queryFn:  () => api.get(`/v1/admin/users?${params}`),
  });

  const patchUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/v1/admin/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setEditingId(null);
      toast.success('Updated');
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Update failed'),
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <p className="text-2xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--accent-ember)' }}>
          Admin
        </p>
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Users
        </h1>
        {data && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {data.total.toLocaleString()} total
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search name or email…"
            className="h-9 rounded-lg pl-8 pr-3 text-sm focus:outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', width: 220 }}
          />
        </div>

        <select
          value={tier} onChange={e => { setTier(e.target.value); setPage(1); }}
          className="h-9 rounded-lg px-3 text-sm focus:outline-none"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        >
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="plus">Plus</option>
          <option value="pro">Pro</option>
        </select>

        <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox" checked={showDeleted}
            onChange={e => { setShowDeleted(e.target.checked); setPage(1); }}
            className="rounded"
          />
          Show suspended
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
              {['User', 'Tier', 'Storage', 'Trees', 'Last login', 'Flags', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-2xs font-mono uppercase tracking-wider"
                  style={{ color: 'var(--text-faint)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(8)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {[...Array(7)].map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 rounded-full shimmer" style={{ width: j === 0 ? 160 : 60 }} />
                  </td>
                ))}
              </tr>
            ))}

            {data?.data.map(u => {
              const suspended = !!u.deletedAt;
              const locked = !!u.lockedUntil && new Date(u.lockedUntil) > new Date();
              const isEditing = editingId === u.id;
              const ts = TIER_STYLE[u.subscriptionTier] ?? TIER_STYLE.free;

              return (
                <tr
                  key={u.id}
                  className="transition-colors hover:bg-[var(--bg-subtle)]"
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background:   suspended ? 'rgba(212,43,43,0.04)' : 'transparent',
                    opacity:      suspended ? 0.7 : 1,
                  }}
                >
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-2xs font-bold text-white"
                        style={{ background: 'var(--gradient-amber)' }}>
                        {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                      </div>
                      <div>
                        <Link href={`/admin/users/${u.id}`}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--text-primary)' }}>
                          {u.firstName} {u.lastName}
                        </Link>
                        <p className="text-2xs truncate max-w-[160px]" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Tier */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={newTier}
                          onChange={e => setNewTier(e.target.value)}
                          className="h-7 rounded px-2 text-xs"
                          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                          autoFocus
                        >
                          {['free', 'plus', 'pro'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button onClick={() => patchUser.mutate({ id: u.id, body: { subscriptionTier: newTier } })}
                          className="h-7 rounded px-2 text-2xs font-medium text-white"
                          style={{ background: 'var(--accent-ember)' }}>✓</button>
                        <button onClick={() => setEditingId(null)}
                          className="h-7 rounded px-2 text-2xs"
                          style={{ color: 'var(--text-muted)' }}>✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(u.id); setNewTier(u.subscriptionTier); }}
                        className="rounded-full px-2.5 py-0.5 text-2xs font-medium capitalize"
                        style={{ background: ts.bg, color: ts.color }}
                        title="Click to change tier"
                      >
                        {u.subscriptionTier}
                      </button>
                    )}
                  </td>

                  {/* Storage */}
                  <td className="px-4 py-3 tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatBytes(u.totalStorageUsedBytes)}
                  </td>

                  {/* Trees */}
                  <td className="px-4 py-3 tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>
                    {u.treeCount}
                  </td>

                  {/* Last login */}
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {rel(u.lastLoginAt)}
                  </td>

                  {/* Flags */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {u.isAdmin && (
                        <span title="Admin"><AdminNavIcon size={14} color="var(--accent-ember)" /></span>
                      )}
                      {u.twoFactorEnabled && (
                        <span title="2FA enabled"><PrivacyNavIcon size={13} color="#3D7554" /></span>
                      )}
                      {locked && (
                        <span className="rounded-full px-1.5 py-0.5 text-2xs font-medium"
                          style={{ background: 'rgba(212,43,43,0.1)', color: 'var(--accent-ember)' }}>
                          locked
                        </span>
                      )}
                      {suspended && (
                        <span className="rounded-full px-1.5 py-0.5 text-2xs font-medium"
                          style={{ background: 'rgba(212,43,43,0.1)', color: 'var(--danger)' }}>
                          suspended
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/users/${u.id}`}
                        className="rounded px-2 py-1 text-2xs font-medium transition-colors"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}>
                        View
                      </Link>
                      {locked && (
                        <button
                          onClick={() => patchUser.mutate({ id: u.id, body: { unlockAccount: true } })}
                          className="rounded px-2 py-1 text-2xs font-medium"
                          style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.08)' }}>
                          Unlock
                        </button>
                      )}
                      {suspended ? (
                        <button
                          onClick={() => patchUser.mutate({ id: u.id, body: { suspended: false } })}
                          className="rounded px-2 py-1 text-2xs font-medium"
                          style={{ color: '#3D7554', background: 'rgba(61,117,84,0.1)' }}>
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => { if (confirm(`Suspend ${u.email}?`)) patchUser.mutate({ id: u.id, body: { suspended: true } }); }}
                          className="rounded px-2 py-1 text-2xs font-medium"
                          style={{ color: 'var(--danger)', background: 'rgba(212,43,43,0.08)' }}>
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {data.page} of {data.pages} · {data.total.toLocaleString()} users
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.pages, p + 1))}
              disabled={page === data.pages}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
