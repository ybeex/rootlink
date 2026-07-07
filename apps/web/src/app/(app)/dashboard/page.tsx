'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight, Globe, Lock, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { api } from '../../../lib/api-client';
import { useAuthStore } from '../../../store/auth.store';
import type { Tree, User } from '@rootlink/shared';
import { TreeNavIcon } from '../../../components/brand/icons';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonCard } from '../../../components/ui/BrandedLoader';

// ── Dynamic chart imports — recharts excluded from initial bundle ─────────────
const DynAreaChart = dynamic(
  () => import('../../../components/charts/AreaChartWrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 rounded-xl shimmer" style={{ background: 'var(--bg-muted)' }} />
    ),
  }
);

const DynPieChart = dynamic(
  () => import('../../../components/charts/PieChartWrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 rounded-xl shimmer" style={{ background: 'var(--bg-muted)' }} />
    ),
  }
);

// ── Seeded growth data (real data needs /v1/analytics endpoint) ───────────────
const GROWTH_DATA = Array.from({ length: 30 }, (_, i) => {
  const base = 4 + Math.sin(i * 0.4) * 2 + i * 0.15;
  return {
    day:    i + 1,
    label:  i % 7 === 0 ? `Day ${i + 1}` : '',
    people: Math.max(0, Math.round(base + (Math.random() - 0.4) * 3)),
  };
});

