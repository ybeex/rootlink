'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { createPersonSchema, type CreatePersonInput } from '@rootlink/shared';
import { api, ApiClientError } from '../../lib/api-client';
import type { Person } from '@rootlink/shared';

const EVENT_TYPES = [
  { value: 'birth',            label: 'Birth'           },
  { value: 'death',            label: 'Death'           },
  { value: 'marriage',         label: 'Marriage'        },
  { value: 'immigration',      label: 'Immigration'     },
  { value: 'military_service', label: 'Military Service'},
  { value: 'occupation',       label: 'Occupation'      },
  { value: 'residence',        label: 'Residence'       },
  { value: 'custom',           label: 'Other'           },
] as const;

interface PersonFormProps {
  treeId: string;
  existing?: Person;
}

export function PersonForm({ treeId, existing }: PersonFormProps) {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const isEditing    = !!existing;

  const form = useForm<CreatePersonInput>({
    resolver: zodResolver(createPersonSchema),
    defaultValues: existing
      ? {
          firstName:    existing.firstName    ?? undefined,
          middleName:   existing.middleName   ?? undefined,
          lastName:     existing.lastName     ?? undefined,
          maidenName:   existing.maidenName   ?? undefined,
          preferredName:existing.preferredName ?? undefined,
          sex:          existing.sex,
          isLiving:     existing.isLiving,
          privacyLevel: existing.privacyLevel,
          biography:    existing.biography    ?? undefined,
          notes:        existing.notes        ?? undefined,
          events:       (existing.events ?? []).map((e: Record<string, unknown>) => ({
            type:        e['type'] as string ?? 'custom',
            date:        (e['date'] as Record<string, unknown> | null) ?? null,
            endDate:     null,
            place:       (e['place'] as Record<string, unknown> | null) ?? null,
            description: (e['description'] as string | null) ?? null,
            certainty:   (e['certainty'] as string) ?? 'probable',
            sourceIds:   (e['sourceIds'] as string[]) ?? [],
          })),
          externalIds:  existing.externalIds ?? {},
        }
      : {
          sex:          'unknown',
          isLiving:     true,
          privacyLevel: 'family',
          events:       [],
          externalIds:  {},
        },
  });

  const { fields: eventFields, append: appendEvent, remove: removeEvent } = useFieldArray({
    control: form.control,
    name: 'events',
  });

  const mutation = useMutation({
    mutationFn: (data: CreatePersonInput) => {
      if (isEditing && existing) {
        return api.patch<Person>(`/v1/trees/${treeId}/persons/${existing.id}`, data);
      }
      return api.post<Person>(`/v1/trees/${treeId}/persons`, data, {
        idempotencyKey: crypto.randomUUID(),
      });
    },
    onSuccess: (person) => {
      queryClient.invalidateQueries({ queryKey: ['persons', treeId] });
      queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
      if (existing) {
        queryClient.invalidateQueries({ queryKey: ['person', treeId, existing.id] });
      }
      toast.success(isEditing ? 'Person updated.' : 'Person added to tree.');
      router.push(`/trees/${treeId}`);
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
        // Map field errors back to form
        if (err.details?.['fields']) {
          const fields = err.details['fields'] as Record<string, string[]>;
          for (const [field, msgs] of Object.entries(fields)) {
            form.setError(field as keyof CreatePersonInput, { message: msgs[0] });
          }
        }
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    },
  });

  const onSubmit = form.handleSubmit((data) => mutation.mutate(data));

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl px-6 py-10" noValidate>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          {isEditing ? 'Edit Person' : 'Add Person'}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {isEditing ? 'Update the details for this person.' : 'Add someone to your family tree.'}
        </p>
      </div>

      {/* ── Identity ─────────────────────────────────────────────────── */}
      <Section title="Identity">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" error={form.formState.errors.firstName?.message}>
            <Input {...form.register('firstName')} placeholder="e.g. Margaret" />
          </Field>
          <Field label="Middle Name" error={form.formState.errors.middleName?.message}>
            <Input {...form.register('middleName')} placeholder="Optional" />
          </Field>
          <Field label="Last Name" error={form.formState.errors.lastName?.message}>
            <Input {...form.register('lastName')} placeholder="e.g. Smith" />
          </Field>
          <Field label="Maiden Name" error={form.formState.errors.maidenName?.message}>
            <Input {...form.register('maidenName')} placeholder="If applicable" />
          </Field>
        </div>

        <Field label="Preferred Name / Nickname" error={form.formState.errors.preferredName?.message}>
          <Input {...form.register('preferredName')} placeholder="How they were known" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Sex" error={form.formState.errors.sex?.message}>
            <Select {...form.register('sex')}>
              <option value="unknown">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </Field>

          <Field label="Privacy" error={form.formState.errors.privacyLevel?.message}>
            <Select {...form.register('privacyLevel')}>
              <option value="public">Public</option>
              <option value="family">Family only</option>
              <option value="private">Private</option>
            </Select>
          </Field>
        </div>

        <Controller
          control={form.control}
          name="isLiving"
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className="relative h-5 w-9 rounded-full transition-colors"
                style={{ background: field.value ? 'var(--accent-primary)' : 'var(--border-strong)' }}>
                <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: field.value ? 'translateX(16px)' : 'translateX(2px)' }} />
              </button>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                This person is living
              </span>
            </label>
          )}
        />
      </Section>

      {/* ── Life Events ──────────────────────────────────────────────── */}
      <Section title="Life Events">
        {eventFields.map((field, idx) => (
          <div key={field.id} className="relative rounded-xl p-4"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
            <button type="button" onClick={() => removeEvent(idx)}
              className="absolute right-3 top-3 rounded p-1 transition-colors hover:bg-[var(--bg-muted)]"
              aria-label="Remove event">
              <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
            </button>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Event Type">
                <Select {...form.register(`events.${idx}.type`)}>
                  {EVENT_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Certainty">
                <Select {...form.register(`events.${idx}.certainty`)}>
                  <option value="confirmed">Confirmed</option>
                  <option value="probable">Probable</option>
                  <option value="possible">Possible</option>
                  <option value="disputed">Disputed</option>
                </Select>
              </Field>

              <Field label="Year">
                <Input
                  type="number"
                  {...form.register(`events.${idx}.date.year`, { valueAsNumber: true })}
                  placeholder="e.g. 1924"
                  min={1}
                  max={9999}
                />
              </Field>

              <Field label="Month">
                <Input
                  type="number"
                  {...form.register(`events.${idx}.date.month`, { valueAsNumber: true })}
                  placeholder="1–12"
                  min={1}
                  max={12}
                />
              </Field>

              <Field label="Place" className="col-span-2">
                <Input
                  {...form.register(`events.${idx}.place.displayName`)}
                  placeholder="e.g. Cork, Ireland"
                />
              </Field>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            appendEvent({
              type:      'birth',
              date:      { year: null, month: null, day: null, circa: false, beforeYear: null, afterYear: null },
              endDate:   null,
              place:     null,
              description: null,
              certainty: 'probable',
              sourceIds: [],
            })
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm transition-colors"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
          <Plus size={14} /> Add Life Event
        </button>
      </Section>

      {/* ── Biography ────────────────────────────────────────────────── */}
      <Section title="Biography & Notes">
        <Field label="Biography" hint="A narrative account of their life.">
          <textarea
            {...form.register('biography')}
            rows={5}
            placeholder="Write a short biography…"
            className="w-full resize-y rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
            style={{
              background:  'var(--bg-surface)',
              border:      '1px solid var(--border-default)',
              color:       'var(--text-primary)',
              fontFamily:  'var(--font-body)',
              lineHeight:  '1.6',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          />
        </Field>

        <Field label="Research Notes" hint="Private notes — only visible to tree editors.">
          <textarea
            {...form.register('notes')}
            rows={3}
            placeholder="Source discrepancies, unverified leads…"
            className="w-full resize-y rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
            style={{
              background: 'var(--bg-surface)',
              border:     '1px solid var(--border-default)',
              color:      'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          />
        </Field>
      </Section>

      {/* ── Submit ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl px-5 py-2.5 text-sm transition-colors hover:bg-[var(--bg-muted)]"
          style={{ color: 'var(--text-secondary)' }}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: 'var(--accent-primary)' }}>
          {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
          {isEditing ? 'Save Changes' : 'Add to Tree'}
        </button>
      </div>
    </form>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label, hint, error, className, children,
}: {
  label: string; hint?: string; error?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium"
        style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs" style={{ color: '#e33209' }}>{error}</p>
      )}
    </div>
  );
}

import React from 'react';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => (
    <input
      ref={ref}
      {...props}
      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
      style={{
        background: 'var(--bg-surface)',
        border:     '1px solid var(--border-default)',
        color:      'var(--text-primary)',
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ember)'; props.onFocus?.(e); }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border-default)'; props.onBlur?.(e); }}
    />
  ),
);
Input.displayName = 'Input';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  (props, ref) => (
    <select
      ref={ref}
      {...props}
      className="w-full appearance-none rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
      style={{
        background:   'var(--bg-surface)',
        border:       '1px solid var(--border-default)',
        color:        'var(--text-primary)',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2366779b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat:   'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '2.5rem',
      }}
    />
  ),
);
Select.displayName = 'Select';
