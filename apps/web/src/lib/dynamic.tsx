/**
 * apps/web/src/lib/dynamic.tsx
 *
 * Central registry for Next.js dynamic imports.
 *
 * WHY: Several heavy dependencies (D3, Recharts, framer-motion gestures,
 * file-type detection) must not run during SSR, and should not bloat the
 * initial JS bundle even on pages that don't need them.
 *
 * HOW: Every import here uses `{ ssr: false }` for browser-only libs,
 * and every loading state uses the branded BranchLoader so the UI never
 * shows a bare white flash while the chunk hydrates.
 *
 * USAGE:
 *   import { DynPedigreeTree } from '@/lib/dynamic';
 *   // or
 *   import { DynAreaChart, DynPieChart } from '@/lib/dynamic';
 */

import dynamic from 'next/dynamic';
import { BranchLoader } from '../components/ui/BrandedLoader';

// ── Tree canvas (D3) ──────────────────────────────────────────────────────
// D3 manipulates DOM directly and reads window dimensions at import time.
// Must be { ssr: false } or it crashes during Next.js server rendering.

export const DynPedigreeTree = dynamic(
  () => import('../components/tree/PedigreeTree').then(m => ({ default: m.PedigreeTree })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <BranchLoader size="lg" />
      </div>
    ),
  }
);

// ── Person detail panel ────────────────────────────────────────────────────
export const DynPersonPanel = dynamic(
  () => import('../components/tree/PersonPanel').then(m => ({ default: m.PersonPanel })),
  { ssr: false, loading: () => null }
);

// ── Person form (create/edit) ──────────────────────────────────────────────
export const DynPersonForm = dynamic(
  () => import('../components/person/PersonForm').then(m => ({ default: m.PersonForm })),
  { ssr: false, loading: () => null }
);

// ── GEDCOM panel ───────────────────────────────────────────────────────────
export const DynGedcomPanel = dynamic(
  () => import('../components/tree/GedcomPanel').then(m => ({ default: m.GedcomPanel })),
  { ssr: false, loading: () => null }
);

// ── Hero tree (landing page animation) ────────────────────────────────────
// Uses requestAnimationFrame and window event listeners — no SSR.
export const DynHeroTree = dynamic(
  () => import('../components/marketing/HeroTree').then(m => ({ default: m.HeroTree })),
  { ssr: false, loading: () => <div className="h-[220px]" /> }
);

// ── Animated tree hero (marketing) ────────────────────────────────────────
export const DynAnimatedTreeHero = dynamic(
  () => import('../components/marketing/AnimatedTreeHero').then(m => ({ default: m.AnimatedTreeHero })),
  { ssr: false, loading: () => <div className="aspect-square w-full max-w-xl" /> }
);

// ── Recharts — AreaChart ───────────────────────────────────────────────────
export const DynAreaChart = dynamic(
  () => import('recharts').then(m => ({ default: m.AreaChart })),
  { ssr: false }
);
export const DynArea = dynamic(
  () => import('recharts').then(m => ({ default: m.Area })),
  { ssr: false }
);
export const DynPieChart = dynamic(
  () => import('recharts').then(m => ({ default: m.PieChart })),
  { ssr: false }
);
export const DynPie = dynamic(
  () => import('recharts').then(m => ({ default: m.Pie })),
  { ssr: false }
);
export const DynCell = dynamic(
  () => import('recharts').then(m => ({ default: m.Cell })),
  { ssr: false }
);
export const DynResponsiveContainer = dynamic(
  () => import('recharts').then(m => ({ default: m.ResponsiveContainer })),
  { ssr: false, loading: () => <div className="animate-shimmer rounded-xl h-40" /> }
);
export const DynCartesianGrid = dynamic(
  () => import('recharts').then(m => ({ default: m.CartesianGrid })),
  { ssr: false }
);
export const DynXAxis = dynamic(
  () => import('recharts').then(m => ({ default: m.XAxis })),
  { ssr: false }
);
export const DynYAxis = dynamic(
  () => import('recharts').then(m => ({ default: m.YAxis })),
  { ssr: false }
);
export const DynTooltip = dynamic(
  () => import('recharts').then(m => ({ default: m.Tooltip })),
  { ssr: false }
);

// ── Convenience: full recharts chart groups ────────────────────────────────
// Import these when you need multiple recharts pieces on the same page — they
// share the same bundle chunk so the user only downloads recharts once.

export const DynRechartsArea = dynamic(
  () => import('../components/charts/AreaChartWrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 rounded-xl shimmer" style={{ background: 'var(--bg-muted)' }} />
    ),
  }
);

export const DynRechartsPie = dynamic(
  () => import('../components/charts/PieChartWrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 rounded-xl shimmer" style={{ background: 'var(--bg-muted)' }} />
    ),
  }
);
