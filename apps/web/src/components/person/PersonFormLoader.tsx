'use client';

import dynamic from 'next/dynamic';

const PersonForm = dynamic(
  () => import('./PersonForm').then((module) => ({ default: module.PersonForm })),
  {
    ssr: false,
    loading: () => (
      <div
        className="animate-pulse h-64 rounded-2xl"
        style={{ background: 'var(--bg-subtle)' }}
      />
    ),
  },
);

export function PersonFormLoader({ treeId }: { treeId: string }) {
  return <PersonForm treeId={treeId} />;
}
