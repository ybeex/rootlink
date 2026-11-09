'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../../lib/api-client';
import type { PersonSummary, Tree, PaginatedResponse } from '@rootlink/shared';

interface TreeWithRole extends Tree { role: string }

export default function PeoplePage() {
  const reduceMotion = useReducedMotion();
  const [search, setSearch]   = useState('');
  const [treeFilter, setTreeFilter] = useState<string>('');
  const [page, setPage]       = useState(1);

  const { data: trees } = useQuery({
    queryKey: ['trees'],
    queryFn: () => api.get<TreeWithRole[]>('/v1/trees'),
  });

  // Pick first tree or filtered one
  const activeTrees = treeFilter
    ? (trees ?? []).filter((t) => t.id === treeFilter)
    : (trees ?? []);

  const treeId = activeTrees[0]?.id ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['persons', treeId, { q: search, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '24' });
      if (search) params.set('q', search);
      return api.get<PaginatedResponse<PersonSummary>>(
        `/v1/trees/${treeId}/persons?${params.toString()}`,
      );
    },
    enabled: !!treeId,
  });

  const persons     = data?.data ?? [];
  const pagination  = data?.pagination;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          People
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Browse everyone across your family trees.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-faint)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name…"
            className="w-full rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none transition-colors"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          />
        </div>

        {trees && trees.length > 1 && (
          <select
            value={treeFilter}
            onChange={(e) => { setTreeFilter(e.target.value); setPage(1); }}
            className="rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}>
            <option value="">All trees</option>
            {trees.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Results */}
      {!treeId ? (
        <EmptyNoTree />
      ) : isLoading ? (
        <PersonGridSkeleton />
      ) : persons.length === 0 ? (
        <EmptyNoResults search={search} treeId={treeId} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {persons.map((person, i) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : i * 0.03 }}>
                <Link href={`/trees/${treeId}?person=${person.id}`}>
                  <article
                    className="group rounded-xl p-4 transition-all"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}>
                    {/* Avatar */}
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold"
                      style={{
                        background: person.sex === 'male'
                          ? 'var(--sex-male-soft)'
                          : person.sex === 'female'
                          ? 'var(--sex-female-soft)'
                          : 'var(--bg-subtle)',
                        color: person.sex === 'male'
                          ? 'var(--sex-male)'
                          : person.sex === 'female'
                          ? 'var(--sex-female)'
                          : 'var(--text-faint)',
                        fontFamily: 'var(--font-display)',
                      }}>
                      {person.isLiving ? '?' : (person.displayName.charAt(0) || '?')}
                    </div>

                    <p className="truncate text-sm font-medium leading-snug"
                      style={{ color: 'var(--text-primary)' }}>
                      {person.isLiving ? 'Living' : person.displayName}
                    </p>

                    <p className="mt-0.5 font-mono text-xs"
                      style={{ color: 'var(--text-faint)' }}>
                      {person.birthYear
                        ? `b. ${person.birthYear}`
                        : person.deathYear
                        ? `d. ${person.deathYear}`
                        : 'Unknown dates'}
                    </p>

                    {/* Quality indicator */}
                    <div className="mt-2 h-1 overflow-hidden rounded-full"
                      style={{ background: 'var(--bg-muted)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${person.dataQualityScore}%`,
                          background: person.dataQualityScore >= 70
                            ? '#4a7c59'
                            : person.dataQualityScore >= 40
                            ? '#c79a4a'
                            : 'var(--border-strong)',
                        }} />
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}>
                Previous
              </button>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyNoTree() {
  return (
    <div className="py-20 text-center">
      <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Create a tree first to start adding people.
      </p>
      <Link href="/trees/new"
        className="mt-4 inline-flex items-center gap-1 text-sm underline"
        style={{ color: 'var(--accent-ember)' }}>
        Create a tree <ChevronRight size={13} />
      </Link>
    </div>
  );
}

function EmptyNoResults({ search, treeId: _treeId }: { search: string; treeId: string }) {
  return (
    <div className="py-20 text-center">
      <Search size={28} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {search ? `No people found matching "${search}".` : 'No people in this tree yet.'}
      </p>
    </div>
  );
}

function PersonGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl p-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="shimmer mb-3 h-12 w-12 rounded-xl" />
          <div className="shimmer mb-1.5 h-4 w-3/4 rounded" />
          <div className="shimmer h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}
