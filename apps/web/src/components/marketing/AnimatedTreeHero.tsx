'use client';

import { useEffect, useRef, useState } from 'react';

// ── Branch geometry ─────────────────────────────────────────────────────────
//
// Deliberately not a botanically literal tree: the bifurcating structure
// (trunk → 2 → 4 branches, with nodes at the tips) is the same shape as the
// pedigree chart inside the product itself — one ancestor forking into two
// parents, each forking into two more. The hero is a preview of the chart a
// person will actually see once they start building their tree, not a stock
// illustration borrowed from anywhere else.

interface Branch {
  id: string;
  d: string;
  delay: number; // seconds, draw-in stagger
}

interface NodeSpot {
  id: string;
  x: number;
  y: number;
  r: number;
  delay: number;
  tone: 'ink' | 'ember';
}

const BRANCHES: Branch[] = [
  { id: 'trunk', d: 'M320,600 C322,538 318,478 320,422', delay: 0 },
  { id: 'l1', d: 'M320,422 C290,392 244,360 202,302', delay: 0.5 },
  { id: 'r1', d: 'M320,422 C350,392 396,360 438,302', delay: 0.5 },
  { id: 'l2a', d: 'M202,302 C172,266 146,236 124,182', delay: 1.0 },
  { id: 'l2b', d: 'M202,302 C224,268 244,236 262,176', delay: 1.0 },
  { id: 'r2a', d: 'M438,302 C468,266 494,236 516,182', delay: 1.0 },
  { id: 'r2b', d: 'M438,302 C416,268 396,236 378,176', delay: 1.0 },
  { id: 'l3', d: 'M124,182 C112,150 104,126 96,96', delay: 1.5 },
  { id: 'r3', d: 'M516,182 C528,150 536,126 544,96', delay: 1.5 },
];

const NODES: NodeSpot[] = [
  { id: 'root', x: 320, y: 600, r: 7, delay: 0.1, tone: 'ember' },
  { id: 'fork1', x: 320, y: 422, r: 5, delay: 0.6, tone: 'ink' },
  { id: 'l1n', x: 202, y: 302, r: 5.5, delay: 1.1, tone: 'ink' },
  { id: 'r1n', x: 438, y: 302, r: 5.5, delay: 1.1, tone: 'ink' },
  { id: 'l2a', x: 124, y: 182, r: 6, delay: 1.6, tone: 'ember' },
  { id: 'l2b', x: 262, y: 176, r: 6, delay: 1.7, tone: 'ink' },
  { id: 'r2a', x: 516, y: 182, r: 6, delay: 1.6, tone: 'ember' },
  { id: 'r2b', x: 378, y: 176, r: 6, delay: 1.7, tone: 'ink' },
  { id: 'l3', x: 96, y: 96, r: 6.5, delay: 2.1, tone: 'ink' },
  { id: 'r3', x: 544, y: 96, r: 6.5, delay: 2.1, tone: 'ink' },
];

const RINGS = [
  { r: 130, duration: 140 },
  { r: 210, duration: 200 },
  { r: 290, duration: 260 },
];

export function AnimatedTreeHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const el = containerRef.current;
    if (!el) return;

    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Clamp to a small range — depth should be felt, not noticed as motion.
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
      setOffset({ x: nx, y: ny });
    }

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [reducedMotion]);

  const layerTransform = (strength: number) =>
    reducedMotion
      ? undefined
      : `translate3d(${offset.x * strength}px, ${offset.y * strength * 0.6}px, 0)`;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto aspect-square w-full max-w-[560px]"
      style={{ perspective: '1200px' }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 640 640"
        className="h-full w-full overflow-visible"
        style={{ display: 'block' }}
      >
        <defs>
          <radialGradient id="hero-glow" cx="50%" cy="68%" r="55%">
            <stop offset="0%" stopColor="var(--accent-ember)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--accent-ember)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="320" cy="340" r="300" fill="url(#hero-glow)" />

        {/* Layer 1 — generation rings, slowest parallax + slow ambient rotation */}
        <g
          style={{
            transform: layerTransform(6),
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {RINGS.map((ring) => (
            <circle
              key={ring.r}
              cx="320"
              cy="340"
              r={ring.r}
              fill="none"
              stroke="var(--border-strong)"
              strokeOpacity={0.22}
              strokeDasharray="1 7"
              strokeWidth={1.2}
              className="hero-ring"
              style={
                reducedMotion
                  ? undefined
                  : { animationDuration: `${ring.duration}s`, transformOrigin: '320px 340px' }
              }
            />
          ))}
        </g>

        {/* Layer 2 — branches, mid parallax + stroke draw-in */}
        <g
          style={{
            transform: layerTransform(12),
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {BRANCHES.map((b) => (
            <path
              key={b.id}
              d={b.d}
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth={2.5}
              strokeLinecap="round"
              pathLength={1}
              className={reducedMotion ? undefined : 'hero-branch'}
              style={
                reducedMotion
                  ? { strokeDasharray: '1 0' }
                  : { strokeDasharray: '1 1', animationDelay: `${b.delay}s` }
              }
            />
          ))}
        </g>

        {/* Layer 3 — person nodes, fastest parallax + staggered bloom */}
        <g
          style={{
            transform: layerTransform(20),
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {NODES.map((n) => (
            <g
              key={n.id}
              className={reducedMotion ? undefined : 'hero-node'}
              style={
                reducedMotion
                  ? undefined
                  : { animationDelay: `${n.delay}s`, transformOrigin: `${n.x}px ${n.y}px` }
              }
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r + 5}
                fill={n.tone === 'ember' ? 'var(--accent-ember-soft)' : 'transparent'}
                opacity={0.5}
              />
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={n.tone === 'ember' ? 'var(--accent-ember)' : 'var(--text-secondary)'}
                stroke="var(--bg-base)"
                strokeWidth={2.5}
              />
            </g>
          ))}
        </g>
      </svg>

      <style jsx>{`
        .hero-branch {
          animation: hero-draw 1.1s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        @keyframes hero-draw {
          from {
            stroke-dashoffset: 1;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .hero-node {
          opacity: 0;
          transform: scale(0.4);
          animation: hero-bloom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes hero-bloom {
          from {
            opacity: 0;
            transform: scale(0.4);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .hero-ring {
          animation-name: hero-spin;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes hero-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
