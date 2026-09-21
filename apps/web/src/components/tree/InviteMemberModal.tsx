'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Loader2, UserPlus, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { inviteMemberSchema, type InviteMemberInput } from '@rootlink/shared';
import { api, ApiClientError } from '../../lib/api-client';

interface InviteMemberModalProps {
  treeId:   string;
  treeName: string;
  open:     boolean;
  onClose:  () => void;
}

export function InviteMemberModal({ treeId, treeName, open, onClose }: InviteMemberModalProps) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();

  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'contributor', message: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: InviteMemberInput) =>
      api.post<{ inviteToken: string }>(`/v1/trees/${treeId}/members/invite`, data, {
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
      toast.success('Invitation sent.');
      form.reset();
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.code === 'VALIDATION_ERROR') {
        toast.error('User is already a member of this tree.');
      } else {
        toast.error(err instanceof ApiClientError ? err.message : 'Failed to send invite.');
      }
    },
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
            className="w-full max-w-md overflow-hidden rounded-2xl"
            style={{
              background:   'var(--bg-surface)',
              border:       '1px solid var(--border-default)',
              boxShadow:    'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2.5">
                <UserPlus size={16} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <h2 className="text-base font-semibold"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                    Invite to Tree
                  </h2>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {treeName}
                  </p>
                </div>
              </div>
              <button onClick={onClose}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-muted)]">
                <X size={15} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
              className="space-y-4 p-5">

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}>
                  Email Address <span style={{ color: 'var(--accent-ember)' }}>*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-faint)' }} />
                  <input
                    type="email"
                    {...form.register('email')}
                    placeholder="family.member@example.com"
                    className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--bg-subtle)',
                      border: `1px solid ${form.formState.errors.email ? 'var(--danger)' : 'var(--border-default)'}`,
                      color: 'var(--text-primary)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = form.formState.errors.email ? 'var(--danger)' : 'var(--border-default)'; }}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="mb-1.5 block text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}>
                  Role
                </label>
                <select
                  {...form.register('role')}
                  className="w-full appearance-none rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}>
                  <option value="viewer">Viewer — can view the tree, cannot edit</option>
                  <option value="contributor">Contributor — can add and edit persons</option>
                  <option value="editor">Editor — can delete and manage all content</option>
                  <option value="admin">Admin — full control, can invite members</option>
                </select>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
                  You can change this later from tree settings.
                </p>
              </div>

              {/* Personal message */}
              <div>
                <label className="mb-1.5 block text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}>
                  Personal Message <span style={{ color: 'var(--text-faint)' }}>(optional)</span>
                </label>
                <textarea
                  {...form.register('message')}
                  rows={2}
                  placeholder="Hey! I've been building our family tree and would love your help…"
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

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="rounded-xl px-5 py-2.5 text-sm transition-colors hover:bg-[var(--bg-muted)]"
                  style={{ color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: 'var(--accent-primary)' }}>
                  {mutation.isPending
                    ? <Loader2 size={13} className="animate-spin" />
                    : <UserPlus size={13} />}
                  Send Invitation
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
