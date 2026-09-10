'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '../../lib/api-client';
import type {
  ResearchHint, FamilySearchRecordDetail, Person, VitalEvent, EventType, PartialDate,
} from '@rootlink/shared';

interface Props {
  treeId: string;
  personId: string;
  hint: ResearchHint;
  onClose: () => void;
}

const FACT_TYPE_MAP: Record<string, EventType> = {
  Birth: 'birth',
  Death: 'death',
  Marriage: 'marriage',
  Divorce: 'divorce',
  Christening: 'baptism',
  Baptism: 'baptism',
  Burial: 'burial',
  Immigration: 'immigration',
  Emigration: 'emigration',
  MilitaryService: 'military_service',
  Education: 'education',
  Occupation: 'occupation',
  Residence: 'residence',
};

function eventInputFromEvent(e: VitalEvent) {
  // Strip server-generated fields (id, timestamps) to match what the
  // update endpoint accepts back — see person.service.ts's updatePerson,
  // which fully replaces the events array on every call, so this modal
  // must always submit the complete set, not just what it changed.
  return {
    type: e.type, date: e.date, endDate: e.endDate, place: e.place,
    description: e.description, certainty: e.certainty, sourceIds: e.sourceIds,
  };
}

export function FamilySearchReviewModal({ treeId, personId, hint, onClose }: Props) {
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const { data: record, isLoading: loadingRecord } = useQuery({
    queryKey: ['familysearchRecord', hint.externalRecordId],
    queryFn: () => api.get<FamilySearchRecordDetail>(`/v1/integrations/familysearch/record/${hint.externalRecordId}`),
  });

  const { data: person, isLoading: loadingPerson } = useQuery({
    queryKey: ['person', treeId, personId],
    queryFn: () => api.get<Person>(`/v1/trees/${treeId}/persons/${personId}`),
  });

  // Only facts with a parseable year are importable — see the file-level
  // note on why place import is deliberately out of scope for this pass
  // (RootLink's place field requires a validated country/countryCode that
  // can't be safely derived from FamilySearch's free-text place strings
  // without risking fabricated data).
  const importableFacts = (record?.facts ?? []).filter((f) => f.year !== null);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!person || !record) throw new Error('Not loaded');

      // 1. Record the source once, up front, so every imported fact can
      //    cite it — a fact that arrived this way should always be
      //    traceable back to where it came from.
      const source = await api.post<{ id: string }>(`/v1/trees/${treeId}/sources`, {
        type: 'website',
        title: `FamilySearch: ${record.displayName}`,
        repository: 'FamilySearch',
        repositoryUrl: hint.recordUrl,
        confidence: 'possible', // an unverified external match, never claimed as more certain than that
      });

      // 2. Merge selected facts into the person's existing events —
      //    updating an existing event of that type in place (adding the
      //    year and citing the new source) or appending a new one; every
      //    other existing event passes through untouched, since the
      //    update endpoint replaces the whole array on every call.
      const events = person.events.map(eventInputFromEvent);
      for (const idx of checked) {
        const fact = importableFacts[idx];
        const mappedType = FACT_TYPE_MAP[fact.type] ?? 'custom';
        const existing = events.find((e) => e.type === mappedType);
        const date: PartialDate = { year: fact.year, month: null, day: null, circa: false, beforeYear: null, afterYear: null };

        if (existing) {
          existing.date = existing.date?.year ? existing.date : date; // never overwrite a date the person already has
          existing.sourceIds = Array.from(new Set([...existing.sourceIds, source.id]));
        } else {
          events.push({
            type: mappedType,
            date,
            endDate: null,
            place: null, // deliberately not imported — see note above
            description: mappedType === 'custom' ? `FamilySearch fact: ${fact.type}` : null,
            certainty: 'possible',
            sourceIds: [source.id],
          });
        }
      }

      await api.patch(`/v1/trees/${treeId}/persons/${personId}`, { events });
      await api.patch(`/v1/trees/${treeId}/hints/${hint.id}`, { status: 'accepted' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['person', treeId, personId] });
      void queryClient.invalidateQueries({ queryKey: ['hints', treeId] });
      toast.success(checked.size > 0 ? 'Imported selected facts.' : 'Marked as reviewed.');
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Import failed.');
    },
  });

  const isLoading = loadingRecord || loadingPerson;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Review FamilySearch match</h2>
            <a href={hint.recordUrl} target="_blank" rel="noopener noreferrer"
              className="mt-0.5 flex items-center gap-1 text-xs underline" style={{ color: 'var(--accent-primary)' }}>
              View on FamilySearch <ExternalLink size={10} />
            </a>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-muted)]">
            <X size={15} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="p-5">
          {isLoading ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Loading record…</p>
          ) : !record || importableFacts.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No importable facts found on this record. You can still view it on FamilySearch and update this person manually.
            </p>
          ) : (
            <>
              <p className="mb-4 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Nothing is imported automatically. Check only the facts you&rsquo;ve verified are correct for this
                person — each one you import will cite this FamilySearch record as its source.
              </p>
              <div className="space-y-2">
                {importableFacts.map((fact, idx) => (
                  <label key={idx}
                    className="flex cursor-pointer items-start gap-3 rounded-xl p-3"
                    style={{ border: '1px solid var(--border-default)' }}>
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked.has(idx)}
                      onChange={(e) => {
                        const next = new Set(checked);
                        if (e.target.checked) next.add(idx); else next.delete(idx);
                        setChecked(next);
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {FACT_TYPE_MAP[fact.type] ?? fact.type}: {fact.year}
                      </p>
                      {fact.place && (
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-faint)' }}>
                          FamilySearch place: {fact.place} (not imported — add manually if correct)
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 border-t px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || isLoading}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--accent-primary)' }}
          >
            {importMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {checked.size > 0 ? `Import ${checked.size} selected` : 'Mark as reviewed'}
          </button>
          <button onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-medium"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
