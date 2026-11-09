'use client';

import dynamic from 'next/dynamic';

// Keep the animation client-only while reserving its layout space during loading.
const HeroTree = dynamic(
  () => import('./HeroTree').then(m => ({ default: m.HeroTree })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ height: 280 }}
        className="flex items-center justify-center"
        aria-hidden="true"
      >
        <svg width={80} height={60} viewBox="0 0 80 60" fill="none" className="animate-pulse">
          <line x1="40" y1="58" x2="40" y2="38"
            stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
          <path d="M40 46 Q26 36 16 26"
            stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M40 46 Q54 36 64 26"
            stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="40" cy="22" r="8" fill="rgba(201,123,47,0.3)" />
          <circle cx="14" cy="22" r="6" fill="rgba(255,255,255,0.2)" />
          <circle cx="66" cy="22" r="6" fill="rgba(255,255,255,0.2)" />
        </svg>
      </div>
    ),
  }
);

export function HeroTreeLoader() {
  return <HeroTree />;
}