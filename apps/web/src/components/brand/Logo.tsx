import type { SVGProps } from 'react';

// ── RootLink Pedigree Icon ──────────────────────────────────────────────────
// The icon is a miniature version of the app's own pedigree chart:
// • Trunk rendered with 3 isometric faces (front/right/top) for genuine 3D depth
// • Branches going upper-left, center, upper-right — 5 nodes total
// • Amber center node = "you" (the user is the root of their own tree)
// • Forest green outer nodes = ancestors
// • Amber root tendrils below the ground line = heritage beneath the surface
// • Light source: upper-left — matches the app's card shadow direction

export function RootLinkIcon({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 40 40" fill="none"
      className={className}
      role="img" aria-label="RootLink icon"
    >
      <defs>
        {/* Trunk — 3 faces, lit from upper-left */}
        <linearGradient id="rl-trunk-front" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3E8A75" />
          <stop offset="100%" stopColor="#2D6455" />
        </linearGradient>
        <linearGradient id="rl-trunk-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1A3830" />
          <stop offset="100%" stopColor="#152F28" />
        </linearGradient>
        <linearGradient id="rl-trunk-top" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#5DA090" />
          <stop offset="100%" stopColor="#4A8A78" />
        </linearGradient>

        {/* Branches */}
        <linearGradient id="rl-branch-l" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2D6455" />
          <stop offset="100%" stopColor="#3E8A75" />
        </linearGradient>
        <linearGradient id="rl-branch-r" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#2D6455" />
          <stop offset="100%" stopColor="#1E4037" />
        </linearGradient>

        {/* Person nodes */}
        <radialGradient id="rl-node-amber" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#F2A747" />
          <stop offset="60%" stopColor="#C97B2F" />
          <stop offset="100%" stopColor="#A04010" />
        </radialGradient>
        <radialGradient id="rl-node-forest" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#5DA090" />
          <stop offset="60%" stopColor="#2D6455" />
          <stop offset="100%" stopColor="#152F28" />
        </radialGradient>
        <radialGradient id="rl-node-mid" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4A8A78" />
          <stop offset="100%" stopColor="#1E4037" />
        </radialGradient>

        {/* Root glow — amber warmth rising from the earth */}
        <radialGradient id="rl-root-glow" cx="50%" cy="100%" r="65%">
          <stop offset="0%" stopColor="#C97B2F" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#C97B2F" stopOpacity="0" />
        </radialGradient>

        {/* Node drop shadow */}
        <filter id="rl-node-shadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#091810" floodOpacity="0.45" />
        </filter>
        <filter id="rl-trunk-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#091810" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Root glow — the warmth beneath the surface */}
      <ellipse cx="20" cy="36.5" rx="13" ry="4.5" fill="url(#rl-root-glow)" />

      {/* Ground line */}
      <line x1="9" y1="34" x2="31" y2="34"
        stroke="#B0D8CC" strokeWidth="0.6" strokeOpacity="0.6" />

      {/* Root tendrils (amber) */}
      <path d="M17 34 Q14.5 35.5 11.5 37.5"
        stroke="#C97B2F" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      <path d="M19.5 34.5 Q19.5 36 18.5 38.5"
        stroke="#C97B2F" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
      <path d="M22 34 Q24.5 35.5 27.5 37.5"
        stroke="#C97B2F" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />

      {/* ── TRUNK — 3 isometric faces ── */}
      <g filter="url(#rl-trunk-shadow)">
        {/* Front face (largest, middle tone) */}
        <rect x="16.5" y="22" width="5" height="12" rx="0.5"
          fill="url(#rl-trunk-front)" />
        {/* Right face (darkest, creates depth illusion) */}
        <polygon
          points="21.5,22 24.5,20.5 24.5,31.5 21.5,34"
          fill="url(#rl-trunk-right)" />
        {/* Top face (lightest, receives most light) */}
        <polygon
          points="16.5,22 19.5,20.5 24.5,20.5 21.5,22"
          fill="url(#rl-trunk-top)" />
        {/* Edge highlights (1px white strokes on lit edges) */}
        <line x1="16.5" y1="22" x2="19.5" y2="20.5"
          stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
        <line x1="16.5" y1="22" x2="16.5" y2="34"
          stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      </g>

      {/* ── BRANCHES ── */}
      {/* Left branch */}
      <path d="M17.5 26 Q13.5 23 8.5 19"
        stroke="url(#rl-branch-l)" strokeWidth="2" strokeLinecap="round" />
      {/* Right branch */}
      <path d="M21.5 25 Q26 22 31 18.5"
        stroke="url(#rl-branch-r)" strokeWidth="2" strokeLinecap="round" />
      {/* Center branch (up from trunk top). Solid color, not the branch
          gradient — a perfectly vertical line has a zero-width bounding
          box, and objectBoundingBox gradient units (the default) are
          degenerate on a zero-width axis, which real SVG renderers treat
          as invisible per the W3C's own test suite for this exact case
          (full-pservers-grad-17-b). This line was rendering invisibly,
          making the amber "you" node look disconnected from the tree. */}
      <path d="M19.5 21 L19.5 10"
        stroke="#3E8A75" strokeWidth="2.5" strokeLinecap="round" />
      {/* Sub-branch left */}
      <path d="M11 21 Q9 19 7 17"
        stroke="#3E8A75" strokeWidth="1.4" strokeLinecap="round" />
      {/* Sub-branch right */}
      <path d="M29 20 Q31 18.5 33 16.5"
        stroke="#2D6455" strokeWidth="1.4" strokeLinecap="round" />
      {/* Branch right-face depth (isometric shadow stroke) */}
      <path d="M22 26 Q27 23 32 19.5"
        stroke="#152F28" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />

      {/* ── PERSON NODES ── */}
      {/* Outer left grandparent */}
      <circle cx="6.5" cy="15.5" r="3.2"
        fill="url(#rl-node-forest)" filter="url(#rl-node-shadow)" />
      {/* Outer right grandparent */}
      <circle cx="33.5" cy="15" r="3.2"
        fill="url(#rl-node-forest)" filter="url(#rl-node-shadow)" />
      {/* Inner left parent */}
      <circle cx="10" cy="20" r="2.6"
        fill="url(#rl-node-mid)" filter="url(#rl-node-shadow)" />
      {/* Inner right parent */}
      <circle cx="30" cy="18.5" r="2.6"
        fill="url(#rl-node-mid)" filter="url(#rl-node-shadow)" />
      {/* Center top — "you" — amber (the user is the root of everything) */}
      <circle cx="19.5" cy="8.5" r="4"
        fill="url(#rl-node-amber)" filter="url(#rl-node-shadow)" />
      {/* Specular highlight on amber node */}
      <circle cx="18" cy="7" r="1.2" fill="rgba(255,255,255,0.42)" />
    </svg>
  );
}

