'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../../../lib/api-client';
import type { TimelineEntry } from '@rootlink/shared';

function formatEntryDate(date: TimelineEntry['date']): string {
  if (!date?.year) return '';
  const prefix = date.circa ? 'c. ' : '';
  if (date.month && date.day) {
    const monthName = new Date(2000, date.month - 1).toLocaleString('en', { month: 'long' });
    return `${prefix}${date.day} ${monthName} ${date.year}`;
  }
  if (date.month) {
    return `${prefix}${new Date(2000, date.month - 1).toLocaleString('en', { month: 'long' })} ${date.year}`;
  }
  return `${prefix}${date.year}`;
}

export default function TimelinePage() {
  const { treeId } = useParams<{ treeId: string }>();
  const router = useRouter();

  const { data: entries, isLoading } = useQuery({
    queryKey: ['timeline', treeId],
    queryFn: () => api.get<TimelineEntry[]>(`/v1/trees/${treeId}/timeline`),
  });

  // Group consecutive entries by year for a lighter-weight scan, without
  // losing the finer month/day ordering within a year.
  const groups: { year: number | null; entries: TimelineEntry[] }[] = [];
  for (const entry of entries ?? []) {
    const year = entry.date?.year ?? null;
    const last = groups[groups.length - 1];
    if (last && last.year === year) {
      last.entries.push(entry);
    } else {
      groups.push({ year, entries: [entry] });
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <button
        onClick={() => router.push(`/trees/${treeId}`)}
        className="mb-6 flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--text-primary)]"
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronLeft size={15} />
        Back to tree
      </button>

      <h1 className="mb-1 text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        Family Timeline
      </h1>
      <p className="mb-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        Every recorded life event across this tree, chronologically.
      </p>

      {isLoading ? (
        <div className="py-16 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Loading…</div>
      ) : !entries || entries.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          No dated events recorded in this tree yet.
        </div>
      ) : (
        <div className="relative space-y-8 border-l pl-6" style={{ borderColor: 'var(--border-default)' }}>
          {groups.map((group, gi) => (
            <div key={gi} className="relative">
              <div
                className="absolute -left-[31px] flex h-4 w-4 items-center justify-center rounded-full"
                style={{ background: 'var(--accent-primary)' }}
              />
              <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
                {group.year ?? 'Undated'}
              </p>
              <div className="space-y-3">
                {group.entries.map((entry) => (
                  <div key={entry.eventId} className="rounded-xl p-3.5"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                          {entry.type.replace(/_/g, ' ')}
                        </p>
                        <Link
                          href={`/trees/${treeId}/persons/${entry.personId}`}
                          className="text-sm underline"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {entry.personDisplayName}
                        </Link>
                      </div>
                      {entry.date?.year && (
                        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs" style={{ color: 'var(--text-faint)' }}>
                          <Calendar size={11} />
                          {formatEntryDate(entry.date)}
                        </span>
                      )}
                    </div>
                    {entry.place && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <MapPin size={11} />
                        {entry.place}
                      </p>
                    )}
                    {entry.description && (
                      <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {entry.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
