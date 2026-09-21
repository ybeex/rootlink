'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Loader2, Search } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api, ApiClientError } from '../../lib/api-client';
import type { PersonSummary, Relationship, PaginatedResponse } from '@rootlink/shared';
import { RELATIONSHIP_TYPES, formatRelationshipType } from '@rootlink/shared';
import { useDebounce } from '../../hooks/useDebounce';

interface AddRelationshipModalProps {
  treeId:        string;
  fromPersonId:  string;
  fromPersonName: string;
  open:          boolean;
  onClose:       () => void;
}

interface FormValues {
  toPersonId:   string;
  type:         typeof RELATIONSHIP_TYPES[number];
  certainty:    'confirmed' | 'probable' | 'possible' | 'disputed';
}

export function AddRelationshipModal({
  treeId, fromPersonId, fromPersonName, open, onClose,
}: AddRelationshipModalProps) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState('');
  const debouncedSearch     = useDebounce(search, 300);

  const form = useForm<FormValues>({
    defaultValues: { type: 'biological_parent', certainty: 'confirmed', toPersonId: '' },
  });

  const selectedId = form.watch('toPersonId');

  // Search persons in tree to pick the related person
  const { data: searchData } = useQuery({
    queryKey: ['persons', treeId, { q: debouncedSearch }],
    queryFn: () =>
      api.get<PaginatedResponse<PersonSummary>>(
        `/v1/trees/${treeId}/persons?q=${encodeURIComponent(debouncedSearch)}&pageSize=8`,
      ),
    enabled: debouncedSearch.length >= 1,
    select: (d) => d.data.filter((p) => p.id !== fromPersonId),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.post<Relationship>(`/v1/trees/${treeId}/relationships`, {
        fromPersonId,
        toPersonId:  values.toPersonId,
        type:        values.type,
        certainty:   values.certainty,
        sourceIds:   [],
        startDate:   null,
        endDate:     null,
        notes:       null,
      }, { idempotencyKey: crypto.randomUUID() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships', treeId] });
      toast.success('Relationship added.');
      onClose();
      form.reset();
      setSearch('');
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to add relationship.');
    },
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.95, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
            className="w-full max-w-md overflow-hidden rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h2 className="text-base font-semibold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Add Relationship
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  For <strong>{fromPersonName}</strong>
                </p>
              </div>
              <button onClick={onClose}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-muted)]">
                <X size={15} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4 p-5">

              {/* Relationship type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}>
                  Relationship Type
                </label>
                <select
                  {...form.register('type')}
                  className="w-full appearance-none rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}>
                  {RELATIONSHIP_TYPES.map((t) => (
                    <option key={t} value={t}>{fromPersonName} is {formatRelationshipType(t)} of…</option>
                  ))}
                </select>
              </div>

              {/* Person search */}
              <div>
                <label className="mb-1.5 block text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}>
                  Related Person
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-faint)' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name…"
                    className="w-full rounded-xl py-2.5 pl-8 pr-3 text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--bg-subtle)',
                      border: `1px solid ${!selectedId && form.formState.isSubmitted ? 'var(--danger)' : 'var(--border-default)'}`,
                      color: 'var(--text-primary)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                  />
                </div>

                {/* Search results */}
                {searchData && searchData.length > 0 && (
                  <div className="mt-1 overflow-hidden rounded-xl"
                    style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
                    {searchData.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => {
                          form.setValue('toPersonId', person.id);
                          setSearch(person.isLiving ? 'Living' : person.displayName);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                        style={{
                          color: 'var(--text-primary)',
                          background: selectedId === person.id ? 'var(--accent-ember-soft)' : undefined,
                        }}>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                          style={{
                            background: person.sex === 'male' ? 'var(--sex-male-soft)' : person.sex === 'female' ? 'var(--sex-female-soft)' : 'var(--bg-subtle)',
                            color: person.sex === 'male' ? 'var(--sex-male)' : person.sex === 'female' ? 'var(--sex-female)' : 'var(--text-faint)',
                          }}>
                          {(person.isLiving ? '?' : person.displayName.charAt(0))}
                        </div>
                        <div>
                          <p>{person.isLiving ? 'Living' : person.displayName}</p>
                          {person.birthYear && (
                            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>b. {person.birthYear}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected person display */}
                {selectedId && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: 'var(--accent-ember-soft)' }}>
                    <div className="h-2 w-2 rounded-full" style={{ background: 'var(--accent-ember)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--accent-ember)' }}>
                      Person selected
                    </span>
                    <button type="button" onClick={() => { form.setValue('toPersonId', ''); setSearch(''); }}
                      className="ml-auto" style={{ color: 'var(--accent-ember)' }}>
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Certainty */}
              <div>
                <label className="mb-1.5 block text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}>
                  Certainty
                </label>
                <select
                  {...form.register('certainty')}
                  className="w-full appearance-none rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}>
                  <option value="confirmed">Confirmed</option>
                  <option value="probable">Probable</option>
                  <option value="possible">Possible</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="rounded-xl px-5 py-2.5 text-sm transition-colors hover:bg-[var(--bg-muted)]"
                  style={{ color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending || !selectedId}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: 'var(--accent-primary)' }}>
                  {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
                  Add Relationship
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
