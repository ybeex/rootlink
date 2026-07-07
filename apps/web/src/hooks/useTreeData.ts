import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type {
  Tree, PersonSummary, Relationship,
  CreatePersonInput, UpdatePersonInput,
  CreateRelationshipInput, PaginatedResponse,
} from '@rootlink/shared';
import { toast } from 'sonner';

// ── Tree ──────────────────────────────────────────────────────────────────

export function useTree(treeId: string) {
  return useQuery({
    queryKey: ['tree', treeId],
    queryFn:  () => api.get<Tree & { members: unknown[] }>(`/v1/trees/${treeId}`),
    enabled:  !!treeId,
    staleTime: 60 * 1000,
  });
}

// ── Persons ───────────────────────────────────────────────────────────────

export function usePersons(treeId: string, params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '?pageSize=500';
  return useQuery({
    queryKey: ['persons', treeId, params],
    queryFn:  () =>
      api.get<PaginatedResponse<PersonSummary>>(`/v1/trees/${treeId}/persons${query}`),
    enabled:   !!treeId,
    staleTime: 30 * 1000,
    select:    (data) => data.data,
  });
}

export function usePerson(treeId: string, personId: string | null) {
  return useQuery({
    queryKey: ['person', treeId, personId],
    queryFn:  () => api.get<PersonSummary>(`/v1/trees/${treeId}/persons/${personId}`),
    enabled:  !!treeId && !!personId,
    staleTime: 120 * 1000,
  });
}

export function useCreatePerson(treeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePersonInput) =>
      api.post<PersonSummary>(`/v1/trees/${treeId}/persons`, data, {
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['persons', treeId] });
      void qc.invalidateQueries({ queryKey: ['tree', treeId] });
      toast.success('Person added to tree.');
    },
    onError: () => toast.error('Failed to add person.'),
  });
}

export function useUpdatePerson(treeId: string, personId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePersonInput) =>
      api.patch<PersonSummary>(`/v1/trees/${treeId}/persons/${personId}`, data),
    onSuccess: (updated) => {
      qc.setQueryData(['person', treeId, personId], updated);
      void qc.invalidateQueries({ queryKey: ['persons', treeId] });
      toast.success('Person updated.');
    },
    onError: () => toast.error('Failed to update person.'),
  });
}

export function useDeletePerson(treeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) =>
      api.delete(`/v1/trees/${treeId}/persons/${personId}`),
    onSuccess: (_data, personId) => {
      qc.removeQueries({ queryKey: ['person', treeId, personId] });
      void qc.invalidateQueries({ queryKey: ['persons', treeId] });
      void qc.invalidateQueries({ queryKey: ['tree', treeId] });
      toast.success('Person removed from tree.');
    },
    onError: () => toast.error('Failed to remove person.'),
  });
}

// ── Relationships ─────────────────────────────────────────────────────────

export function useRelationships(treeId: string) {
  return useQuery({
    queryKey: ['relationships', treeId],
    queryFn:  () =>
      api.get<{ data: Relationship[] }>(`/v1/trees/${treeId}/relationships?pageSize=1000`),
    enabled:   !!treeId,
    staleTime: 60 * 1000,
    select:    (data) => data.data,
  });
}

export function useCreateRelationship(treeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRelationshipInput) =>
      api.post<Relationship>(`/v1/trees/${treeId}/relationships`, data, {
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['relationships', treeId] });
      toast.success('Relationship added.');
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Failed to add relationship.';
      toast.error(msg);
    },
  });
}

export function useDeleteRelationship(treeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (relationshipId: string) =>
      api.delete(`/v1/trees/${treeId}/relationships/${relationshipId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['relationships', treeId] });
      toast.success('Relationship removed.');
    },
    onError: () => toast.error('Failed to remove relationship.'),
  });
}

// ── Edit History ──────────────────────────────────────────────────────────

export function usePersonHistory(treeId: string, personId: string) {
  return useQuery({
    queryKey: ['person-history', treeId, personId],
    queryFn:  () =>
      api.get<{ data: unknown[] }>(
        `/v1/trees/${treeId}/persons/${personId}/history?pageSize=50`,
      ),
    enabled:   !!treeId && !!personId,
    staleTime: 0, // Always fresh
    select:    (data) => data.data,
  });
}