// ── RootLink Icon — Alternate ("Candelabra") composition ───────────────────
// A second exploration of the mark, matching the composition from a
// generated reference image: a central trunk rising straight to an apex
// amber "you" node, with two main branches forking partway up, each of
// those forking again into an outer and inner ancestor node — four green
// nodes total, arranged in two tiers either side of the trunk, plus small
// leaves at the fork points. Same isometric-trunk technique, same exact
// hex values, and the same root tendrils as RootLinkIcon — this is a
// layout variant, not a new palette or rendering style. Not wired into
// RootLinkLogo/the live navbar or footer — exists for side-by-side
// comparison only.
export function RootLinkIconAlt({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 40 40" fill="none"
      className={className}
      role="img" aria-label="RootLink icon (alternate)"
    >
      <defs>
        <linearGradient id="rla-trunk-front" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3E8A75" />
          <stop offset="100%" stopColor="#2D6455" />
        </linearGradient>
        <linearGradient id="rla-trunk-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1A3830" />
          <stop offset="100%" stopColor="#152F28" />
        </linearGradient>
        <linearGradient id="rla-trunk-top" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#5DA090" />
          <stop offset="100%" stopColor="#4A8A78" />
        </linearGradient>

        <linearGradient id="rla-branch-l" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2D6455" />
          <stop offset="100%" stopColor="#3E8A75" />
        </linearGradient>
        <linearGradient id="rla-branch-r" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#2D6455" />
          <stop offset="100%" stopColor="#1E4037" />
        </linearGradient>

        <radialGradient id="rla-node-amber" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#F2A747" />
          <stop offset="60%" stopColor="#C97B2F" />
          <stop offset="100%" stopColor="#A04010" />
        </radialGradient>
        <radialGradient id="rla-node-forest" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#5DA090" />
          <stop offset="60%" stopColor="#2D6455" />
          <stop offset="100%" stopColor="#152F28" />
        </radialGradient>
        <radialGradient id="rla-node-mid" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4A8A78" />
          <stop offset="100%" stopColor="#1E4037" />
        </radialGradient>

        <radialGradient id="rla-root-glow" cx="50%" cy="100%" r="65%">
          <stop offset="0%" stopColor="#C97B2F" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#C97B2F" stopOpacity="0" />
        </radialGradient>

        <filter id="rla-node-shadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#091810" floodOpacity="0.45" />
        </filter>
        <filter id="rla-trunk-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#091810" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Root glow */}
      <ellipse cx="20" cy="36.5" rx="13" ry="4.5" fill="url(#rla-root-glow)" />

      {/* Ground line */}
      <line x1="9" y1="34" x2="31" y2="34"
        stroke="#B0D8CC" strokeWidth="0.6" strokeOpacity="0.6" />

      {/* Root tendrils (amber) — unchanged from RootLinkIcon */}
      <path d="M17 34 Q14.5 35.5 11.5 37.5"
        stroke="#C97B2F" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      <path d="M19.5 34.5 Q19.5 36 18.5 38.5"
        stroke="#C97B2F" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
      <path d="M22 34 Q24.5 35.5 27.5 37.5"
        stroke="#C97B2F" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />

      {/* ── TRUNK — 3 isometric faces, same proportions as RootLinkIcon ── */}
      <g filter="url(#rla-trunk-shadow)">
        <rect x="16.5" y="22" width="5" height="12" rx="0.5" fill="url(#rla-trunk-front)" />
        <polygon points="21.5,22 24.5,20.5 24.5,31.5 21.5,34" fill="url(#rla-trunk-right)" />
        <polygon points="16.5,22 19.5,20.5 24.5,20.5 21.5,22" fill="url(#rla-trunk-top)" />
        <line x1="16.5" y1="22" x2="19.5" y2="20.5" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
        <line x1="16.5" y1="22" x2="16.5" y2="34" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      </g>

      {/* ── MAIN BRANCHES (from trunk top, sweeping up and out to elbows) ── */}
      <path d="M17.5 24.5 Q11.5 20 9 15.5"
        stroke="url(#rla-branch-l)" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      <path d="M21.5 23.5 Q28 19.5 31 15.5"
        stroke="url(#rla-branch-r)" strokeWidth="2.1" strokeLinecap="round" fill="none" />

      {/* Thin center leader — trunk continues on up to the apex node.
          Solid color, not the branch gradient — see the matching comment
          on RootLinkIcon's center branch for why a gradient here is
          unreliable (this line is drawn after the main branches so it
          paints on top where they cross near the trunk top). */}
      <path d="M19.5 21 L19.7 8.5" stroke="#3E8A75" strokeWidth="2.6" strokeLinecap="round" />

      {/* ── SECONDARY FORKS (each elbow splits to an outer + inner node) ── */}
      <path d="M9 15.5 Q6 12.5 3.5 10" stroke="#3E8A75" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M9 15.5 Q11 11.5 13 8" stroke="#2D6455" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M31 15.5 Q34 12.5 36.5 10" stroke="#2D6455" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M31 15.5 Q29 11.5 27 8" stroke="#1E4037" strokeWidth="1.4" strokeLinecap="round" fill="none" />

      {/* ── LEAVES at the main forks ── */}
      <path d="M12 18.5 Q9.5 17.5 10.5 15 Q13 16.5 12 18.5 Z" fill="#4A8A78" opacity="0.85" />
      <path d="M28 17.5 Q30.5 16.5 29.5 14 Q27 15.5 28 17.5 Z" fill="#3E8A75" opacity="0.85" />

      {/* ── PERSON NODES ── */}
      {/* Outer left / right ancestors (widest tier) */}
      <circle cx="3.5" cy="10" r="3.1" fill="url(#rla-node-forest)" filter="url(#rla-node-shadow)" />
      <circle cx="36.5" cy="10" r="3.1" fill="url(#rla-node-forest)" filter="url(#rla-node-shadow)" />
      {/* Inner left / right ancestors (upper tier, closer to center) */}
      <circle cx="13" cy="8" r="2.7" fill="url(#rla-node-mid)" filter="url(#rla-node-shadow)" />
      <circle cx="27" cy="8" r="2.7" fill="url(#rla-node-mid)" filter="url(#rla-node-shadow)" />
      {/* Apex — "you" — amber, sits above everything else */}
      <circle cx="19.7" cy="6.5" r="4" fill="url(#rla-node-amber)" filter="url(#rla-node-shadow)" />
      <circle cx="18.2" cy="5" r="1.2" fill="rgba(255,255,255,0.42)" />
    </svg>
  );
}

