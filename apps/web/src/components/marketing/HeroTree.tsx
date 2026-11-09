'use client';

import { useEffect, useState } from 'react';

// ── HeroTree ─────────────────────────────────────────────────────────────────
// The product's signature hero: an animated pedigree chart drawn on the
// dark forest background. White translucent branches draw in, then nodes
// bloom — the same visual as the in-app canvas, scaled for the landing page.
// This communicates EXACTLY what the product does before a word is read.
//
// Sequence:
//   0.0s → trunk grows up
//   0.6s → left branch draws
//   0.6s → right branch draws
//   1.0s → sub-branches draw
//   1.2s → "you" node blooms (amber — you are the root)
//   1.4s → parent nodes bloom (white)
//   1.8s → grandparent nodes bloom (white, faded)
//   2.2s → labels fade in
//   3.0s → gentle float begins

export function HeroTree() {
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    if (mql.matches) { setStep(99); return; }

    const timings = [0, 600, 600, 1000, 1200, 1400, 1800, 2200];
    const timers = timings.map((t, i) => setTimeout(() => setStep(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, []);

  const white = 'rgba(255,255,255,0.80)';
  const whiteFade = 'rgba(255,255,255,0.45)';
  const amber = '#C97B2F';
  const amberLight = '#F2A747';

  const branchStyle = (fromStep: number): React.CSSProperties => ({
    opacity: step >= fromStep || reduced ? 1 : 0,
    strokeDasharray: reduced ? undefined : '1 1',
    strokeDashoffset: reduced ? undefined : (step >= fromStep ? 0 : 1),
    transition: reduced ? 'none' : 'stroke-dashoffset 0.8s cubic-bezier(0.65,0,0.35,1), opacity 0.3s ease',
  });

  const nodeStyle = (fromStep: number, delay = 0): React.CSSProperties => ({
    opacity: step >= fromStep || reduced ? 1 : 0,
    transform: step >= fromStep || reduced ? 'scale(1)' : 'scale(0)',
    transformOrigin: 'center',
    transition: reduced ? 'none' : `transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, opacity 0.3s ease ${delay}ms`,
  });

  const labelStyle = (fromStep: number): React.CSSProperties => ({
    opacity: step >= fromStep || reduced ? 1 : 0,
    transition: reduced ? 'none' : 'opacity 0.6s ease 0.2s',
  });

  return (
    <div className="relative select-none" style={{ maxWidth: 560, margin: '0 auto' }}>
      <svg
        viewBox="0 0 560 360"
        className="w-full overflow-visible"
        role="img"
        aria-label="An animated family pedigree chart showing three generations, with you at the center bottom"
      >
        {/* ── Branches ── */}
        {/* Trunk (you → parents) */}
        <line x1="280" y1="310" x2="280" y2="230"
          stroke={white} strokeWidth="3" strokeLinecap="round"
          style={branchStyle(1)} />

        {/* Left branch (you → left parent) */}
        <path d="M280 250 Q200 220 140 190"
          stroke={white} strokeWidth="2.5" strokeLinecap="round" fill="none"
          style={branchStyle(2)} />

        {/* Right branch (you → right parent) */}
        <path d="M280 250 Q360 220 420 190"
          stroke={white} strokeWidth="2.5" strokeLinecap="round" fill="none"
          style={branchStyle(2)} />

        {/* Left grandparent branches */}
        <path d="M140 190 Q100 165 68 140"
          stroke={whiteFade} strokeWidth="2" strokeLinecap="round" fill="none"
          style={branchStyle(3)} />
        <path d="M140 190 Q160 158 180 130"
          stroke={whiteFade} strokeWidth="2" strokeLinecap="round" fill="none"
          style={branchStyle(3)} />

        {/* Right grandparent branches */}
        <path d="M420 190 Q390 158 370 130"
          stroke={whiteFade} strokeWidth="2" strokeLinecap="round" fill="none"
          style={branchStyle(3)} />
        <path d="M420 190 Q450 165 482 140"
          stroke={whiteFade} strokeWidth="2" strokeLinecap="round" fill="none"
          style={branchStyle(3)} />

        {/* ── You node (amber center, larger) ── */}
        <g style={nodeStyle(4)} transform="translate(280, 320)">
          {/* Glow ring */}
          <circle r="22" fill="none" stroke={amber} strokeWidth="1.5" opacity="0.3" />
          {/* Main node */}
          <circle r="16" fill={amber} />
          {/* Inner glow */}
          <circle r="16" fill="url(#hero-amber-grad)" />
          {/* Specular */}
          <circle cx="-5" cy="-5" r="5" fill="rgba(255,255,255,0.35)" />
        </g>

        {/* ── Parent nodes ── */}
        <g style={nodeStyle(5)} transform="translate(140, 190)">
          <circle r="13" fill={white} />
          <circle cx="-4" cy="-4" r="4" fill="rgba(255,255,255,0.5)" />
        </g>
        <g style={nodeStyle(5, 80)} transform="translate(420, 190)">
          <circle r="13" fill={white} />
          <circle cx="-4" cy="-4" r="4" fill="rgba(255,255,255,0.5)" />
        </g>

        {/* ── Grandparent nodes ── */}
        {[[68, 140], [180, 130], [370, 130], [482, 140]].map(([x, y], i) => (
          <g key={i} style={nodeStyle(6, i * 60)} transform={`translate(${x}, ${y})`}>
            <circle r="10" fill={whiteFade} />
          </g>
        ))}

        {/* ── Labels ── */}
        <text x="280" y="355" textAnchor="middle" fill={amberLight}
          fontFamily="var(--font-mono)" fontSize="11" letterSpacing="0.08em"
          style={labelStyle(7)}>
          YOU
        </text>
        <text x="140" y="214" textAnchor="middle" fill={white} opacity="0.6"
          fontFamily="var(--font-mono)" fontSize="10" letterSpacing="0.06em"
          style={labelStyle(7)}>
          PARENT
        </text>
        <text x="420" y="214" textAnchor="middle" fill={white} opacity="0.6"
          fontFamily="var(--font-mono)" fontSize="10" letterSpacing="0.06em"
          style={labelStyle(7)}>
          PARENT
        </text>
        <text x="65" y="122" textAnchor="middle" fill={white} opacity="0.35"
          fontFamily="var(--font-mono)" fontSize="9" letterSpacing="0.05em"
          style={labelStyle(7)}>
          GRAND
        </text>
        <text x="180" y="112" textAnchor="middle" fill={white} opacity="0.35"
          fontFamily="var(--font-mono)" fontSize="9" letterSpacing="0.05em"
          style={labelStyle(7)}>
          GRAND
        </text>
        <text x="370" y="112" textAnchor="middle" fill={white} opacity="0.35"
          fontFamily="var(--font-mono)" fontSize="9" letterSpacing="0.05em"
          style={labelStyle(7)}>
          GRAND
        </text>
        <text x="484" y="122" textAnchor="middle" fill={white} opacity="0.35"
          fontFamily="var(--font-mono)" fontSize="9" letterSpacing="0.05em"
          style={labelStyle(7)}>
          GRAND
        </text>

        {/* ── Gradient defs ── */}
        <defs>
          <radialGradient id="hero-amber-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#F2A747" />
            <stop offset="70%" stopColor="#C97B2F" />
            <stop offset="100%" stopColor="#8A4A0A" />
          </radialGradient>
        </defs>

        {/* Ground line */}
        <line x1="220" y1="340" x2="340" y2="340"
          stroke={amber} strokeWidth="1.5" strokeLinecap="round" opacity="0.3"
          style={labelStyle(4)} />
      </svg>

      {/* Ambient amber glow beneath the "you" node */}
      <div
        className="absolute"
        style={{
          bottom: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120,
          height: 60,
          background: 'radial-gradient(ellipse at center, rgba(201,123,47,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
          transition: 'opacity 1s ease',
          opacity: step >= 4 ? 1 : 0,
        }}
      />
    </div>
  );
}
