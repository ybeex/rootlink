'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, FileText, Music, Video, X, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '../../../lib/api-client';
import type { Tree, MediaAsset } from '@rootlink/shared';
import { ALLOWED_MIME_TYPES } from '@rootlink/shared';

interface TreeWithRole extends Tree { role: string }

const MEDIA_TYPE_ICONS = {
  photo:    Image,
  document: FileText,
  audio:    Music,
  video:    Video,
} as const;

const ALL_ALLOWED = [
  ...ALLOWED_MIME_TYPES.photo,
  ...ALLOWED_MIME_TYPES.document,
  ...ALLOWED_MIME_TYPES.audio,
  ...ALLOWED_MIME_TYPES.video,
];

function detectType(mimeType: string): string {
  if ((ALLOWED_MIME_TYPES.photo    as readonly string[]).includes(mimeType)) return 'photo';
  if ((ALLOWED_MIME_TYPES.document as readonly string[]).includes(mimeType)) return 'document';
  if ((ALLOWED_MIME_TYPES.audio    as readonly string[]).includes(mimeType)) return 'audio';
  if ((ALLOWED_MIME_TYPES.video    as readonly string[]).includes(mimeType)) return 'video';
  return 'document';
}

export default function MediaPage() {
  const queryClient        = useQueryClient();
  const [activeTid, setActiveTid] = useState<string>('');
  const [uploading, setUploading] = useState<string[]>([]);
  const [lightbox, setLightbox]   = useState<(MediaAsset & { url: string }) | null>(null);
  const [filter, setFilter]       = useState<string>('all');

  const { data: trees } = useQuery({
    queryKey: ['trees'],
    queryFn: () => api.get<TreeWithRole[]>('/v1/trees'),
  });

  // Set default tree after load
  useEffect(() => {
    if (!activeTid && trees?.[0]) setActiveTid(trees[0].id);
  }, [trees, activeTid]);

  const treeId = activeTid || trees?.[0]?.id || '';

  const { data: mediaData, isLoading } = useQuery({
    queryKey: ['media', treeId, filter],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: '60' });
      if (filter !== 'all') params.set('type', filter);
      return api.get<{ data: (MediaAsset & { url: string; thumbnailUrl: string | null })[] }>(
        `/v1/trees/${treeId}/media?${params.toString()}`,
      );
    },
    enabled: !!treeId,
  });

  const assets = mediaData?.data ?? [];

  const uploadFile = useCallback(async (file: File) => {
    if (!treeId) return;
    const tempId = crypto.randomUUID();
    setUploading((prev) => [...prev, tempId]);

    try {
      const { assetId, uploadUrl } = await api.post<{
        assetId: string; uploadUrl: string; storageKey: string;
      }>(`/v1/trees/${treeId}/media/upload-url`, {
        mimeType:      file.type,
        fileSizeBytes: file.size,
        filename:      file.name,
        metadata:      { type: detectType(file.type) },
      });

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) throw new Error('Upload to storage failed');

      await api.post(`/v1/trees/${treeId}/media/confirm-upload`, { assetId });
      await queryClient.invalidateQueries({ queryKey: ['media', treeId] });
      toast.success(`${file.name} uploaded.`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : `Failed to upload ${file.name}.`);
    } finally {
      setUploading((prev) => prev.filter((id) => id !== tempId));
    }
  }, [treeId, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (assetId: string) => api.delete(`/v1/trees/${treeId}/media/${assetId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['media', treeId] });
      setLightbox(null);
      toast.success('Media deleted.');
    },
    onError: () => toast.error('Failed to delete media.'),
  });

  const onDrop = useCallback((accepted: File[]) => {
    accepted.forEach((f) => void uploadFile(f));
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(ALL_ALLOWED.map((m) => [m, []])),
    maxFiles: 10,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Media
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Photos, documents, audio, and video for your family tree.
          </p>
        </div>

        {trees && trees.length > 1 && (
          <div className="relative">
            <select value={activeTid} onChange={(e) => setActiveTid(e.target.value)}
              className="appearance-none rounded-xl py-2 pl-3 pr-8 text-sm outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              {trees.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-faint)' }} />
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div {...getRootProps()}
        className="mb-6 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors"
        style={{
          borderColor: isDragActive ? 'var(--accent-ember)' : 'var(--border-default)',
          background:  isDragActive ? 'var(--accent-ember-soft)' : 'var(--bg-surface)',
        }}>
        <input {...getInputProps()} />
        <Upload size={28} className="mx-auto mb-3"
          style={{ color: isDragActive ? 'var(--accent-ember)' : 'var(--text-faint)' }} />
        <p className="text-sm font-medium"
          style={{ color: isDragActive ? 'var(--accent-ember)' : 'var(--text-secondary)' }}>
          {isDragActive ? 'Drop files here' : 'Drag & drop photos, documents, audio, or video'}
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
          or click to browse — up to 10 files at once
        </p>
      </div>

      {uploading.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
          <Loader2 size={14} className="animate-spin" />
          Uploading {uploading.length} file{uploading.length > 1 ? 's' : ''}…
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-subtle)' }}>
        {['all', 'photo', 'document', 'audio', 'video'].map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className="flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-colors"
            style={{
              background: filter === t ? 'var(--bg-surface)' : 'transparent',
              color:      filter === t ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow:  filter === t ? 'var(--shadow-xs)' : 'none',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Gallery */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="shimmer aspect-square rounded-xl" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="py-16 text-center">
          <ImageIcon size={32} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No media yet. Drop files above to add your first item.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {assets.map((asset, i) => {
            const Icon = MEDIA_TYPE_ICONS[asset.type] ?? Image;
            return (
              <motion.div key={asset.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}>
                <button onClick={() => setLightbox(asset)}
                  className="group relative aspect-square w-full overflow-hidden rounded-xl transition-all"
                  style={{ background: 'var(--bg-subtle)' }}>
                  {asset.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.thumbnailUrl} alt={asset.caption ?? asset.filename}
                      className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
                      <Icon size={24} style={{ color: 'var(--text-faint)' }} />
                      <span className="line-clamp-2 px-2 text-center text-2xs leading-tight"
                        style={{ color: 'var(--text-faint)' }}>
                        {asset.filename}
                      </span>
                    </div>
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-2xs font-medium capitalize opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                    {asset.type}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            onClick={() => setLightbox(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl"
              style={{ background: 'var(--bg-surface)' }}
              onClick={(e) => e.stopPropagation()}>
              {lightbox.type === 'photo' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lightbox.url} alt={lightbox.caption ?? lightbox.filename}
                  className="max-h-[70vh] w-full object-contain" />
              )}
              <div className="p-4">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {lightbox.caption ?? lightbox.filename}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {lightbox.type} · {(lightbox.sizeBytes / 1024 / 1024).toFixed(1)} MB ·{' '}
                  {new Date(lightbox.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <a href={lightbox.url} download={lightbox.filename}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                    Download
                  </a>
                  <button onClick={() => deleteMutation.mutate(lightbox.id)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                    style={{ background: 'rgba(227,50,9,0.08)', color: '#e33209' }}>
                    {deleteMutation.isPending && <Loader2 size={11} className="animate-spin" />}
                    Delete
                  </button>
                </div>
              </div>
              <button onClick={() => setLightbox(null)}
                className="absolute right-3 top-3 rounded-lg p-1.5"
                style={{ background: 'rgba(0,0,0,0.4)', color: 'white' }}>
                <X size={15} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