// ── Full wordmark: icon + "Root" (bold) + "Link" (regular) ─────────────────

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<LogoSize, { icon: number; text: string; gap: string }> = {
  xs: { icon: 22, text: 'text-sm',  gap: 'gap-1.5' },
  sm: { icon: 28, text: 'text-base', gap: 'gap-2' },
  md: { icon: 36, text: 'text-xl',   gap: 'gap-2.5' },
  lg: { icon: 44, text: 'text-2xl',  gap: 'gap-3' },
  xl: { icon: 60, text: 'text-4xl',  gap: 'gap-4' },
};

export function RootLinkLogo({
  size = 'md',
  inverted = false,
  className = '',
}: {
  size?: LogoSize;
  inverted?: boolean;
  className?: string;
}) {
  const s = SIZE[size];
  const rootColor   = inverted ? '#FFFFFF' : 'var(--accent-primary)';
  const linkColor   = inverted ? 'rgba(255,255,255,0.75)' : 'var(--accent-canopy)';

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <RootLinkIcon size={s.icon} />
      <div className="flex items-baseline leading-none">
        <span
          className={`font-display font-bold tracking-tight ${s.text}`}
          style={{ color: rootColor }}
        >
          Root
        </span>
        <span
          className={`font-display font-normal tracking-tight ${s.text}`}
          style={{ color: linkColor }}
        >
          Link
        </span>
      </div>
    </div>
  );
}

// ── Wordmark only (for contexts where icon is separate) ─────────────────────

export function RootLinkWordmark({
  size = 'md',
  inverted = false,
}: {
  size?: LogoSize;
  inverted?: boolean;
}) {
  const s = SIZE[size];
  return (
    <div className="flex items-baseline leading-none">
      <span
        className={`font-display font-bold tracking-tight ${s.text}`}
        style={{ color: inverted ? '#FFFFFF' : 'var(--accent-primary)' }}
      >
        Root
      </span>
      <span
        className={`font-display font-normal tracking-tight ${s.text}`}
        style={{ color: inverted ? 'rgba(255,255,255,0.7)' : 'var(--accent-canopy)' }}
      >
        Link
      </span>
    </div>
  );
}
