'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search, Users, BookOpen, Clock, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { TreeNavIcon } from '../../../components/brand/icons';
import { useDebounce } from '../../../hooks/useDebounce';
import { api } from '../../../lib/api-client';
import { getDisplayName } from '@rootlink/shared';
import type { PersonSummary, Tree, PaginatedResponse } from '@rootlink/shared';

interface SearchResults {
  persons: Array<PersonSummary & { treeId: string; treeName: string }>;
  trees: Array<Tree & { role: string }>;
}

export default function SearchPage() {
  const reduceMotion = useReducedMotion();
  const [query, setQuery]             = useState('');
  const [recentSearches, setRecent]   = useState<string[]>([]);
  const inputRef                       = useRef<HTMLInputElement>(null);
  const debouncedQuery                 = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rootlink:recent-searches');
      if (stored) setRecent(JSON.parse(stored) as string[]);
    } catch { /* ignore */ }
    inputRef.current?.focus();
  }, []);

  const saveRecent = (q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 8);
    setRecent(updated);
    try { localStorage.setItem('rootlink:recent-searches', JSON.stringify(updated)); } catch { /* ignore */ }
  };

  // Search persons across all trees
  const { data: trees } = useQuery({
    queryKey: ['trees'],
    queryFn: () => api.get<Array<Tree & { role: string }>>('/v1/trees'),
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async (): Promise<SearchResults> => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
        return { persons: [], trees: [] };
      }

      const allPersons: SearchResults['persons'] = [];

      // Search across trees — cap at 5 trees to prevent request storms.
      // For users with many trees, a future dedicated search endpoint should be used.
      const treeList = (trees ?? []).slice(0, 5);

      await Promise.all(
        treeList.map(async (tree) => {
          try {
            const result = await api.get<PaginatedResponse<PersonSummary>>(
              `/v1/trees/${tree.id}/persons?q=${encodeURIComponent(debouncedQuery)}&pageSize=5`,
            );
            for (const p of result.data) {
              allPersons.push({ ...p, treeId: tree.id, treeName: tree.name });
            }
          } catch { /* tree may be inaccessible — skip silently */ }
        }),
      );

      const matchingTrees = (trees ?? []).filter((t) =>
        t.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
      );

      return {
        persons: allPersons.slice(0, 12),
        trees: matchingTrees.slice(0, 4),
      };
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 15 * 1000,
  });

  const hasResults = results && (results.persons.length > 0 || results.trees.length > 0);
  const showEmpty  = debouncedQuery.length >= 2 && !isLoading && !hasResults;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        Search
      </h1>

      {/* Search input */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-faint)' }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) saveRecent(query.trim());
          }}
          placeholder="Search people, trees…"
          className="w-full rounded-2xl py-3.5 pl-12 pr-12 text-base outline-none transition-colors"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
        />
        {query && (
          <button onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 transition-colors hover:bg-[var(--bg-muted)]"
            aria-label="Clear search">
            <X size={15} style={{ color: 'var(--text-faint)' }} />
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && debouncedQuery.length >= 2 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="shimmer h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="shimmer h-4 w-40 rounded" />
                <div className="shimmer h-3 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {hasResults && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6">

            {/* People */}
            {results.persons.length > 0 && (
              <section>
                <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>
                  <Users size={12} /> People
                </h2>
                <div className="space-y-1.5">
                  {results.persons.map((person) => {
                    const name = person.isLiving ? 'Living' : person.displayName;
                    const dates = [
                      person.birthYear ? `b. ${person.birthYear}` : null,
                      person.deathYear ? `d. ${person.deathYear}` : null,
                    ].filter(Boolean).join('  ·  ');

                    return (
                      <Link
                        key={person.id}
                        href={`/trees/${person.treeId}?person=${person.id}`}
                        onClick={() => saveRecent(query.trim())}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                        }}>
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                          style={{
                            background: person.sex === 'male'
                              ? 'var(--sex-male-soft)'
                              : person.sex === 'female'
                              ? 'var(--sex-female-soft)'
                              : 'var(--bg-subtle)',
                            color: person.sex === 'male' ? 'var(--sex-male)'
                              : person.sex === 'female' ? 'var(--sex-female)'
                              : 'var(--text-faint)',
                            fontFamily: 'var(--font-display)',
                          }}>
                          {name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium"
                            style={{ color: 'var(--text-primary)' }}>
                            <Highlight text={name} query={debouncedQuery} />
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {dates || 'Unknown dates'}
                            <span className="mx-1.5 opacity-40">·</span>
                            {person.treeName}
                          </p>
                        </div>
                        <ArrowRight size={13} style={{ color: 'var(--text-faint)' }} />
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Trees */}
            {results.trees.length > 0 && (
              <section>
                <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>
                  <TreeNavIcon size={12} color="var(--text-muted)" /> Trees
                </h2>
                <div className="space-y-1.5">
                  {results.trees.map((tree) => (
                    <Link
                      key={tree.id}
                      href={`/trees/${tree.id}`}
                      onClick={() => saveRecent(query.trim())}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                      }}>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--text-faint)' }}>
                        <TreeNavIcon size={16} color="var(--text-faint)" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium"
                          style={{ color: 'var(--text-primary)' }}>
                          <Highlight text={tree.name} query={debouncedQuery} />
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {tree.personCount.toLocaleString()} people
                        </p>
                      </div>
                      <ArrowRight size={13} style={{ color: 'var(--text-faint)' }} />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        )}

        {/* Empty */}
        {showEmpty && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center">
            <Search size={28} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No results for <strong>&ldquo;{debouncedQuery}&rdquo;</strong>
            </p>
          </motion.div>
        )}

        {/* Initial state: recent searches */}
        {!query && recentSearches.length > 0 && (
          <motion.div key="recent" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              <Clock size={12} /> Recent
            </h2>
            <div className="space-y-1">
              {recentSearches.map((s) => (
                <button key={s} onClick={() => setQuery(s)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                  style={{ color: 'var(--text-secondary)' }}>
                  <Clock size={13} style={{ color: 'var(--text-faint)' }} />
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Highlight matching text
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} style={{ background: 'var(--accent-ember-soft)', color: 'var(--accent-ember)', borderRadius: '2px' }}>{part}</mark>
          : part,
      )}
    </>
  );
}
