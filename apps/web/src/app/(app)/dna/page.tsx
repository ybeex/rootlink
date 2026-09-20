'use client';

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Loader2, CheckCircle2, XCircle, Trash2, ChevronRight,
  Info, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '../../../lib/api-client';
import type { User, DnaKit, DnaProvider } from '@rootlink/shared';
import { EmptyState } from '../../../components/ui/EmptyState';
import { DnaNavIcon } from '../../../components/brand/icons';

const PROVIDER_LABEL: Record<DnaProvider, string> = {
  ancestrydna: 'AncestryDNA',
  '23andme':   '23andMe',
  myheritage:  'MyHeritage',
  ftdna:       'FamilyTreeDNA',
  other:       'Other',
};

const STATUS_STYLE: Record<DnaKit['status'], { bg: string; text: string; label: string }> = {
  processing: { bg: 'var(--bg-subtle)',        text: 'var(--text-muted)',   label: 'Processing' },
  ready:      { bg: 'rgba(74,124,89,0.12)',    text: '#4a7c59',             label: 'Ready' },
  failed:     { bg: 'rgba(227,50,9,0.10)',     text: 'var(--danger)',             label: 'Failed' },
};

function dt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

type UploadState = 'idle' | 'uploading' | 'confirming' | 'error';

export default function DnaPage() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    // Same queryKey the app layout uses for the current user — this reuses
    // that cached fetch rather than issuing a second one.
    queryKey: ['me'],
    queryFn:  () => api.get<User>('/v1/users/me'),
  });

  const isPro = user?.subscriptionTier === 'pro';

  const { data: kits, isLoading } = useQuery({
    queryKey: ['dna', 'kits'],
    queryFn:  () => api.get<DnaKit[]>('/v1/dna/kits'),
    enabled:  isPro,
    // Kits sit in 'processing' while the worker parses the raw file and
    // runs matching against every other ready kit — a real file can take
    // a while, so poll rather than require a manual refresh. Stops polling
    // once nothing is mid-processing.
    refetchInterval: (query) => {
      const data = query.state.data as DnaKit[] | undefined;
      return data?.some((k) => k.status === 'processing') ? 4000 : false;
    },
  });

  const [label, setLabel]       = useState('');
  const [provider, setProvider] = useState<DnaProvider>('ancestrydna');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg]       = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const uploadKit = useCallback(async (file: File) => {
    if (!label.trim()) {
      toast.error('Give this kit a label first — e.g. "My AncestryDNA kit".');
      return;
    }

    setUploadState('uploading');
    setErrorMsg('');

    try {
      const { kitId, uploadUrl } = await api.post<{
        kitId: string; uploadUrl: string; storageKey: string;
      }>('/v1/dna/kits/upload-url', {
        label: label.trim(),
        provider,
        fileSizeBytes: file.size,
      });

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'text/plain' },
      });
      if (!uploadRes.ok) throw new Error('Upload to storage failed.');

      setUploadState('confirming');
      await api.post(`/v1/dna/kits/${kitId}/confirm`, {});

      setUploadState('idle');
      setLabel('');
      void queryClient.invalidateQueries({ queryKey: ['dna', 'kits'] });
      toast.success('Kit uploaded — processing now. This can take a few minutes for a full raw export.');
    } catch (err) {
      setUploadState('error');
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Upload failed.');
    }
  }, [label, provider, queryClient]);

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (file) void uploadKit(file);
  }, [uploadKit]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain':               ['.txt', '.csv'],
      'application/octet-stream': ['.txt', '.csv'],
    },
    maxFiles: 1,
    disabled: uploadState === 'uploading' || uploadState === 'confirming',
  });

  const deleteMutation = useMutation({
    mutationFn: (kitId: string) => api.delete(`/v1/dna/kits/${kitId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dna', 'kits'] });
      toast.success('Kit deleted.');
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to delete kit.');
    },
  });

  // ── Non-Pro users: never rely on the API's 403 alone — show an upgrade
  //    prompt so this isn't a dead end. (Continuation plan §2.1 item 4.)
  if (user && !isPro) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'var(--accent-ember-soft)' }}
        >
          <Lock size={26} style={{ color: 'var(--accent-ember)' }} />
        </div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          DNA matching is a Pro feature
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Upload a raw DNA export from AncestryDNA, 23andMe, MyHeritage, or FamilyTreeDNA and find genetic
          matches with other RootLink members. Upgrade to Pro to unlock it.
        </p>
        <Link href="/settings" className="btn btn-primary mt-6 inline-block px-5 py-2.5 text-sm">
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            DNA Matching
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Upload a raw data export to find genetic matches with other RootLink members.
          </p>
        </div>
        <button
          onClick={() => setShowHowItWorks(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--bg-subtle)]"
          style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
        >
          <Info size={13} />
          How this works
        </button>
      </div>

      {/* Upload panel */}
      <div
        className="mb-8 rounded-2xl p-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Upload size={15} style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Upload a new kit
          </h2>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='Label — e.g. "My AncestryDNA kit"'
            disabled={uploadState === 'uploading' || uploadState === 'confirming'}
            className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          />
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as DnaProvider)}
            disabled={uploadState === 'uploading' || uploadState === 'confirming'}
            className="rounded-xl px-3.5 py-2.5 text-sm outline-none sm:w-52"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          >
            {(Object.keys(PROVIDER_LABEL) as DnaProvider[]).map((p) => (
              <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>
            ))}
          </select>
        </div>

        {uploadState === 'idle' || uploadState === 'error' ? (
          <div
            {...getRootProps()}
            className="cursor-pointer rounded-xl border-2 border-dashed py-8 text-center transition-colors"
            style={{
              borderColor: isDragActive ? 'var(--accent-ember)' : 'var(--border-default)',
              background:  isDragActive ? 'var(--accent-ember-soft)' : 'var(--bg-subtle)',
            }}
          >
            <input {...getInputProps()} />
            <DnaNavIcon size={22} className="mx-auto mb-2"
              color={isDragActive ? 'var(--accent-ember)' : 'var(--text-faint)'} />
            <p className="text-sm" style={{ color: isDragActive ? 'var(--accent-ember)' : 'var(--text-muted)' }}>
              {isDragActive ? 'Drop the raw data file here' : 'Drag & drop your raw data export (.txt/.csv), or click to browse'}
            </p>
            {uploadState === 'error' && (
              <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>{errorMsg}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-xl py-8"
            style={{ background: 'var(--bg-subtle)' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {uploadState === 'uploading' ? 'Uploading file…' : 'Confirming upload…'}
            </span>
          </div>
        )}
      </div>

      {/* Kit list */}
      {isLoading ? (
        <div className="py-16 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Loading kits…</div>
      ) : !kits || kits.length === 0 ? (
        <EmptyState variant="dna" />
      ) : (
        <div className="space-y-3">
          {kits.map((kit) => {
            const style = STATUS_STYLE[kit.status];
            const clickable = kit.status === 'ready';
            const cardStyle: React.CSSProperties = {
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              cursor: clickable ? 'pointer' : 'default',
            };
            const cardContent = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {kit.label}
                    </p>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium"
                      style={{ background: style.bg, color: style.text }}
                    >
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {PROVIDER_LABEL[kit.provider]} · Uploaded {dt(kit.uploadedAt)}
                    {kit.snpCount ? ` · ${kit.snpCount.toLocaleString()} SNPs` : ''}
                  </p>
                  {kit.status === 'failed' && kit.processingError && (
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>{kit.processingError}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {kit.status === 'processing' && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-faint)' }} />}
                  {kit.status === 'ready' && <CheckCircle2 size={16} style={{ color: '#4a7c59' }} />}
                  {kit.status === 'failed' && <XCircle size={16} style={{ color: 'var(--danger)' }} />}
                  <button
                    onClick={(e) => { e.preventDefault(); deleteMutation.mutate(kit.id); }}
                    disabled={deleteMutation.isPending}
                    aria-label={`Delete ${kit.label}`}
                    className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-muted)]"
                  >
                    <Trash2 size={14} style={{ color: 'var(--text-faint)' }} />
                  </button>
                  {clickable && <ChevronRight size={16} style={{ color: 'var(--text-faint)' }} />}
                </div>
              </>
            );

            return clickable ? (
              <Link
                key={kit.id}
                href={`/dna/${kit.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl p-4 transition-colors"
                style={cardStyle}
              >
                {cardContent}
              </Link>
            ) : (
              <div
                key={kit.id}
                className="flex items-center justify-between gap-4 rounded-2xl p-4 transition-colors"
                style={cardStyle}
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      )}

      <HowThisWorksPanel open={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  );
}

// ── "How this works" disclosure panel ───────────────────────────────────────
//
// Not optional polish — the matching algorithm's real limitation (identical-
// by-state segment detection, not phased identical-by-descent matching the
// way GEDmatch/Ancestry do) has to reach the end user, not stay in a code
// comment. Same honesty standard as the PRD's non-goal about never
// presenting external record matches as verified fact.
function HowThisWorksPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
              <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                How DNA matching works
              </h2>
            </div>

            <div className="space-y-4 p-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <p>
                When you upload a raw data file, RootLink compares your genotype against every other
                processed kit and looks for stretches of DNA you share in common — measured in
                centimorgans (cM), the standard unit genetic genealogists use.
              </p>
              <p>
                Shared segments are used to estimate a likely relationship (e.g. "1st–2nd cousin"),
                based on published shared-cM statistics. These are ranges, not certainties — many
                different relationships can produce a similar amount of shared DNA.
              </p>
              <div
                className="rounded-xl p-3.5 text-xs leading-relaxed"
                style={{ background: 'var(--accent-ember-soft)', color: 'var(--accent-ember)' }}
              >
                <strong>A real limitation, not a footnote:</strong> this matching does not phase your
                DNA into maternal/paternal strands the way GEDmatch or Ancestry do. It detects
                identical stretches directly, which is simpler but will occasionally overcall short
                segments (typically well under 15 cM) as shared when they aren't truly inherited from
                a common ancestor. Longer segments and closer relationships are much more reliable than
                short, distant-looking ones.
              </div>
              <p>
                Treat matches — especially small ones — as a lead to investigate against your family
                tree, not as confirmed proof of a relationship.
              </p>
            </div>

            <div className="border-t px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
              <button onClick={onClose} className="btn btn-primary w-full py-2.5 text-sm">Got it</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
