'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Pencil, Calendar, MapPin, BookOpen,
  Camera, Star, Clock, Lightbulb, Zap, Loader2, Route,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '../../../../../../lib/api-client';
import { formatPartialDate, getDisplayName } from '@rootlink/shared';
import type { Person, VitalEvent } from '@rootlink/shared';
import { RelationshipFinderModal } from '../../../../../../components/person/RelationshipFinderModal';

type PersonWithEvents = Person & { events: VitalEvent[] };

interface Props {
  params: Promise<{ treeId: string; personId: string }>;
}

export default function PersonDetailPage({ params }: Props) {
  const { treeId, personId } = use(params);
  const router               = useRouter();
  const queryClient          = useQueryClient();
  const [tab, setTab]        = useState<'timeline' | 'sources' | 'history'>('timeline');
  const [showRelFinder, setShowRelFinder] = useState(false);

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', treeId, personId],
    queryFn:  () => api.get<PersonWithEvents>(`/v1/trees/${treeId}/persons/${personId}`),
  });

  const bioMutation = useMutation({
    mutationFn: () =>
      api.post(`/v1/trees/${treeId}/persons/${personId}/generate-bio`, {}),
    onSuccess: () => {
      toast.success('Biography generation queued. You will receive a notification when ready.');
    },
    onError: (err: unknown) => {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 403) {
        toast.error('AI biography generation requires a Plus or Pro subscription.');
      } else {
        toast.error('Failed to queue biography generation.');
      }
    },
  });

  const { data: historyData } = useQuery({
    queryKey: ['person-history', treeId, personId],
    queryFn:  () =>
      api.get<{ data: Record<string, unknown>[] }>(
        `/v1/trees/${treeId}/persons/${personId}/history?pageSize=20`,
      ),
    enabled: tab === 'history',
    select: (d) => d.data,
  });

  if (isLoading) return <PersonDetailSkeleton />;
  if (!person) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Person not found.</p>
      </div>
    );
  }

  const displayName = getDisplayName({
    firstName:    person.firstName,
    middleName:   person.middleName,
    lastName:     person.lastName,
    preferredName: person.preferredName,
  });

  const birthEvent  = person.events.find((e) => e.type === 'birth');
  const deathEvent  = person.events.find((e) => e.type === 'death');
  const otherEvents = person.events.filter((e) => e.type !== 'birth' && e.type !== 'death');

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Back button */}
      <button
        onClick={() => router.push(`/trees/${treeId}`)}
        className="mb-6 flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={14} /> Back to tree
      </button>

      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-start gap-5">
        {/* Avatar */}
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold"
          style={{
            background:  person.sex === 'male'
              ? 'rgba(102,136,204,0.12)'
              : person.sex === 'female'
              ? 'rgba(196,122,192,0.12)'
              : 'var(--bg-subtle)',
            color: person.sex === 'male' ? '#6688cc'
              : person.sex === 'female' ? '#c47ac0'
              : 'var(--text-faint)',
            fontFamily: 'var(--font-display)',
          }}>
          {person.isLiving ? '?' : displayName.charAt(0)}
        </div>

        <div className="flex-1">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                {person.isLiving ? 'Living Person' : displayName}
              </h1>
              {person.maidenName && (
                <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                  née {person.maidenName}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  {person.sex}
                </span>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    background: person.dataQualityScore >= 70
                      ? 'rgba(74,124,89,0.12)'
                      : 'rgba(199,154,74,0.12)',
                    color: person.dataQualityScore >= 70 ? '#4a7c59' : '#8a5d1e',
                  }}>
                  <Star size={9} className="mr-1 inline" />
                  {person.dataQualityScore}% complete
                </span>
                <span className="rounded-full px-2.5 py-0.5 text-xs capitalize"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  {person.privacyLevel}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setShowRelFinder(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                <Route size={13} /> How are we related?
              </button>
              <button
                onClick={() => router.push(`/trees/${treeId}/persons/${personId}/edit`)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white"
                style={{ background: 'var(--accent-primary)' }}>
                <Pencil size={13} /> Edit
              </button>
            </div>
          </div>

          {/* Vital dates */}
          <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            {birthEvent && (
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                <span>
                  Born {formatPartialDate(birthEvent.date)}
                  {birthEvent.place && ` · ${birthEvent.place.displayName}`}
                </span>
              </span>
            )}
            {!person.isLiving && deathEvent && (
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                <span>
                  Died {formatPartialDate(deathEvent.date)}
                  {deathEvent.place && ` · ${deathEvent.place.displayName}`}
                </span>
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Biography */}
      <div className="mb-6 rounded-2xl p-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Biography
          </h2>
          {!person.biography && !person.isLiving && (
            <button
              onClick={() => bioMutation.mutate()}
              disabled={bioMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: 'var(--accent-ember-soft)', color: 'var(--accent-ember)' }}>
              {bioMutation.isPending
                ? <Loader2 size={11} className="animate-spin" />
                : <Zap size={11} />}
              Generate with AI
            </button>
          )}
        </div>

        {person.biography ? (
          <p className="leading-relaxed text-sm" style={{ color: 'var(--text-secondary)' }}>
            {person.biography}
          </p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
            No biography yet.
            {!person.isLiving && ' Use AI to generate a draft from available records.'}
          </p>
        )}

        {person.biographyGeneratedAt && (
          <p className="mt-3 text-xs" style={{ color: 'var(--text-faint)' }}>
            AI draft generated {new Date(person.biographyGeneratedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-subtle)' }}>
        {(['timeline', 'sources', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 rounded-lg py-2 text-xs font-medium capitalize transition-colors"
            style={{
              background: tab === t ? 'var(--bg-surface)' : 'transparent',
              color:      tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow:  tab === t ? 'var(--shadow-xs)' : 'none',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Timeline tab */}
      {tab === 'timeline' && (
        <div className="space-y-3">
          {person.events.length === 0 ? (
            <EmptyTab message="No life events recorded yet." />
          ) : (
            person.events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-4 rounded-xl p-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-faint)' }}>
                  <Calendar size={14} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium capitalize"
                      style={{ color: 'var(--text-primary)' }}>
                      {event.type.replace(/_/g, ' ')}
                    </p>
                    <span className="rounded-full px-2 py-0.5 text-2xs capitalize"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-faint)' }}>
                      {event.certainty}
                    </span>
                  </div>
                  {event.date && (
                    <p className="mt-0.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatPartialDate(event.date)}
                    </p>
                  )}
                  {event.place && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs"
                      style={{ color: 'var(--text-muted)' }}>
                      <MapPin size={10} /> {event.place.displayName}
                    </p>
                  )}
                  {event.description && (
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {event.description}
                    </p>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Sources tab */}
      {tab === 'sources' && (
        <div>
          {(person.sourceIds?.length ?? 0) === 0 ? (
            <EmptyTab message="No source citations attached yet." />
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {person.sourceIds?.length} source citation{(person.sourceIds?.length ?? 0) !== 1 ? 's' : ''} attached.
            </p>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="space-y-2">
          {!historyData || historyData.length === 0 ? (
            <EmptyTab message="No edit history yet." />
          ) : (
            historyData.map((entry) => (
              <div key={String(entry['id'] ?? '')}
                className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <Clock size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--text-faint)' }} />
                <div>
                  <p className="text-xs font-medium capitalize"
                    style={{ color: 'var(--text-primary)' }}>
                    {String(entry['action'] ?? '')}
                  </p>
                  <p className="text-2xs" style={{ color: 'var(--text-faint)' }}>
                    {entry['performedAt']
                      ? new Date(String(entry['performedAt'])).toLocaleString()
                      : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Research notes */}
      {person.notes && (
        <div className="mt-6 rounded-2xl p-5"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Research Notes
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {person.notes}
          </p>
        </div>
      )}

      {/* Meta */}
      <div className="mt-6 flex items-center gap-4 text-xs" style={{ color: 'var(--text-faint)' }}>
        <span className="flex items-center gap-1">
          <Clock size={11} />
          Updated {new Date(person.updatedAt).toLocaleDateString('en', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </span>
        {person.gedcomId && (
          <span className="font-mono">GEDCOM: {person.gedcomId}</span>
        )}
      </div>

      <RelationshipFinderModal
        treeId={treeId}
        fromPersonId={personId}
        fromPersonName={displayName}
        open={showRelFinder}
        onClose={() => setShowRelFinder(false)}
      />
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="rounded-2xl py-12 text-center"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  );
}

function PersonDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="shimmer mb-6 h-4 w-28 rounded" />
      <div className="mb-8 flex items-start gap-5">
        <div className="shimmer h-20 w-20 rounded-2xl" />
        <div className="flex-1 space-y-3">
          <div className="shimmer h-7 w-56 rounded" />
          <div className="shimmer h-4 w-32 rounded" />
          <div className="shimmer h-4 w-48 rounded" />
        </div>
      </div>
      <div className="shimmer h-28 w-full rounded-2xl" />
    </div>
  );
}
