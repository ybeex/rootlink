'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { GitMerge, ArrowRight, Loader2, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '../../../../lib/api-client';
import type { MergePreview } from '@rootlink/shared';

export default function MergePersonsPage() {
  const { treeId } = useParams<{ treeId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const keepId = searchParams.get('keep');
  const removeId = searchParams.get('remove');
  const hintId = searchParams.get('hintId');

  const { data: preview, isLoading, error } = useQuery({
    queryKey: ['mergePreview', treeId, keepId, removeId],
    queryFn: () => api.get<MergePreview>(
      `/v1/trees/${treeId}/persons/merge-preview?keep=${keepId}&remove=${removeId}`,
    ),
    enabled: !!keepId && !!removeId,
  });

  const mergeMutation = useMutation({
    mutationFn: () => api.post(`/v1/trees/${treeId}/persons/merge`, { keepId, removeId }),
    onSuccess: async () => {
      toast.success('Merged.');
      // Resolve the duplicate-hint that led here, if any — only now that
      // the merge has actually happened, not the moment the user clicked
      // through to review it (see HintsPanel.tsx's HintCard).
      if (hintId) {
        try {
          await api.patch(`/v1/trees/${treeId}/hints/${hintId}`, { status: 'accepted' });
        } catch {
          // Non-fatal — the merge itself already succeeded; a stale
          // pending hint for an already-merged pair is a minor cosmetic
          // leftover, not a data-integrity problem.
        }
      }
      router.push(`/trees/${treeId}/persons/${keepId}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Merge failed.');
    },
  });

  if (!keepId || !removeId) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Missing person IDs to merge.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--text-primary)]"
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronLeft size={15} />
        Back
      </button>

      <div className="mb-6 flex items-center gap-2">
        <GitMerge size={20} style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Merge duplicate people
        </h1>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Loading…</div>
      ) : error || !preview ? (
        <div className="py-16 text-center text-sm" style={{ color: '#e33209' }}>
          {error instanceof ApiClientError ? error.message : 'Could not load merge preview.'}
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-center gap-4 rounded-2xl p-5"
            style={{ background: 'var(--bg-subtle)' }}>
            <div className="text-center">
              <p className="text-2xs uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Keep</p>
              <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{preview.keep.displayName}</p>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--text-faint)' }} />
            <div className="text-center">
              <p className="text-2xs uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Merge away</p>
              <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{preview.remove.displayName}</p>
            </div>
          </div>

          <button
            onClick={() => {
              const params = new URLSearchParams({ keep: removeId!, remove: keepId! });
              if (hintId) params.set('hintId', hintId);
              router.replace(`/trees/${treeId}/merge?${params.toString()}`);
            }}
            className="mb-6 -mt-3 text-xs font-medium underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            Wrong direction? Keep {preview.remove.displayName} instead
          </button>

          <div className="mb-6 rounded-2xl p-5 text-sm leading-relaxed"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <p className="mb-3 font-medium" style={{ color: 'var(--text-primary)' }}>What this will do:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>{preview.remove.displayName}</strong> will be removed (soft-deleted — recoverable, same as
                any other person deletion), and <strong>{preview.keep.displayName}</strong> will remain.
              </li>
              <li>{preview.relationshipsToMove} relationship{preview.relationshipsToMove === 1 ? '' : 's'} will be moved onto {preview.keep.displayName}.</li>
              <li>{preview.eventsToMove} vital event{preview.eventsToMove === 1 ? '' : 's'} will be moved onto {preview.keep.displayName}.</li>
              <li>{preview.mediaTagsToMove} media tag{preview.mediaTagsToMove === 1 ? '' : 's'} will be re-pointed.</li>
              {preview.fieldsFilledFromRemoved.length > 0 ? (
                <li>
                  {preview.keep.displayName}&rsquo;s blank {preview.fieldsFilledFromRemoved.join(', ')} field
                  {preview.fieldsFilledFromRemoved.length === 1 ? '' : 's'} will be filled in from {preview.remove.displayName}.
                </li>
              ) : null}
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => mergeMutation.mutate()}
              disabled={mergeMutation.isPending}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--accent-primary)' }}
            >
              {mergeMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Merge
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-xl px-5 py-2.5 text-sm font-medium"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
