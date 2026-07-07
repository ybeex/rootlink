'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { api } from '../../../../lib/api-client';
import { EmptyState } from '../../../../components/ui/EmptyState';

interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface PagedResult { data: AuditLogEntry[]; total: number; pages: number; page: number; }

const ACTION_COLOR: Record<string, string> = {
  'admin.update_user': 'var(--accent-ember)',
  'admin.delete_tree': '#B02020',
  'auth.login':        '#3D7554',
  'auth.logout':       'var(--text-faint)',
  'auth.login_failed': '#D4862A',
};

function dt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function MetaRow({ meta }: { meta: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  if (!Object.keys(meta).length) return null;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-2xs"
        style={{ color: 'var(--text-faint)' }}
      >
        {open ? <ChevronDown size={10} /> : <span style={{ fontSize: 10 }}>›</span>}
        metadata
      </button>
      {open && (
        <pre
          className="mt-1.5 rounded-lg px-3 py-2 text-2xs overflow-x-auto"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
        >
          {JSON.stringify(meta, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AdminAuditLogPage() {
  const [page, setPage]     = useState(1);
  const [action, setAction] = useState('');
  const [resType, setResType] = useState('');
  const [since, setSince]   = useState('');
  const [until, setUntil]   = useState('');

  const params = new URLSearchParams({
    page: String(page), perPage: '50',
    ...(action  ? { action  } : {}),
    ...(resType ? { resourceType: resType } : {}),
    ...(since   ? { since } : {}),
    ...(until   ? { until } : {}),
  });

  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['admin', 'audit-logs', page, action, resType, since, until],
    queryFn:  () => api.get(`/v1/admin/audit-logs?${params}`),
  });

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <p className="text-2xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--accent-ember)' }}>
          Admin
        </p>
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Audit log
        </h1>
        {data && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {data.total.toLocaleString()} events
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
          <input
            value={action} onChange={e => { setAction(e.target.value); setPage(1); }}
            placeholder="Filter by action…"
            className="h-9 rounded-lg pl-8 pr-3 text-sm focus:outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', width: 200 }}
          />
        </div>

        <select value={resType} onChange={e => { setResType(e.target.value); setPage(1); }}
          className="h-9 rounded-lg px-3 text-sm focus:outline-none"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
          <option value="">All resources</option>
          {['user', 'tree', 'person', 'media', 'auth', 'billing'].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input type="date" value={since} onChange={e => { setSince(e.target.value); setPage(1); }}
            className="h-9 rounded-lg px-3 text-sm focus:outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }} />
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>to</span>
          <input type="date" value={until} onChange={e => { setUntil(e.target.value); setPage(1); }}
            className="h-9 rounded-lg px-3 text-sm focus:outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }} />
        </div>

        {(action || resType || since || until) && (
          <button onClick={() => { setAction(''); setResType(''); setSince(''); setUntil(''); setPage(1); }}
            className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Log entries */}
      <div className="space-y-1.5">
        {isLoading && [...Array(10)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl shimmer" />
        ))}

        {data?.data.length === 0 && <EmptyState variant="audit" />}

        {data?.data.map(entry => (
          <div
            key={entry.id}
            className="card px-4 py-3"
          >
            <div className="flex items-start gap-4">
              {/* Timestamp */}
              <div className="w-36 shrink-0 text-2xs tabular-nums" style={{ color: 'var(--text-faint)' }}>
                {dt(entry.createdAt)}
              </div>

              {/* Core info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-2xs"
                    style={{
                      background: 'var(--bg-subtle)',
                      color: ACTION_COLOR[entry.action] ?? 'var(--text-secondary)',
                    }}
                  >
                    {entry.action}
                  </span>
                  <span className="text-2xs" style={{ color: 'var(--text-faint)' }}>
                    {entry.resourceType}{entry.resourceId ? `:${entry.resourceId.slice(0, 8)}…` : ''}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-3">
                  {entry.userEmail && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {entry.userEmail}
                    </span>
                  )}
                  {entry.ipAddress && (
                    <span className="font-mono text-2xs" style={{ color: 'var(--text-faint)' }}>
                      {entry.ipAddress}
                    </span>
                  )}
                </div>

                <div className="mt-1.5">
                  <MetaRow meta={entry.metadata} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {data.page} of {data.pages} · {data.total.toLocaleString()} events
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
