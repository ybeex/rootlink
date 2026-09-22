'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ChevronRight } from 'lucide-react';
import { api } from '../../../lib/api-client';
import { TreeNavIcon, PeopleNavIcon, MediaNavIcon } from '../../../components/brand/icons';
import { SkeletonCard } from '../../../components/ui/BrandedLoader';

// ── Admin overview ───────────────────────────────────────────────────────────
// Same "numbers as protagonists" language as the user dashboard, but the
// accent shifts to amber-on-grove cues throughout to keep the admin section
// visually distinct from the everyday product, per the layout's design.

const DynPieChart = dynamic(
  () => import('../../../components/charts/PieChartWrapper'),
  { ssr: false, loading: () => <div className="h-36 rounded-xl shimmer" style={{ background: 'var(--bg-muted)' }} /> }
);

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  tierBreakdown: { free: number; plus: number; pro: number };
  totalTrees: number;
  activeTrees: number;
  totalPersons: number;
  totalMediaAssets: number;
  totalStorageBytes: number;
  newUsersLast30Days: number;
  newTreesLast30Days: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
function n(v: number) { return new Intl.NumberFormat().format(v); }

export default function AdminOverviewPage() {
  const reduceMotion = useReducedMotion();
  const { data: stats, isLoading, error } = useQuery<SystemStats>({
    queryKey: ['admin', 'stats'],
    queryFn:  () => api.get('/v1/admin/stats'),
    refetchInterval: 60_000,
  });

  if (isLoading) return <PageSkeleton />;
  if (error || !stats) {
    return (
      <div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        Couldn&rsquo;t load system stats. Try refreshing.
      </div>
    );
  }

  const STAT_CARDS = [
    { label: 'Active users', value: n(stats.activeUsers), sub: `+${n(stats.newUsersLast30Days)} last 30 days`, icon: <PeopleNavIcon size={16} color="var(--accent-canopy)" /> },
    { label: 'Active trees', value: n(stats.activeTrees), sub: `+${n(stats.newTreesLast30Days)} last 30 days`, icon: <TreeNavIcon size={16} color="var(--accent-canopy)" /> },
    { label: 'People recorded', value: n(stats.totalPersons), sub: `across ${n(stats.activeTrees)} trees`, icon: <PeopleNavIcon size={16} color="var(--text-secondary)" /> },
    { label: 'Media files', value: n(stats.totalMediaAssets), sub: `${formatBytes(stats.totalStorageBytes)} total`, icon: <MediaNavIcon size={16} color="var(--accent-ember)" /> },
  ];

  const tierData = [
    { name: 'Free', value: stats.tierBreakdown.free, color: 'var(--border-strong)' },
    { name: 'Plus', value: stats.tierBreakdown.plus, color: '#3b82f6' },
    { name: 'Pro',  value: stats.tierBreakdown.pro,  color: 'var(--accent-ember)' },
  ];

  const verifiedPct = stats.activeUsers > 0
    ? ((stats.verifiedUsers / stats.activeUsers) * 100).toFixed(0)
    : '0';

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-2xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--accent-ember)' }}>
          Live snapshot
        </p>
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          System overview
        </h1>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {STAT_CARDS.map(({ label, value, sub, icon }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'var(--bg-subtle)' }}>
              {icon}
            </div>
            <p className="font-display font-bold text-2xl tabular-nums" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {value}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="mt-1 text-2xs" style={{ color: 'var(--text-faint)' }}>{sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {/* Tier breakdown donut */}
        <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }} className="card p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Subscription tiers
          </h2>
          <DynPieChart data={tierData} height={140} innerRadius={32} outerRadius={50} showLegend />
        </motion.div>

        {/* Verification + quick links */}
        <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }} className="lg:col-span-2 card p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Email verification
          </h2>
          <div className="flex items-end gap-4">
            <p className="font-display font-bold text-4xl tabular-nums" style={{ color: 'var(--accent-canopy)' }}>
              {verifiedPct}%
            </p>
            <p className="text-xs pb-1" style={{ color: 'var(--text-muted)' }}>
              {n(stats.verifiedUsers)} of {n(stats.activeUsers)} active users verified
            </p>
          </div>
          <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${verifiedPct}%`, background: 'var(--accent-canopy)' }} />
          </div>
        </motion.div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { href: '/admin/users',      label: 'Manage users', sub: `${n(stats.activeUsers)} active`, icon: <PeopleNavIcon size={15} color="var(--text-muted)" /> },
          { href: '/admin/trees',      label: 'Manage trees', sub: `${n(stats.activeTrees)} active`,  icon: <TreeNavIcon size={15} color="var(--text-muted)" />   },
          { href: '/admin/audit-logs', label: 'Audit log',    sub: 'All admin actions',                icon: <AuditFeatureIconInline /> },
          { href: '/admin/queues',     label: 'Job queues',   sub: 'Bull Board (opens tab)', external: true, icon: <QueueIconInline /> },
        ].map(({ href, label, sub, icon, external }) => (
          <Link key={href} href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="card card-lift flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                {icon}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="text-2xs" style={{ color: 'var(--text-faint)' }}>{sub}</p>
              </div>
            </div>
            <ChevronRight size={13} style={{ color: 'var(--text-faint)' }} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function AuditFeatureIconInline() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="2" stroke="var(--text-muted)" strokeWidth="1.6" />
      <line x1="6" y1="6.5" x2="14" y2="6.5" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <line x1="6" y1="10" x2="14" y2="10" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
function QueueIconInline() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="3" rx="1.5" fill="var(--text-muted)" opacity="0.8" />
      <rect x="2" y="9" width="11" height="3" rx="1.5" fill="var(--text-muted)" opacity="0.55" />
      <rect x="2" y="14" width="14" height="3" rx="1.5" fill="var(--text-muted)" opacity="0.4" />
    </svg>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-8 space-y-4">
      <div className="h-6 w-40 rounded-full shimmer" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <SkeletonCard key={i} lines={2} />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <SkeletonCard lines={4} />
        <div className="lg:col-span-2"><SkeletonCard lines={3} /></div>
      </div>
    </div>
  );
}
