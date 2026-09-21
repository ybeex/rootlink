'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ChevronLeft, Download, Upload, Loader2, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { api, ApiClientError } from '../../../../../lib/api-client';
import { InviteMemberModal } from '../../../../../components/tree/InviteMemberModal';
import type { Tree } from '@rootlink/shared';

// GedcomPanel imports the GEDCOM parser — defer it so the settings
// shell renders immediately without waiting for the parser bundle
const GedcomPanel = dynamic(
  () => import('../../../../../components/tree/GedcomPanel').then(m => ({ default: m.GedcomPanel })),
  { ssr: false, loading: () => null }
);
import { updateTreeSchema, type UpdateTreeInput } from '@rootlink/shared';
import { zodResolver } from '@hookform/resolvers/zod';

interface Props { params: Promise<{ treeId: string }> }

export default function TreeSettingsPage({ params }: Props) {
  const { treeId } = use(params);
  const router     = useRouter();
  const qc         = useQueryClient();

  const [showGedcom, setShowGedcom]     = useState(false);
  const [showInvite, setShowInvite]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');

  const { data: tree } = useQuery({
    queryKey: ['tree', treeId],
    queryFn: () => api.get<Tree>(`/v1/trees/${treeId}`),
  });

  const form = useForm<UpdateTreeInput>({
    resolver: zodResolver(updateTreeSchema),
    values: {
      name:         tree?.name ?? '',
      description:  tree?.description ?? null,
      privacyLevel: tree?.privacyLevel ?? 'family',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTreeInput) => api.patch<Tree>(`/v1/trees/${treeId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tree', treeId] });
      qc.invalidateQueries({ queryKey: ['trees'] });
      toast.success('Tree updated.');
    },
    onError: () => toast.error('Failed to update tree.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/v1/trees/${treeId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trees'] });
      toast.success('Tree deleted.');
      router.replace('/dashboard');
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to delete tree.');
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <button onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={14} /> Back to tree
      </button>

      <h1 className="mb-8 text-2xl font-semibold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        Tree Settings
      </h1>

      {/* General */}
      <div className="mb-6 rounded-2xl p-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <h2 className="mb-1 text-base font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          General
        </h2>
        <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>
          Basic information about this tree.
        </p>

        <form onSubmit={form.handleSubmit((d) => updateMutation.mutate(d))}
          className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}>
              Tree Name
            </label>
            <input
              {...form.register('name')}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              {...form.register('description')}
              rows={3}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}>
              Privacy
            </label>
            <select
              {...form.register('privacyLevel')}
              className="w-full appearance-none rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}>
              <option value="family">Family only</option>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={updateMutation.isPending}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--accent-primary)' }}>
              {updateMutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* GEDCOM */}
      <div className="mb-6 rounded-2xl p-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <h2 className="mb-1 text-base font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Import & Export
        </h2>
        <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>
          Move your data between RootLink and other genealogy platforms using GEDCOM 5.5.1.
        </p>

        <div className="flex gap-3">
          <button onClick={() => setShowGedcom(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}>
            <Upload size={14} /> Import GEDCOM
          </button>
          <button onClick={() => setShowGedcom(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}>
            <Download size={14} /> Export GEDCOM
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="mb-6 rounded-2xl p-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <h2 className="mb-1 text-base font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Members
        </h2>
        <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>
          Invite family members to view or collaborate on this tree.
        </p>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ background: 'var(--accent-primary)', color: 'white' }}>
          Invite Member
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl p-6"
        style={{ border: '1px solid var(--danger)', background: 'var(--danger-soft)' }}>
        <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--danger)' }}>
          Danger Zone
        </h2>
        <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>
          Deleting this tree is permanent and removes all persons, media, and relationships.
          There is a 30-day recovery window — contact support before then.
        </p>

        <div className="space-y-3">
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Type <strong>delete this tree</strong> to confirm
          </label>
          <input
            value={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.value)}
            placeholder="delete this tree"
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={confirmDelete !== 'delete this tree' || deleteMutation.isPending}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ background: 'var(--danger)' }}>
            {deleteMutation.isPending
              ? <Loader2 size={13} className="animate-spin" />
              : <Trash2 size={13} />}
            Delete Tree
          </button>
        </div>
      </div>

      <GedcomPanel treeId={treeId} open={showGedcom} onClose={() => setShowGedcom(false)} />
      <InviteMemberModal
        treeId={treeId}
        treeName={tree?.name ?? ''}
        open={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </div>
  );
}
