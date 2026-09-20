'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { RootLinkIcon } from '../../../../components/brand/Logo';
import { createTreeSchema, type CreateTreeInput } from '@rootlink/shared';
import { api, ApiClientError } from '../../../../lib/api-client';
import type { Tree } from '@rootlink/shared';

export default function NewTreePage() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<CreateTreeInput>({
    resolver: zodResolver(createTreeSchema),
    defaultValues: { name: '', description: null, privacyLevel: 'family' },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateTreeInput) =>
      api.post<Tree>('/v1/trees', data, { idempotencyKey: crypto.randomUUID() }),
    onSuccess: (tree) => {
      queryClient.invalidateQueries({ queryKey: ['trees'] });
      toast.success('Tree created.');
      router.push(`/trees/${tree.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to create tree.');
    },
  });

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <Link href="/dashboard"
        className="mb-6 flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={14} /> Back to dashboard
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <RootLinkIcon size={40} />
        <div>
          <h1 className="text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Create a new tree
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Give your family tree a name to get started.
          </p>
        </div>
      </div>

      <div className="rounded-2xl p-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} noValidate className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}>
              Tree Name <span style={{ color: 'var(--accent-ember)' }}>*</span>
            </label>
            <input
              {...form.register('name')}
              placeholder="e.g. Smith Family Tree"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-subtle)',
                border: `1px solid ${form.formState.errors.name ? 'var(--danger)' : 'var(--border-default)'}`,
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = form.formState.errors.name ? 'var(--danger)' : 'var(--border-default)'; }}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              {...form.register('description')}
              rows={3}
              placeholder="A brief description of this family tree…"
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
              <option value="family">Family only — visible to invited members</option>
              <option value="private">Private — only you can see it</option>
              <option value="public">Public — anyone with the link can view</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.back()}
              className="rounded-xl px-5 py-2.5 text-sm transition-colors hover:bg-[var(--bg-muted)]"
              style={{ color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--accent-primary)' }}>
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Create Tree
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
