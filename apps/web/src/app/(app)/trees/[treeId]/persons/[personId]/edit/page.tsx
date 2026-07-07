'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../../../../lib/api-client';
import dynamic from 'next/dynamic';
const PersonForm = dynamic(
  () => import('../../../../../../../components/person/PersonForm').then(m => ({ default: m.PersonForm })),
  { ssr: false, loading: () => <div className='animate-pulse h-64 rounded-2xl' style={{ background: 'var(--bg-subtle)' }} /> }
);
import type { Person } from '@rootlink/shared';

interface Props {
  params: Promise<{ treeId: string; personId: string }>;
}

export default function EditPersonPage({ params }: Props) {
  const { treeId, personId } = use(params);

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', treeId, personId],
    queryFn: () => api.get<Person & { events: unknown[] }>(`/v1/trees/${treeId}/persons/${personId}`),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="space-y-4">
          <div className="shimmer h-8 w-48 rounded" />
          <div className="shimmer h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex h-64 items-center justify-center text-sm"
        style={{ color: 'var(--text-muted)' }}>
        Person not found.
      </div>
    );
  }

  return <PersonForm treeId={treeId} existing={person as Person} />;
}
