'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, Check, Link2, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api-client';

interface ShareTreeModalProps {
  treeId:     string;
  treeName:   string;
  shareToken: string | null;
  open:       boolean;
  onClose:    () => void;
}

export function ShareTreeModal({ treeId, treeName, shareToken, open, onClose }: ShareTreeModalProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://rootlink.app';
  const shareUrl = shareToken ? `${appUrl}/shared?token=${shareToken}` : null;

  const generateMutation = useMutation({
    mutationFn: () => api.post<{ shareToken: string }>(`/v1/trees/${treeId}/share-token`, {}),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['tree', treeId] }),
    onError:    () => toast.error('Failed to generate share link.'),
  });

  const revokeMutation = useMutation({
    mutationFn: () => api.delete(`/v1/trees/${treeId}/share-token`),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
      toast.success('Share link revoked.');
    },
    onError: () => toast.error('Failed to revoke share link.'),
  });

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

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
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md overflow-hidden rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: 'var(--border-subtle)' }}>
              <h2 className="text-base font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                Share Tree
              </h2>
              <button onClick={onClose}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-muted)]">
                <X size={15} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="p-5">
              <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>
                Anyone with this link can view <strong>{treeName}</strong> (read-only).
                Living persons are automatically hidden.
              </p>

              {shareUrl ? (
                <div className="space-y-3">
                  {/* Link display + copy */}
                  <div className="flex items-center gap-2 rounded-xl p-3"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                    <Link2 size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                    <p className="min-w-0 flex-1 truncate font-mono text-xs"
                      style={{ color: 'var(--text-secondary)' }}>
                      {shareUrl}
                    </p>
                    <button
                      onClick={() => void copyToClipboard()}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                      style={{
                        background: copied ? 'rgba(74,124,89,0.12)' : 'var(--accent-primary)',
                        color:      copied ? '#4a7c59' : 'white',
                      }}>
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Revoke */}
                  <button
                    onClick={() => revokeMutation.mutate()}
                    disabled={revokeMutation.isPending}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors"
                    style={{ color: 'var(--danger)' }}>
                    {revokeMutation.isPending
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} />}
                    Revoke link
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white"
                  style={{ background: 'var(--accent-primary)' }}>
                  {generateMutation.isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Link2 size={14} />}
                  Generate Share Link
                </button>
              )}

              <p className="mt-4 text-xs" style={{ color: 'var(--text-faint)' }}>
                You can revoke this link at any time. Existing viewers will immediately lose access.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
