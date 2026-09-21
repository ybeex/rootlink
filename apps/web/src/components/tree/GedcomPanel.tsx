'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Upload, Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '../../lib/api-client';

interface GedcomPanelProps {
  treeId: string;
  open:   boolean;
  onClose: () => void;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export function GedcomPanel({ treeId, open, onClose }: GedcomPanelProps) {
  const queryClient  = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg]       = useState<string>('');
  const [acknowledgedDuplicateRisk, setAcknowledgedDuplicateRisk] = useState(false);

  // Export
  const exportMutation = useMutation({
    mutationFn: () =>
      api.post<{ message: string; requestId: string }>(`/v1/trees/${treeId}/gedcom/export`, {}),
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Export failed.');
    },
  });

  // Import: upload file to S3 then trigger import job
  const uploadAndImport = useCallback(async (file: File) => {
    setUploadState('uploading');
    setErrorMsg('');

    try {
      // Get a presigned URL for the GEDCOM file (treated as a document)
      const { uploadUrl, storageKey } = await api.post<{
        assetId: string; uploadUrl: string; storageKey: string;
      }>(`/v1/trees/${treeId}/media/upload-url`, {
        mimeType:      'text/plain',
        fileSizeBytes: file.size,
        filename:      file.name,
        metadata:      { type: 'document' },
      });

      // Upload directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'text/plain' },
      });

      if (!uploadRes.ok) throw new Error('Upload to storage failed.');

      setUploadState('processing');

      // Trigger import job
      await api.post(`/v1/trees/${treeId}/gedcom/import`, { storageKey });

      setUploadState('done');
      setAcknowledgedDuplicateRisk(false); // require re-confirming for the next import, if any
      void queryClient.invalidateQueries({ queryKey: ['persons', treeId] });
      void queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
      toast.success('GEDCOM import started. You will be notified when complete.');
    } catch (err) {
      setUploadState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Import failed.');
    }
  }, [treeId, queryClient]);

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (file) void uploadAndImport(file);
  }, [uploadAndImport]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.ged', '.gedcom'], 'application/octet-stream': ['.ged', '.gedcom'] },
    maxFiles: 1,
    disabled: uploadState === 'uploading' || uploadState === 'processing' || !acknowledgedDuplicateRisk,
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
            className="w-full max-w-lg overflow-hidden rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h2 className="text-base font-semibold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Import / Export GEDCOM
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  GEDCOM 5.5.1 format
                </p>
              </div>
              <button onClick={onClose}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-muted)]">
                <X size={15} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Export */}
              <div className="rounded-xl p-4"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                <div className="mb-3 flex items-center gap-2">
                  <Download size={15} style={{ color: 'var(--text-secondary)' }} />
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Export tree as GEDCOM
                  </h3>
                </div>
                <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Export all persons, events, and relationships. A download link will be sent via notification when ready.
                </p>
                <button
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: 'var(--accent-primary)' }}>
                  {exportMutation.isPending
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Download size={13} />}
                  Request Export
                </button>
              </div>

              {/* Import */}
              <div className="rounded-xl p-4"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                <div className="mb-3 flex items-center gap-2">
                  <Upload size={15} style={{ color: 'var(--text-secondary)' }} />
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Import from GEDCOM file
                  </h3>
                </div>
                <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Upload a .ged file from Ancestry, MyHeritage, FamilySearch, or any GEDCOM-compatible app.
                </p>
                <div className="mb-3 rounded-lg p-3 text-xs leading-relaxed"
                  style={{ background: 'var(--accent-ember-soft)', color: 'var(--accent-ember)' }}>
                  <strong>Existing persons are never matched or overwritten automatically</strong> — everyone
                  in the file is imported as a new person, even if they already exist in this tree. After
                  import, likely duplicates are flagged for you to review and merge under Research Hints —
                  but review them before assuming the tree is clean.
                </div>
                <label className="mb-3 flex cursor-pointer items-start gap-2 text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={acknowledgedDuplicateRisk}
                    onChange={(e) => setAcknowledgedDuplicateRisk(e.target.checked)}
                    className="mt-0.5"
                  />
                  I understand this may create duplicate people and I&rsquo;ll review the flagged matches
                  afterward.
                </label>

                {uploadState === 'idle' || uploadState === 'error' ? (
                  <div
                    {...getRootProps()}
                    className="rounded-xl border-2 border-dashed py-8 text-center transition-colors"
                    style={{
                      cursor: acknowledgedDuplicateRisk ? 'pointer' : 'not-allowed',
                      opacity: acknowledgedDuplicateRisk ? 1 : 0.5,
                      borderColor: isDragActive ? 'var(--accent-ember)' : 'var(--border-default)',
                      background:  isDragActive ? 'var(--accent-ember-soft)' : 'var(--bg-surface)',
                    }}>
                    <input {...getInputProps()} />
                    <FileText size={24} className="mx-auto mb-2"
                      style={{ color: isDragActive ? 'var(--accent-ember)' : 'var(--text-faint)' }} />
                    <p className="text-sm" style={{ color: isDragActive ? 'var(--accent-ember)' : 'var(--text-muted)' }}>
                      {acknowledgedDuplicateRisk
                        ? (isDragActive ? 'Drop .ged file here' : 'Drag & drop a .ged file, or click to browse')
                        : 'Check the box above to enable upload'}
                    </p>
                    {uploadState === 'error' && (
                      <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>{errorMsg}</p>
                    )}
                  </div>
                ) : uploadState === 'uploading' ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl py-8"
                    style={{ background: 'var(--bg-surface)' }}>
                    <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Uploading file…</span>
                  </div>
                ) : uploadState === 'processing' ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl py-8"
                    style={{ background: 'var(--bg-surface)' }}>
                    <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Import queued…</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 rounded-xl py-8"
                    style={{ background: 'var(--bg-surface)' }}>
                    <CheckCircle2 size={24} style={{ color: '#4a7c59' }} />
                    <p className="text-sm font-medium" style={{ color: '#4a7c59' }}>Import started</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      You will receive a notification when complete.
                    </p>
                    <button onClick={() => setUploadState('idle')}
                      className="mt-2 text-xs underline" style={{ color: 'var(--text-muted)' }}>
                      Import another file
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
