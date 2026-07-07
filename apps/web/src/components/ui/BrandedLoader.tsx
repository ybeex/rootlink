'use client';

import { useEffect, useState } from 'react';

// ── BranchLoader — draws an animated pedigree branch ──────────────────────
// This IS the product's metaphor: a branch growing in real-time.
// Used at multiple scales: full-page, inline, button.

type LoaderSize = 'sm' | 'md' | 'lg' | 'page';

const CONFIG: Record<LoaderSize, { w: number; h: number; stroke: number; text?: string }> = {
  sm:   { w: 32, h: 24, stroke: 1.5 },
  md:   { w: 48, h: 36, stroke: 2   },
  lg:   { w: 80, h: 60, stroke: 2.5 },
  page: { w: 120, h: 90, stroke: 3,  text: 'Loading…' },
};

export function BranchLoader({
  size = 'md',
  inverted = false,
  label,
}: {
  size?: LoaderSize;
  inverted?: boolean;
  label?: string;
}) {
  const cfg = CONFIG[size];
  const color = inverted ? 'rgba(255,255,255,0.75)' : 'var(--accent-canopy)';
  const amber = inverted ? '#F2A747' : 'var(--accent-ember)';

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={cfg.w} height={cfg.h}
        viewBox="0 0 120 90" fill="none"
        aria-label="Loading"
      >
        <defs>
          <style>{`
            @keyframes branchGrow {
              0%   { stroke-dashoffset: 1; opacity: 0; }
              10%  { opacity: 1; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes nodeAppear {
              0%, 70% { r: 0; opacity: 0; }
              85%     { r: 6; opacity: 1; }
              100%    { r: 5; opacity: 1; }
            }
            .bl-trunk {
              stroke-dasharray: 1 1;
              animation: branchGrow 0.6s cubic-bezier(0.65,0,0.35,1) infinite alternate;
            }
            .bl-left {
              stroke-dasharray: 1 1;
              animation: branchGrow 0.6s 0.2s cubic-bezier(0.65,0,0.35,1) infinite alternate;
            }
            .bl-right {
              stroke-dasharray: 1 1;
              animation: branchGrow 0.6s 0.4s cubic-bezier(0.65,0,0.35,1) infinite alternate;
            }
            .bl-node-c { animation: nodeAppear 0.6s 0.5s ease-out infinite alternate; }
            .bl-node-l { animation: nodeAppear 0.6s 0.65s ease-out infinite alternate; }
            .bl-node-r { animation: nodeAppear 0.6s 0.65s ease-out infinite alternate; }
          `}</style>
        </defs>

        {/* Trunk */}
        <line x1="60" y1="85" x2="60" y2="55"
          stroke={color} strokeWidth={cfg.stroke} strokeLinecap="round"
          pathLength={1} className="bl-trunk" />
        {/* Left branch */}
        <path d="M60 65 Q45 55 28 40"
          stroke={color} strokeWidth={cfg.stroke * 0.85} strokeLinecap="round" fill="none"
          pathLength={1} className="bl-left" />
        {/* Right branch */}
        <path d="M60 65 Q75 55 92 40"
          stroke={color} strokeWidth={cfg.stroke * 0.85} strokeLinecap="round" fill="none"
          pathLength={1} className="bl-right" />
        {/* Center node */}
        <circle cx="60" cy="33" r="5" fill={amber} className="bl-node-c" />
        {/* Left node */}
        <circle cx="26" cy="37" r="4" fill={color} className="bl-node-l" />
        {/* Right node */}
        <circle cx="94" cy="37" r="4" fill={color} className="bl-node-r" />
      </svg>

      {(label ?? cfg.text) && (
        <p className="font-mono text-xs tracking-wider"
          style={{ color: inverted ? 'rgba(255,255,255,0.5)' : 'var(--text-faint)' }}>
          {label ?? cfg.text}
        </p>
      )}
    </div>
  );
}

// ── Full-page loading screen ────────────────────────────────────────────────

export function PageLoader({ message = 'Loading your tree…' }: { message?: string }) {
  const [visible, setVisible] = useState(false);

  // Delay showing to avoid flash on fast loads
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 animate-fade-in"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Faint canopy glow behind the loader */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(45,100,85,0.12), transparent)',
          pointerEvents: 'none',
        }}
      />
      <BranchLoader size="page" />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  );
}

// ── Skeleton shimmer — card-shaped placeholder ──────────────────────────────

export function SkeletonCard({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 space-y-3 ${className}`}
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      <div className="h-3 w-2/3 rounded-full shimmer" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-2.5 rounded-full shimmer`}
          style={{ width: `${100 - i * 15}%`, opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 py-3 ${className}`}>
      <div className="h-8 w-8 rounded-full shrink-0 shimmer" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 w-1/3 rounded-full shimmer" />
        <div className="h-2 w-1/2 rounded-full shimmer" />
      </div>
      <div className="h-2.5 w-16 rounded-full shimmer" />
    </div>
  );
}
