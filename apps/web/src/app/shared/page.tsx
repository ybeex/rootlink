'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Lock, ArrowRight, Eye } from 'lucide-react';
import { api } from '../../lib/api-client';
import dynamic from 'next/dynamic';
import { BranchLoader } from '../../components/ui/BrandedLoader';
const PedigreeTree = dynamic(
  () => import('../../components/tree/PedigreeTree').then(m => ({ default: m.PedigreeTree })),
  { ssr: false, loading: () => <div className='flex h-full items-center justify-center'><BranchLoader size='lg' /></div> }
);
const PersonPanel = dynamic(
  () => import('../../components/tree/PersonPanel').then(m => ({ default: m.PersonPanel })),
  { ssr: false }
);
import type { Tree, PersonSummary, Relationship, PaginatedResponse } from '@rootlink/shared';
import { RootLinkLogo } from '../../components/brand/Logo';

// ── Public shared tree page ────────────────────────────────────────────────
//
// Visual mode composition:
//   GROVE  — top header bar (dark forest, establishes brand + trust)
//   VAULT  — the tree canvas area (bone white — the "archival record")
//   Grove  — bottom CTA ribbon (dark again, product pitch)
//
// The privacy badge is prominent, not footnoted. The design makes the
// privacy model visually obvious before anyone reads a word about it.

interface Props { searchParams: Promise<{ token?: string }> }

export default function SharedTreePage({ searchParams }: Props) {
  const { token } = use(searchParams);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const { data: tree, isLoading, isError } = useQuery({
    queryKey: ['shared-tree', token],
    queryFn:  () => api.get<Tree & { shareToken: string }>(
      `/v1/trees/shared?token=${token ?? ''}`, { skipAuth: true }
    ),
    enabled: !!token,
    retry: false,
  });

  const { data: personsData } = useQuery({
    queryKey: ['shared-persons', tree?.id, token],
    queryFn:  () => api.get<PaginatedResponse<PersonSummary>>(
      `/v1/trees/${tree!.id}/persons?shareToken=${token}&perPage=500`, { skipAuth: true }
    ),
    enabled: !!tree?.id,
  });

  const { data: relationshipsData } = useQuery({
    queryKey: ['shared-relationships', tree?.id, token],
    queryFn:  () => api.get<Relationship[]>(
      `/v1/trees/${tree!.id}/relationships?shareToken=${token}`, { skipAuth: true }
    ),
    enabled: !!tree?.id,
  });

  const persons       = personsData?.data ?? [];
  const relationships = Array.isArray(relationshipsData) ? relationshipsData : [];
  const selectedPerson = persons.find(p => p.id === selectedPersonId) ?? null;
  const livingCount   = persons.filter(p => p.isLiving).length;

  // ── States ─────────────────────────────────────────────────────────────────

  if (!token) return <InvalidShare message="No share token provided in this link." />;
  if (isError)  return <InvalidShare message="This share link is invalid or has been revoked." />;

  if (isLoading) return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <SharedHeader tree={null} token={token ?? ''} livingCount={0} personCount={0} />
      <div className="flex-1 flex items-center justify-center">
        <BranchSpinner />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-dvh">
      {/* ── Grove header ────────────────────────────────────────────────── */}
      <SharedHeader
        tree={tree ?? null}
        token={token ?? ''}
        livingCount={livingCount}
        personCount={persons.length}
      />

      {/* ── Tree canvas — Vault mode ─────────────────────────────────────── */}
      <div className="flex-1 relative" style={{ background: 'var(--bg-base)' }}>
        {persons.length > 0 ? (
          <PedigreeTree
            persons={persons}
            relationships={relationships}
            selectedPersonId={selectedPersonId}
            onSelectPerson={setSelectedPersonId}
            viewMode="pedigree"
            readOnly
            className="absolute inset-0"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="font-display text-xl" style={{ color: 'var(--text-muted)' }}>
                No people recorded yet
              </p>
            </div>
          </div>
        )}

        {/* Person panel */}
        {selectedPerson && (
          <PersonPanel
            person={selectedPerson}
            treeId={tree?.id ?? ''}
            shareToken={token}
            readOnly
            onClose={() => setSelectedPersonId(null)}
          />
        )}

        {/* Privacy badge — floating, always visible */}
        <div
          className="absolute top-4 right-4 flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Lock size={11} style={{ color: 'var(--accent-canopy)' }} />
          <span className="text-2xs font-medium" style={{ color: 'var(--accent-canopy)' }}>
            Living relatives hidden
          </span>
        </div>
      </div>

      {/* ── Grove CTA ribbon ────────────────────────────────────────────── */}
      <div className="py-4 px-6 flex items-center justify-between"
        style={{ background: 'var(--accent-primary)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Built with RootLink — private family trees
        </p>
        <Link href="/register"
          className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: 'var(--accent-ember)' }}>
          Build your own <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

// ── Grove header ─────────────────────────────────────────────────────────────

function SharedHeader({
  tree, token, livingCount, personCount,
}: {
  tree: (Tree & { shareToken?: string }) | null;
  token: string;
  livingCount: number;
  personCount: number;
}) {
  return (
    <div className="hero-bg border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo + tree name */}
        <div className="flex items-center gap-4">
          <RootLinkLogo size="sm" inverted />
          {tree && (
            <>
              <div className="h-5 w-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
              <div>
                <h1 className="font-display font-semibold text-base leading-tight"
                  style={{ color: '#FFFFFF' }}>
                  {tree.name}
                </h1>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Shared family tree
                </p>
              </div>
            </>
          )}
        </div>

        {/* Stats row */}
        {tree && (
          <div className="hidden sm:flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-xs"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              <Eye size={12} />
              <span>{personCount} people visible</span>
            </div>
            {livingCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1"
                style={{ background: 'rgba(201,123,47,0.15)', color: 'var(--accent-ember)' }}>
                <Lock size={10} />
                <span>{livingCount} living — hidden</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Invalid share ────────────────────────────────────────────────────────────

function InvalidShare({ message }: { message: string }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="hero-bg py-4 px-6">
        <RootLinkLogo size="sm" inverted />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'var(--bg-base)' }}>
        <div className="mb-6">
          <Lock size={36} style={{ color: 'var(--border-strong)' }} className="mx-auto mb-4" />
        </div>
        <h1 className="font-display text-2xl font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}>
          This link isn&rsquo;t valid
        </h1>
        <p className="text-base max-w-sm" style={{ color: 'var(--text-muted)' }}>
          {message}
        </p>
        <Link href="/" className="btn btn-primary mt-8 px-5 py-2.5 text-sm">
          Visit RootLink
        </Link>
      </div>
    </div>
  );
}

// ── Mini branch spinner for loading ─────────────────────────────────────────

function BranchSpinner() {
  return (
    <svg width={48} height={36} viewBox="0 0 48 36" fill="none"
      className="animate-pulse">
      <line x1="24" y1="35" x2="24" y2="20"
        stroke="var(--accent-canopy)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 25 Q16 20 10 14" stroke="var(--accent-canopy)" strokeWidth="2"
        strokeLinecap="round" />
      <path d="M24 25 Q32 20 38 14" stroke="var(--accent-canopy)" strokeWidth="2"
        strokeLinecap="round" />
      <circle cx="24" cy="10" r="5" fill="var(--accent-ember)" />
      <circle cx="8" cy="12" r="4" fill="var(--accent-canopy)" />
      <circle cx="40" cy="12" r="4" fill="var(--accent-canopy)" />
    </svg>
  );
}