const COMPLETENESS = [
  { name: 'Birth dates',    value: 68, color: '#2D6455' },
  { name: 'Photos',         value: 42, color: '#C97B2F' },
  { name: 'Source records', value: 31, color: '#4A8A78' },
];

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, trend, icon,
}: {
  label: string; value: string | number; sub?: string;
  trend?: string; icon: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="card p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-lg p-1.5"
          style={{ background: 'var(--bg-subtle)' }}>
          {icon}
        </div>
        {trend && (
          <span className="text-2xs font-mono font-medium rounded-full px-2 py-0.5"
            style={{
              background: trend.startsWith('+')
                ? 'rgba(45,100,85,0.10)' : 'rgba(239,68,68,0.08)',
              color: trend.startsWith('+')
                ? 'var(--accent-canopy)' : '#ef4444',
            }}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="font-display font-bold text-3xl tabular-nums leading-none"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          {value}
        </p>
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>{label}</p>
      </div>
      {sub && (
        <p className="text-xs pt-3 border-t"
          style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

// ── Tree card ─────────────────────────────────────────────────────────────────
function TreeCard({ tree }: { tree: Tree }) {
  const privacyIcon =
    tree.privacyLevel === 'public'  ? <Globe  size={11} style={{ color: '#4A8A78' }} />
    : tree.privacyLevel === 'family' ? <Users  size={11} style={{ color: 'var(--text-muted)' }} />
    : <Lock size={11} style={{ color: 'var(--text-muted)' }} />;

  return (
    <Link href={`/trees/${tree.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="card p-5 cursor-pointer group"
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, var(--bg-subtle), var(--bg-muted))' }}>
          <TreeNavIcon size={18} color="var(--accent-canopy)" />
        </div>

        <h3 className="font-display font-semibold text-base leading-snug
            group-hover:text-[var(--accent-primary)] transition-colors"
          style={{ color: 'var(--text-primary)' }}>
          {tree.name}
        </h3>

        <div className="mt-3 flex items-center gap-3 text-xs"
          style={{ color: 'var(--text-muted)' }}>
          <span className="tabular-nums font-medium"
            style={{ color: 'var(--text-secondary)' }}>
            {(tree.personCount ?? 0).toLocaleString()}
          </span>
          <span style={{ color: 'var(--text-faint)' }}>people</span>
          <span className="ml-auto flex items-center gap-1">
            {privacyIcon}
            <span className="capitalize">{tree.privacyLevel}</span>
          </span>
        </div>

        {tree.dataQualityScore !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between mb-1">
              <span className="text-2xs" style={{ color: 'var(--text-faint)' }}>
                Completeness
              </span>
              <span className="text-2xs font-mono"
                style={{ color: 'var(--text-muted)' }}>
                {tree.dataQualityScore}%
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-muted)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${tree.dataQualityScore}%`,
                  background: tree.dataQualityScore >= 70
                    ? 'var(--accent-canopy)'
                    : tree.dataQualityScore >= 40
                    ? 'var(--accent-ember)' : 'var(--border-strong)',
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--accent-canopy)' }}>
          Open <ChevronRight size={12} />
        </div>
      </motion.div>
    </Link>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user = useAuthStore(s => s.user);

  const { data: trees, isLoading } = useQuery({
    queryKey: ['trees'],
    queryFn:  () => api.get<Tree[]>('/v1/trees'),
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => api.get<User>('/v1/users/me'),
    staleTime: 5 * 60 * 1000,
  });

  const totalPeople = trees?.reduce((s, t) => s + (t.personCount ?? 0), 0) ?? 0;
  const totalMedia  = trees?.reduce((s, t) => s + (t.mediaCount  ?? 0), 0) ?? 0;
  const gbUsed = me
    ? (me.totalStorageUsedBytes / (1024 ** 3)).toFixed(2)
    : '0.00';

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning'
    : hour < 18 ? 'Good afternoon'
    : 'Good evening';

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-end justify-between"
      >
        <div>
          <p className="text-xs font-mono uppercase tracking-widest mb-1"
            style={{ color: 'var(--text-faint)' }}>
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric',
              month: 'long', year: 'numeric',
            })}
          </p>
          <h1 className="font-display text-3xl font-semibold"
            style={{ color: 'var(--text-primary)' }}>
            {greeting}{user?.firstName ? `, ${user.firstName}` : ''}.
          </h1>
        </div>
        <Link href="/trees/new"
          className="btn btn-primary px-4 py-2.5 text-sm gap-2 hidden sm:flex">
          <Plus size={15} /> New tree
        </Link>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active trees"
          value={(trees?.length ?? 0).toLocaleString()}
          sub={`of 3 on free plan`}
          trend={`+0`}
          icon={<TreeNavIcon size={16} color="var(--accent-primary)" />}
        />
        <StatCard
          label="People recorded"
          value={totalPeople.toLocaleString()}
          sub={`across ${trees?.length ?? 0} trees`}
          icon={
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="6" r="3.5" stroke="var(--accent-canopy)" strokeWidth="1.75" />
              <path d="M2 19 Q2 12 10 12 Q18 12 18 19"
                stroke="var(--accent-canopy)" strokeWidth="1.75"
                strokeLinecap="round" fill="none" />
            </svg>
          }
        />
        <StatCard
          label="Media files"
          value={totalMedia.toLocaleString()}
          sub="photos & documents"
          icon={
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="14" height="14" rx="2"
                stroke="var(--accent-ember)" strokeWidth="1.75" fill="none" />
              <circle cx="7.5" cy="8" r="1.5" fill="var(--accent-ember)" opacity="0.5" />
              <path d="M3 14 L7 10 L10 13 L13 9.5 L17 14"
                stroke="var(--accent-ember)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
            </svg>
          }
        />
        <StatCard
          label="Storage used"
          value={`${gbUsed} GB`}
          sub="of 1 GB on free plan"
          icon={
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <ellipse cx="10" cy="5" rx="7" ry="3"
                stroke="var(--accent-leaf)" strokeWidth="1.75" fill="none" />
              <path d="M3 5 Q3 15 10 17 Q17 15 17 5"
                stroke="var(--accent-leaf)" strokeWidth="1.75"
                strokeLinecap="round" fill="none" />
            </svg>
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Growth area chart — 2/3 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}>
                People added
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                Last 30 days
              </p>
            </div>
            <span className="rounded-full px-2.5 py-1 text-2xs font-medium"
              style={{ background: 'rgba(45,100,85,0.10)', color: 'var(--accent-canopy)' }}>
              +{GROWTH_DATA.reduce((s, d) => s + d.people, 0)} total
            </span>
          </div>
          <DynAreaChart
            data={GROWTH_DATA}
            xKey="label"
            areaKey="people"
            height={160}
            gradientId="dash-area"
            tooltipUnit=" people"
          />
        </motion.div>

        {/* Completeness donut — 1/3 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5"
        >
          <div className="mb-4">
            <h2 className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}>
              Profile completeness
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Average across all trees
            </p>
          </div>
          <DynPieChart
            data={COMPLETENESS}
            height={130}
            innerRadius={35}
            outerRadius={55}
            tooltipSuffix="%"
            showLegend
          />
        </motion.div>
      </div>

      {/* Trees grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}>
            Your trees
          </h2>
          <Link href="/trees/new"
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--accent-canopy)' }}>
            <Plus size={12} /> New tree
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}
          </div>
        ) : trees?.length === 0 ? (
          <EmptyState
            variant="trees"
            action={{ label: 'Create your first tree', href: '/trees/new' }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trees?.map((tree, i) => (
              <motion.div key={tree.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}>
                <TreeCard tree={tree} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
