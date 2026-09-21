'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Route, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api } from '../../lib/api-client';
import type { PersonSummary, PaginatedResponse, RelationshipPathResult } from '@rootlink/shared';
import { useDebounce } from '../../hooks/useDebounce';

interface RelationshipFinderModalProps {
  treeId: string;
  fromPersonId: string;
  fromPersonName: string;
  open: boolean;
  onClose: () => void;
}

export function RelationshipFinderModal({
  treeId, fromPersonId, fromPersonName, open, onClose,
}: RelationshipFinderModalProps) {
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetName, setTargetName] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Same search-as-you-type pattern as AddRelationshipModal.
  const { data: searchData } = useQuery({
    queryKey: ['persons', treeId, { q: debouncedSearch }],
    queryFn: () =>
      api.get<PaginatedResponse<PersonSummary>>(
        `/v1/trees/${treeId}/persons?q=${encodeURIComponent(debouncedSearch)}&pageSize=8`,
      ),
    enabled: debouncedSearch.length >= 1 && !targetId,
    select: (d) => d.data.filter((p) => p.id !== fromPersonId),
  });

  const { data: path, isLoading, isFetched } = useQuery({
    queryKey: ['relationshipPath', treeId, fromPersonId, targetId],
    queryFn: () => api.get<RelationshipPathResult | null>(
      `/v1/trees/${treeId}/relationships/path?from=${fromPersonId}&to=${targetId}`,
    ),
    enabled: !!targetId,
  });

  const reset = () => {
    setTargetId(null);
    setTargetName('');
    setSearch('');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { reset(); onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.95, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
            className="w-full max-w-md overflow-hidden rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  How are we related?
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Relative to <strong>{fromPersonName}</strong>
                </p>
              </div>
              <button onClick={() => { reset(); onClose(); }}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-muted)]">
                <X size={15} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="p-5">
              {!targetId ? (
                <>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search for another person…"
                      autoFocus
                      className="w-full rounded-xl py-2.5 pl-8 pr-3 text-sm outline-none"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  {searchData && searchData.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
                      {searchData.map((person) => (
                        <button
                          key={person.id}
                          onClick={() => {
                            setTargetId(person.id);
                            setTargetName(person.isLiving ? 'Living' : person.displayName);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                          style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)' }}
                        >
                          <span>{person.isLiving ? 'Living' : person.displayName}</span>
                          {person.birthYear && (
                            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>b. {person.birthYear}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : isLoading ? (
                <p className="py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Finding a path…</p>
              ) : isFetched && !path ? (
                <div className="py-6 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    No relationship path found between {fromPersonName} and {targetName} in this tree.
                  </p>
                  <button onClick={reset} className="mt-3 text-xs font-medium underline" style={{ color: 'var(--accent-primary)' }}>
                    Try another person
                  </button>
                </div>
              ) : path ? (
                <div>
                  {path.relationshipLabel && (
                    <div className="mb-4 rounded-xl p-4 text-center" style={{ background: 'var(--accent-ember-soft)' }}>
                      <p className="text-xs" style={{ color: 'var(--accent-ember)' }}>{targetName} is {fromPersonName}&rsquo;s</p>
                      <p className="mt-0.5 text-lg font-semibold capitalize" style={{ color: 'var(--accent-ember)' }}>
                        {path.relationshipLabel}
                      </p>
                    </div>
                  )}

                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    <Route size={12} />
                    Path ({path.steps.length - 1} step{path.steps.length - 1 === 1 ? '' : 's'})
                  </div>
                  <div className="space-y-1">
                    {path.steps.map((step, i) => (
                      <div key={step.personId}>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{step.displayName}</p>
                        {i < path.hopDescriptions.length && (
                          <div className="flex items-center gap-1.5 py-0.5 pl-2 text-xs" style={{ color: 'var(--text-faint)' }}>
                            <ArrowRight size={10} />
                            {path.hopDescriptions[i]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button onClick={reset} className="mt-4 text-xs font-medium underline" style={{ color: 'var(--accent-primary)' }}>
                    Find another relationship
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
