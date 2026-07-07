'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function NotFoundPage() {
  const [dark, setDark] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const path = window.location.pathname;
    const appPaths = ['/dashboard', '/trees', '/admin', '/people', '/media', '/search', '/settings'];
    setDark(!appPaths.some(p => path.startsWith(p)));
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 700);
    const t3 = setTimeout(() => setStep(3), 1300);
    const t4 = setTimeout(() => setStep(4), 1700);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  const bg   = dark ? 'var(--gradient-grove)' : 'var(--bg-base)';
  const txtH = dark ? '#FFFFFF' : 'var(--text-primary)';
  const txtB = dark ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)';
  const br   = dark ? 'rgba(255,255,255,0.6)' : 'var(--accent-canopy)';

  const pathStyle = (s: number): React.CSSProperties => ({
    strokeDasharray: '1 1',
    strokeDashoffset: step >= s ? 0 : 1,
    transition: 'stroke-dashoffset 0.6s cubic-bezier(0.65,0,0.35,1)',
    opacity: step >= s ? 1 : 0,
  });

  const bloom = (s: number, delay = 0): React.CSSProperties => ({
    transform: step >= s ? 'scale(1)' : 'scale(0)',
    opacity:   step >= s ? 1 : 0,
    transition: `transform 0.45s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, opacity 0.3s ease ${delay}ms`,
  });

  const reveal: React.CSSProperties = {
    opacity:   step >= 4 ? 1 : 0,
    transform: step >= 4 ? 'none' : 'translateY(8px)',
    transition: 'opacity 0.5s ease 0.6s, transform 0.5s ease 0.6s',
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
      style={{ background: bg }}>
      {dark && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(45,100,85,0.2), transparent)' }} />
      )}

      <svg width={280} height={200} viewBox="0 0 280 200" fill="none" className="mb-8" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="nf-amber" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#F2A747" />
            <stop offset="100%" stopColor="#8A4A0A" />
          </radialGradient>
        </defs>

        {/* Trunk */}
        <line x1="140" y1="195" x2="140" y2="130" stroke={br} strokeWidth="3.5"
          strokeLinecap="round" pathLength={1} style={pathStyle(1)} />

        {/* Left branch */}
        <path d="M140 150 Q100 130 65 110" stroke={br} strokeWidth="2.5"
          strokeLinecap="round" fill="none" pathLength={1} style={pathStyle(2)} />

        {/* Right branch */}
        <path d="M140 150 Q185 130 220 108" stroke={br} strokeWidth="2.5"
          strokeLinecap="round" fill="none" pathLength={1} style={pathStyle(2)} />

        {/* The missing branch — dashed amber trail */}
        <path d="M220 108 Q248 96 268 82" stroke="var(--accent-ember)" strokeWidth="2"
          strokeLinecap="round" fill="none" strokeDasharray="4 5"
          style={{ opacity: step >= 4 ? 0.6 : 0, transition: 'opacity 0.8s ease 0.3s' }} />

        {/* Left node */}
        <g style={{ ...bloom(3), transformOrigin: '65px 108px' }}>
          <circle cx="65" cy="108" r="12" fill={br} />
          <circle cx="60" cy="103" r="4" fill="rgba(255,255,255,0.35)" />
        </g>

        {/* Center node (you — amber) */}
        <g style={{ ...bloom(2, 200), transformOrigin: '140px 124px' }}>
          <circle cx="140" cy="124" r="16" fill="url(#nf-amber)" />
          <circle cx="134" cy="118" r="5" fill="rgba(255,255,255,0.4)" />
        </g>

        {/* Missing right node — dashed circle with ? */}
        <g style={{ ...bloom(3, 100), transformOrigin: '220px 108px' }}>
          <circle cx="220" cy="108" r="11" stroke="var(--accent-ember)"
            strokeWidth="2" strokeDasharray="3 2" fill="none" />
          <text x="220" y="113" textAnchor="middle" fontFamily="var(--font-mono)"
            fontSize="12" fill="var(--accent-ember)"
            style={{ opacity: step >= 4 ? 1 : 0, transition: 'opacity 0.4s ease 0.5s' }}>?</text>
        </g>

        {/* 404 label */}
        <text x="140" y="186" textAnchor="middle" fontFamily="var(--font-mono)"
          fontSize="11" letterSpacing="0.15em"
          fill={dark ? 'rgba(255,255,255,0.2)' : 'var(--text-faint)'}
          style={{ opacity: step >= 4 ? 1 : 0, transition: 'opacity 0.5s ease 0.8s' }}>
          404
        </text>
      </svg>

      <div style={reveal}>
        <p className="font-mono text-xs uppercase tracking-widest mb-3"
          style={{ color: 'var(--accent-ember)' }}>Branch not found</p>
        <h1 className="font-display text-3xl font-semibold mb-3" style={{ color: txtH }}>
          This page doesn&rsquo;t exist.
        </h1>
        <p className="text-base max-w-sm mx-auto" style={{ color: txtB }}>
          Like a missing ancestor — the branch extends, but the record isn&rsquo;t here.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn btn-amber px-5 py-2.5 text-sm gap-2">
            Back to dashboard <ArrowRight size={14} />
          </Link>
          <Link href="/" className="btn btn-ghost px-5 py-2.5 text-sm"
            style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
