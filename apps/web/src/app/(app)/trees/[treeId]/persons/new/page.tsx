import { PersonFormLoader } from '@/components/person/PersonFormLoader';

interface Props {
  params: Promise<{ treeId: string }>;
}

export default async function NewPersonPage({ params }: Props) {
  const { treeId } = await params;
  return <PersonFormLoader treeId={treeId} />;
}
