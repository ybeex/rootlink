import dynamic from 'next/dynamic';
const PersonForm = dynamic(
  () => import('../../../../../../components/person/PersonForm').then(m => ({ default: m.PersonForm })),
  { ssr: false, loading: () => <div className='animate-pulse h-64 rounded-2xl' style={{ background: 'var(--bg-subtle)' }} /> }
);

interface Props {
  params: Promise<{ treeId: string }>;
}

export default async function NewPersonPage({ params }: Props) {
  const { treeId } = await params;
  return <PersonForm treeId={treeId} />;
}
