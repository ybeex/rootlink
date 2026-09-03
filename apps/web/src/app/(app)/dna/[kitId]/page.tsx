'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Users2 } from 'lucide-react';
import { api } from '../../../../lib/api-client';
import type { DnaKit, DnaMatch, DnaProvider } from '@rootlink/shared';

const PROVIDER_LABEL: Record<DnaProvider, string> = {
  ancestrydna: 'AncestryDNA',
  '23andme':   '23andMe',
  myheritage:  'MyHeritage',
  ftdna:       'FamilyTreeDNA',
  other:       'Other',
};

function dt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  params: Promise<{ kitId: string }>;
}

export default function DnaMatchesPage({ params }: Props) {
  const { kitId } = use(params);
  const router     = useRouter();

  const { data: kit } = useQuery({
    queryKey: ['dna', 'kit', kitId],
    queryFn:  () => api.get<DnaKit>(`/v1/dna/kits/${kitId}`),
  });

  // Already returned sorted by shared cM descending by the API — see
  // listMatchesForKit in dna.service.ts — so no client-side sort needed.
  const { data: matches, isLoading } = useQuery({
    queryKey: ['dna', 'matches', kitId],
    queryFn:  () => api.get<DnaMatch[]>(`/v1/dna/kits/${kitId}/matches`),
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <button
        onClick={() => router.push('/dna')}
        className="mb-6 flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--text-primary)]"
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronLeft size={15} />
        All kits
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          {kit?.label ?? 'DNA Matches'}
        </h1>
        {kit && (
          <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {PROVIDER_LABEL[kit.provider]} · Uploaded {dt(kit.uploadedAt)}
            {kit.snpCount ? ` · ${kit.snpCount.toLocaleString()} SNPs` : ''}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Loading matches…</div>
      ) : !matches || matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <Users2 size={40} className="mb-5" style={{ color: 'var(--text-faint)' }} />
          <h3 className="font-display text-xl font-semibold max-w-xs" style={{ color: 'var(--text-primary)' }}>
            No matches yet
          </h3>
          <p className="mt-2 text-sm leading-relaxed max-w-sm" style={{ color: 'var(--text-muted)' }}>
            This kit hasn't matched against any other processed kit yet. New matches appear automatically
            as more members upload their own DNA.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Match</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Estimated relationship</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Shared cM</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Largest segment</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Segments</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, i) => (
                <tr
                  key={m.matchId}
                  style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {m.otherKitLabel}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {m.estimatedRelationship}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {m.totalSharedCm.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {m.largestSegmentCm.toFixed(1)} cM
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {m.segmentCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
