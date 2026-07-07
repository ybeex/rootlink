'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Globe, Users, Lock, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { api, ApiClientError } from '../../../../lib/api-client';
import { toast } from 'sonner';

interface AdminTree {
  id: string; name: string; description: string | null;
  privacyLevel: string;
  ownerId: string; ownerEmail: string; ownerName: string;
  personCount: number; mediaCount: number; memberCount: number;
  createdAt: string; deletedAt: string | null;
}

interface PagedResult { data: AdminTree[]; total: number; pages: number; page: number; }

const PRIVACY_ICON: Record<string, React.ReactNode> = {
  public: <Globe size={12} />,
  family: <Users size={12} />,
  private: <Lock size={12} />,
};

function dt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminTreesPage() {
  const qc = useQueryClient();
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const params = new URLSearchParams({
    page: String(page), perPage: '25',
    ...(search      ? { search } : {}),
    ...(showDeleted ? { includeDeleted: 'true' } : {}),
  });

  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['admin', 'trees', page, search, showDeleted],
    queryFn:  () => api.get(`/v1/admin/trees?${params}`),
  });

  const deleteTree = useMutation({
    mutationFn: (treeId: string) => api.delete(`/v1/admin/trees/${treeId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'trees'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success('Tree soft-deleted');
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Delete failed'),
  });

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <p className="text-2xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--accent-ember)' }}>
          Admin
        </p>
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Trees
        </h1>
        {data && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {data.total.toLocaleString()} total
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name…"
            className="h-9 rounded-lg pl-8 pr-3 text-sm focus:outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', width: 220 }}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={showDeleted} onChange={e => { setShowDeleted(e.target.checked); setPage(1); }} className="rounded" />
          Show deleted
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
              {['Tree', 'Owner', 'Privacy', 'People', 'Media', 'Members', 'Created', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-2xs font-mono uppercase tracking-wider"
                  style={{ color: 'var(--text-faint)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(8)].map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {[...Array(8)].map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 rounded-full shimmer" style={{ width: j === 0 ? 140 : 50 }} />
                  </td>
                ))}
              </tr>
            ))}

            {data?.data.map(t => {
              const deleted = !!t.deletedAt;
              return (
                <tr
                  key={t.id}
                  className="transition-colors hover:bg-[var(--bg-subtle)]"
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background:   deleted ? 'rgba(212,43,43,0.04)' : 'transparent',
                    opacity:      deleted ? 0.7 : 1,
                  }}
                >
                  {/* Tree name */}
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                    {t.description && (
                      <p className="text-2xs truncate max-w-[160px]" style={{ color: 'var(--text-faint)' }}>
                        {t.description}
                      </p>
                    )}
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3">
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.ownerName}</p>
                    <p className="text-2xs truncate max-w-[140px]" style={{ color: 'var(--text-faint)' }}>{t.ownerEmail}</p>
                  </td>

                  {/* Privacy */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs capitalize"
                      style={{ color: t.privacyLevel === 'public' ? '#3D7554' : 'var(--text-muted)' }}>
                      {PRIVACY_ICON[t.privacyLevel]}
                      {t.privacyLevel}
                    </div>
                  </td>

                  {/* Counts */}
                  <td className="px-4 py-3 tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t.personCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t.mediaCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t.memberCount}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-faint)' }}>
                    {dt(t.createdAt)}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    {!deleted && (
                      <button
                        onClick={() => {
                          if (confirm(`Soft-delete "${t.name}"? The owner can't access it but data is retained.`))
                            deleteTree.mutate(t.id);
                        }}
                        className="flex items-center gap-1 rounded px-2 py-1 text-2xs font-medium"
                        style={{ color: '#B02020', background: 'rgba(212,43,43,0.08)' }}
                        title="Soft-delete tree"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    )}
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
            Page {data.page} of {data.pages} · {data.total.toLocaleString()} trees
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
              <ChevronLeft size={13} />
            </button>
            <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
              className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
