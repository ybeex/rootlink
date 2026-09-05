'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import {
  Plus, Layers, ZoomIn, ZoomOut, Maximize2,
  Users, ChevronLeft, Share2, Settings2, History,
} from 'lucide-react';
import { api } from '../../../../lib/api-client';
import type { PedigreeTreeHandle } from '../../../../components/tree/PedigreeTree';
import { ShareTreeModal } from '../../../../components/tree/ShareTreeModal';
import { useTreeWebSocket } from '../../../../hooks/useTreeWebSocket';
import type { Tree, PersonSummary, Relationship, PaginatedResponse } from '@rootlink/shared';
import { BranchLoader } from '../../../../components/ui/BrandedLoader';

// Heavy components — code-split out of the initial bundle.
// PedigreeTree (D3) alone is ~80KB parsed; deferring it means the shell,
// toolbar, and person count render immediately while the canvas loads.
const PedigreeTree = dynamic(
  () => import('../../../../components/tree/PedigreeTree').then(m => ({ default: m.PedigreeTree })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center flex-col gap-3">
        <BranchLoader size="lg" />
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          Loading tree canvas…
        </p>
      </div>
    ),
  }
);

const PersonPanel = dynamic(
  () => import('../../../../components/tree/PersonPanel').then(m => ({ default: m.PersonPanel })),
  { ssr: false }
);

