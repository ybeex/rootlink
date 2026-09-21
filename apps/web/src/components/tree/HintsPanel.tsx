'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Check, X as Reject, ExternalLink, Lightbulb, Loader2, Zap, GitMerge, Search } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { api } from '../../lib/api-client';
import type { ResearchHint } from '@rootlink/shared';
import { FamilySearchReviewModal } from '../person/FamilySearchReviewModal';

interface HintsPanelProps {
  treeId: string;
  open:   boolean;
  onClose: () => void;
}

export function HintsPanel({ treeId, open, onClose }: HintsPanelProps) {
  const queryClient = useQueryClient();
  const [reviewingHint, setReviewingHint] = useState<ResearchHint | null>(null);
  const reduceMotion = useReducedMotion();

  const { data, isLoading } = useQuery({
    queryKey: ['hints', treeId],
    queryFn: () =>
      api.get<{ data: ResearchHint[] }>(`/v1/trees/${treeId}/hints?status=pending&pageSize=20`),
    enabled: !!treeId && open,
    select: (d) => d.data,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ hintId, status }: { hintId: string; status: 'accepted' | 'rejected' }) =>
      api.patch(`/v1/trees/${treeId}/hints/${hintId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hints', treeId] });
    },
    onError: () => toast.error('Failed to update hint.'),
  });

  const hints = data ?? [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: reduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduceMotion ? 0 : 20 }}
          transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 400, damping: 38 }}
          className="absolute right-0 top-0 z-20 h-full w-88 overflow-hidden"
          style={{
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-lg)',
          }}>

          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between border-b px-5 py-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Lightbulb size={15} style={{ color: 'var(--accent-ember)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Research Hints
              </span>
              {hints.length > 0 && (
                <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: 'var(--accent-ember-soft)', color: 'var(--accent-ember)' }}>
                  {hints.length}
                </span>
              )}
            </div>
            <button onClick={onClose}
              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-muted)]">
              <X size={15} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 57px)' }}>
            {isLoading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl p-4"
                    style={{ background: 'var(--bg-subtle)' }}>
                    <div className="shimmer mb-2 h-4 w-3/4 rounded" />
                    <div className="shimmer h-3 w-full rounded" />
                    <div className="shimmer mt-2 h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            ) : hints.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-5 py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: 'var(--bg-subtle)' }}>
                  <Zap size={24} style={{ color: 'var(--text-faint)' }} />
                </div>
                <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No pending research hints. Add more people to your tree to trigger suggestions.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-5">
                {hints.map((hint) => (
                  <HintCard
                    key={hint.id}
                    hint={hint}
                    treeId={treeId}
                    onAccept={() => reviewMutation.mutate({ hintId: hint.id, status: 'accepted' })}
                    onReject={() => reviewMutation.mutate({ hintId: hint.id, status: 'rejected' })}
                    onReview={() => setReviewingHint(hint)}
                    isUpdating={reviewMutation.isPending && reviewMutation.variables?.hintId === hint.id}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {reviewingHint && (
        <FamilySearchReviewModal
          treeId={treeId}
          personId={reviewingHint.personId}
          hint={reviewingHint}
          onClose={() => setReviewingHint(null)}
        />
      )}
    </AnimatePresence>
  );
}

function HintCard({
  hint, treeId, onAccept, onReject, onReview, isUpdating,
}: {
  hint:       ResearchHint;
  treeId:     string;
  onAccept:   () => void;
  onReject:   () => void;
  onReview:   () => void;
  isUpdating: boolean;
}) {
  const confidencePct = Math.round(hint.confidence * 100);
  const confColor     = hint.confidence >= 0.7 ? '#4a7c59' : hint.confidence >= 0.4 ? '#c79a4a' : 'var(--text-muted)';
  const isDuplicateHint = hint.provider === 'duplicate_detection';
  const isFamilySearchHint = hint.provider === 'familysearch';

  return (
    <div className="rounded-xl p-4 transition-all"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
      {/* Provider + confidence */}
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full px-2 py-0.5 text-2xs font-medium"
          style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
          {isDuplicateHint ? 'possible duplicate' : isFamilySearchHint ? 'FamilySearch' : hint.provider}
        </span>
        <span className="text-xs font-medium" style={{ color: confColor }}>
          {confidencePct}% match
        </span>
      </div>

      {/* Title */}
      <p className="mb-1 text-sm font-medium leading-snug"
        style={{ color: 'var(--text-primary)' }}>
        {hint.title}
      </p>

      {/* Description */}
      <p className="mb-3 text-xs leading-relaxed"
        style={{ color: 'var(--text-muted)' }}>
        {hint.description}
      </p>

      {/* Confidence bar */}
      <div className="mb-3 h-1 overflow-hidden rounded-full"
        style={{ background: 'var(--bg-muted)' }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${confidencePct}%`, background: confColor }} />
      </div>

      {/* Actions */}
      {isDuplicateHint ? (
        // A duplicate hint's "accept" can't just PATCH status=accepted like
        // a normal research hint — that would mark it reviewed with zero
        // actual effect (nothing gets merged). It has to route through the
        // merge preview/confirm flow instead; the hint itself only gets
        // marked accepted once a merge actually completes (see the merge
        // page, which the user reaches from here).
        <div className="flex items-center gap-2">
          <Link
            href={`/trees/${treeId}/merge?keep=${hint.externalRecordId}&remove=${hint.personId}&hintId=${hint.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors"
            style={{ background: 'rgba(74,124,89,0.12)', color: '#4a7c59' }}>
            <GitMerge size={11} />
            Review merge
          </Link>
          <button
            onClick={onReject}
            disabled={isUpdating}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors"
            style={{ background: 'rgba(127,140,141,0.10)', color: 'var(--text-muted)' }}>
            {isUpdating ? <Loader2 size={11} className="animate-spin" /> : <Reject size={11} />}
            Not a duplicate
          </button>
        </div>
      ) : isFamilySearchHint ? (
        // Opens the field-by-field review modal instead of a plain
        // accept/reject — accepting a FamilySearch hint always means
        // choosing which specific facts to import, never a bulk copy. The
        // hint is marked accepted by that modal once an import (or an
        // explicit "mark as reviewed" with nothing selected) completes.
        <div className="flex items-center gap-2">
          <button
            onClick={onReview}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors"
            style={{ background: 'rgba(74,124,89,0.12)', color: '#4a7c59' }}>
            <Search size={11} />
            Review match
          </button>
          <button
            onClick={onReject}
            disabled={isUpdating}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors"
            style={{ background: 'rgba(127,140,141,0.10)', color: 'var(--text-muted)' }}>
            {isUpdating ? <Loader2 size={11} className="animate-spin" /> : <Reject size={11} />}
            Not a match
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={onAccept}
            disabled={isUpdating}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors"
            style={{ background: 'rgba(74,124,89,0.12)', color: '#4a7c59' }}>
            {isUpdating ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Accept
          </button>
          <button
            onClick={onReject}
            disabled={isUpdating}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors"
            style={{ background: 'rgba(127,140,141,0.10)', color: 'var(--text-muted)' }}>
            {isUpdating ? <Loader2 size={11} className="animate-spin" /> : <Reject size={11} />}
            Dismiss
          </button>
          {hint.recordUrl && (
            <a href={hint.recordUrl} target="_blank" rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-muted)]"
              style={{ color: 'var(--text-faint)' }}>
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
