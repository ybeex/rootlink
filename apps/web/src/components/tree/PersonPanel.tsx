'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Calendar, BookOpen, Camera, Star, Clock, Plus, Pencil } from 'lucide-react';
import { api, ApiClientError } from '../../lib/api-client';
import { formatPartialDate, getDisplayName } from '@rootlink/shared';
import type { Person, VitalEvent } from '@rootlink/shared';
import { AddRelationshipModal } from './AddRelationshipModal';
import { Lock } from 'lucide-react';

interface PersonPanelProps {
  treeId:   string;
  personId: string | null;
  onClose:  () => void;
  onEdit:   (personId: string) => void;
  readOnly?: boolean;
  /** Present when this panel is rendered on the public /shared view. */
  shareToken?: string;
}

type PersonWithEvents = Person & { events: VitalEvent[] };

export function PersonPanel({ treeId, personId, onClose, onEdit, readOnly = false, shareToken }: PersonPanelProps) {
  const [showAddRelation, setShowAddRelation] = useState(false);
  const reduceMotion = useReducedMotion();

  const { data: person, isLoading, error } = useQuery({
    queryKey: ['person', treeId, personId, shareToken],
    queryFn:  () => {
      const qs = shareToken ? `?shareToken=${shareToken}` : '';
      return api.get<PersonWithEvents>(`/v1/trees/${treeId}/persons/${personId}${qs}`, {
        skipAuth: !!shareToken,
      });
    },
    enabled:  !!personId && !!treeId,
    // A 403 PERSON_PRIVATE is an expected, non-error state on shared views —
    // don't retry it.
    retry: (failureCount, err) =>
      !(err instanceof ApiClientError && err.code === 'PERSON_PRIVATE') && failureCount < 2,
  });

  const isPrivate = error instanceof ApiClientError && error.code === 'PERSON_PRIVATE';

  const displayName = person
    ? getDisplayName({
        firstName:    person.firstName,
        middleName:   person.middleName,
        lastName:     person.lastName,
        preferredName: person.preferredName,
      })
    : '';

  const birthEvent = person?.events.find((e) => e.type === 'birth');
  const deathEvent = person?.events.find((e) => e.type === 'death');

  return (
    <>
      <AnimatePresence>
        {personId && (
          <motion.aside
            key="person-panel"
            initial={{ x: reduceMotion ? 0 : '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduceMotion ? 0 : '100%', opacity: 0 }}
            transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 38 }}
            className="absolute right-0 top-0 h-full w-88 overflow-y-auto"
            style={{
              background:  'var(--bg-surface)',
              borderLeft:  '1px solid var(--border-default)',
              boxShadow:   'var(--shadow-lg)',
              zIndex:      20,
            }}
            aria-label="Person details"
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
              style={{
                background:   'var(--bg-surface)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}>
                Person Details
              </span>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-muted)]"
                aria-label="Close panel">
                <X size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {isLoading ? (
              <PersonPanelSkeleton />
            ) : isPrivate ? (
              <PrivatePersonNotice />
            ) : person ? (
              <div className="px-5 pb-8">
                {/* Avatar + name */}
                <div className="pb-5 pt-6">
                  <div
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold"
                    style={{
                      background: 'var(--accent-ember-soft)',
                      color:      'var(--accent-ember)',
                      fontFamily: 'var(--font-display)',
                    }}>
                    {(person.isLiving ? '?' : displayName.charAt(0)) || '?'}
                  </div>

                  <h2
                    className="text-xl font-semibold leading-tight"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                    {person.isLiving ? 'Living' : displayName}
                  </h2>

                  {person.maidenName && (
                    <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                      née {person.maidenName}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        background: person.dataQualityScore >= 70
                          ? 'rgba(74,124,89,0.12)'
                          : person.dataQualityScore >= 40
                          ? 'rgba(199,154,74,0.12)'
                          : 'var(--bg-muted)',
                        color: person.dataQualityScore >= 70
                          ? '#4a7c59'
                          : person.dataQualityScore >= 40
                          ? '#8a5d1e'
                          : 'var(--text-muted)',
                      }}>
                      <Star size={9} className="mr-1 inline" />
                      {person.dataQualityScore}% complete
                    </span>

                    {person.isLiving && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs"
                        style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                        Living
                      </span>
                    )}

                    {readOnly && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs"
                        style={{ background: 'var(--bg-muted)', color: 'var(--text-faint)' }}>
                        Read only
                      </span>
                    )}
                  </div>
                </div>

                <Divider />

                {/* Vital info */}
                <Section title="Vital Information">
                  <InfoRow
                    icon={<Calendar size={13} />}
                    label="Born"
                    value={
                      birthEvent
                        ? [formatPartialDate(birthEvent.date), birthEvent.place?.displayName]
                            .filter(Boolean)
                            .join(' · ')
                        : 'Unknown'
                    }
                  />
                  {!person.isLiving && (
                    <InfoRow
                      icon={<Calendar size={13} />}
                      label="Died"
                      value={
                        deathEvent
                          ? [formatPartialDate(deathEvent.date), deathEvent.place?.displayName]
                              .filter(Boolean)
                              .join(' · ')
                          : 'Unknown'
                      }
                    />
                  )}
                  <InfoRow
                    icon={<BookOpen size={13} />}
                    label="Sources"
                    value={`${person.sourceIds?.length ?? 0} citation${(person.sourceIds?.length ?? 0) !== 1 ? 's' : ''}`}
                  />
                  <InfoRow
                    icon={<Camera size={13} />}
                    label="Photos"
                    value={`${person.mediaIds?.length ?? 0} item${(person.mediaIds?.length ?? 0) !== 1 ? 's' : ''}`}
                  />
                </Section>

                {person.biography && (
                  <>
                    <Divider />
                    <Section title="Biography">
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {person.biography.length > 280
                          ? `${person.biography.slice(0, 280)}…`
                          : person.biography}
                      </p>
                    </Section>
                  </>
                )}

                {person.notes && !readOnly && (
                  <>
                    <Divider />
                    <Section title="Notes">
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {person.notes}
                      </p>
                    </Section>
                  </>
                )}

                <Divider />

                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-faint)' }}>
                  <Clock size={11} />
                  <span>
                    Updated{' '}
                    {new Date(person.updatedAt).toLocaleDateString('en', {
                      month: 'short',
                      day:   'numeric',
                      year:  'numeric',
                    })}
                  </span>
                </div>

                {/* Actions — hidden in read-only mode */}
                {!readOnly && (
                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      onClick={() => onEdit(person.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all hover:opacity-90"
                      style={{ background: 'var(--accent-primary)', color: 'white' }}>
                      <Pencil size={14} />
                      Edit Person
                    </button>

                    <button
                      onClick={() => setShowAddRelation(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-muted)]"
                      style={{
                        color:  'var(--text-secondary)',
                        border: '1px solid var(--border-default)',
                      }}>
                      <Plus size={14} />
                      Add Relation
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Add Relationship Modal — rendered outside the panel to avoid z-index issues */}
      {person && !readOnly && (
        <AddRelationshipModal
          treeId={treeId}
          fromPersonId={person.id}
          fromPersonName={person.isLiving ? 'Living' : displayName}
          open={showAddRelation}
          onClose={() => setShowAddRelation(false)}
        />
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}>
        {title}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0" style={{ color: 'var(--text-faint)' }}>{icon}</span>
      <div className="min-w-0">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <p
          className="truncate text-sm"
          style={{ color: value === 'Unknown' ? 'var(--text-faint)' : 'var(--text-secondary)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px" style={{ background: 'var(--border-subtle)' }} />;
}

function PrivatePersonNotice() {
  return (
    <div className="flex flex-col items-center px-5 pb-8 pt-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: 'var(--bg-subtle)' }}>
        <Lock size={24} style={{ color: 'var(--text-faint)' }} />
      </div>
      <h3 className="mb-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        This person is living
      </h3>
      <p className="max-w-56 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Details about living relatives are kept private on shared tree views.
      </p>
    </div>
  );
}

function PersonPanelSkeleton() {
  return (
    <div className="px-5 pb-8 pt-6">
      <div className="shimmer mb-4 h-16 w-16 rounded-2xl" />
      <div className="shimmer mb-2 h-6 w-48 rounded" />
      <div className="shimmer h-4 w-32 rounded" />
      <div className="mt-6 space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="shimmer h-4 w-full rounded" />)}
      </div>
    </div>
  );
}