export default function TreePage() {
  const params  = useParams<{ treeId: string }>();
  const router  = useRouter();
  const treeId  = params.treeId;

  const [selectedPersonId, setSelectedPersonId]         = useState<string | null>(null);
  const [viewMode, setViewMode]                          = useState<'pedigree' | 'fan' | 'descendants'>('pedigree');
  const treeRef = useRef<PedigreeTreeHandle>(null);
  const [showShare, setShowShare]                        = useState(false);

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ['tree', treeId],
    queryFn: () => api.get<Tree & { members: unknown[]; shareToken: string | null }>(`/v1/trees/${treeId}`),
  });

  const { data: personsData, isLoading: personsLoading } = useQuery({
    queryKey: ['persons', treeId],
    queryFn: () =>
      api.get<PaginatedResponse<PersonSummary>>(`/v1/trees/${treeId}/persons?pageSize=500`),
    enabled: !!treeId,
  });

  const { data: relationshipsData } = useQuery({
    queryKey: ['relationships', treeId],
    queryFn: () =>
      api.get<{ data: Relationship[] }>(`/v1/trees/${treeId}/relationships?pageSize=1000`),
    enabled: !!treeId,
  });

  const persons       = personsData?.data ?? [];
  const relationships = relationshipsData?.data ?? [];
  const rootPerson    = persons[0];

  // Real-time collaboration
  const { connected, collaborators } = useTreeWebSocket({ treeId, enabled: true });

  if (treeLoading || personsLoading) return <TreePageSkeleton />;
  if (!tree) return <NotFound />;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>

        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-muted)]">
            <ChevronLeft size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
          <div>
            <h1 className="text-sm font-semibold leading-none"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              {tree.name}
            </h1>
            <p className="mt-0.5 text-2xs" style={{ color: 'var(--text-muted)' }}>
              {tree.personCount.toLocaleString()} people
              {collaborators.length > 0 && (
                <span className="ml-2" style={{ color: '#4a7c59' }}>
                  · {collaborators.length + 1} viewing
                </span>
              )}
            </p>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--bg-subtle)' }}>
          {(['pedigree', 'fan', 'descendants'] as const).map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className="rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors"
              style={{
                background: viewMode === mode ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: viewMode === mode ? 'var(--shadow-xs)' : 'none',
              }}>
              {mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* WS status dot */}
          <div className="mr-2 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full transition-colors"
              style={{ background: connected ? '#4a7c59' : 'var(--border-strong)' }} />
            <span className="text-2xs" style={{ color: 'var(--text-faint)' }}>
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>

          <button onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]"
            style={{ color: 'var(--text-muted)' }}>
            <Share2 size={13} /> Share
          </button>
          <button onClick={() => router.push(`/trees/${treeId}/timeline`)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]"
            style={{ color: 'var(--text-muted)' }}>
            <History size={13} /> Timeline
          </button>
          <button onClick={() => router.push(`/trees/${treeId}/settings`)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]"
            style={{ color: 'var(--text-muted)' }}>
            <Settings2 size={13} />
          </button>
          <button onClick={() => router.push(`/trees/${treeId}/persons/new`)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--accent-primary)' }}>
            <Plus size={13} /> Add Person
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden">
        {persons.length === 0 ? (
          <EmptyTreeCanvas treeId={treeId} />
        ) : rootPerson ? (
          <PedigreeTree
            ref={treeRef}
            persons={persons}
            relationships={relationships}
            rootPersonId={rootPerson.id}
            selectedPersonId={selectedPersonId ?? undefined}
            onSelectPerson={setSelectedPersonId}
            viewMode={viewMode}
            onAddParent={(personId) =>
              router.push(`/trees/${treeId}/persons/new?parentOf=${personId}`)
            }
            className="h-full w-full"
          />
        ) : null}

        {/* Zoom controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-1.5">
          {[
            { icon: ZoomIn,    label: 'Zoom in',    action: () => treeRef.current?.zoomIn()    },
            { icon: ZoomOut,   label: 'Zoom out',   action: () => treeRef.current?.zoomOut()  },
            { icon: Maximize2, label: 'Fit to view', action: () => treeRef.current?.fitView() },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} aria-label={label}
              onClick={action}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-sm)',
                color: 'var(--text-muted)',
              }}>
              <Icon size={17} />
            </button>
          ))}
        </div>

        {/* Stats overlay */}
        <div className="absolute bottom-6 left-6 flex items-center gap-3 rounded-xl px-3 py-2 text-xs"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            color: 'var(--text-muted)',
          }}>
          <span className="flex items-center gap-1.5"><Users size={11} />{persons.length.toLocaleString()} people</span>
          <span className="flex items-center gap-1.5"><Layers size={11} />{viewMode}</span>
        </div>

        {/* Person panel */}
        <PersonPanel
          treeId={treeId}
          personId={selectedPersonId}
          onClose={() => setSelectedPersonId(null)}
          onEdit={(id) => router.push(`/trees/${treeId}/persons/${id}/edit`)}
        />
      </div>


      {/* Share Modal */}
      <ShareTreeModal
        treeId={treeId}
        treeName={tree.name}
        shareToken={(tree as Tree & { shareToken: string | null }).shareToken ?? null}
        open={showShare}
        onClose={() => setShowShare(false)}
      />
    </div>
  );
}

function EmptyTreeCanvas({ treeId }: { treeId: string }) {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl"
        style={{ background: 'var(--bg-subtle)' }}>
        <Users size={32} style={{ color: 'var(--text-faint)' }} />
      </div>
      <div className="text-center">
        <h2 className="mb-1 text-lg font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Add your first person
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Start building your tree by adding yourself or a family member.
        </p>
      </div>
      <button onClick={() => router.push(`/trees/${treeId}/persons/new`)}
        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white"
        style={{ background: 'var(--accent-primary)' }}>
        <Plus size={15} /> Add First Person
      </button>
    </div>
  );
}

function TreePageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-3 border-b px-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
        <div className="shimmer h-5 w-32 rounded" />
        <div className="shimmer ml-auto h-7 w-48 rounded-lg" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="shimmer h-16 w-48 rounded-2xl" />
      </div>
    </div>
  );
}

function NotFound() {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tree not found.</p>
      <button onClick={() => router.push('/dashboard')}
        className="text-sm underline" style={{ color: 'var(--accent-ember)' }}>
        Back to dashboard
      </button>
    </div>
  );
}
