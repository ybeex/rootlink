// ── RootLink Custom Icon System ─────────────────────────────────────────────
//
// Two tiers:
//   NAV  — compact (18–24px), custom SVG paths with forest green stroke system
//   FEAT — large (48–64px), isometric 3D cube-face treatment
//
// Light source: UPPER-LEFT throughout.
// Color convention:
//   Top face    → lightest  (#5DA090 / #F2A747)
//   Front face  → mid-tone  (#2D6455 / #C97B2F)
//   Right face  → darkest   (#152F28 / #A04010)
//   Highlight   → 1px white rgba(255,255,255,0.35) on lit edges

// ───────────────────────────────────────────────────────────────────────────
// NAV ICONS — distinctive, non-generic, match the product's visual language
// ───────────────────────────────────────────────────────────────────────────

interface NavIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Trees / Dashboard — a miniature bifurcating tree */
export function TreeNavIcon({ size = 20, color = 'currentColor', className }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      {/* Trunk */}
      <path d="M10 19 L10 13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Left branch */}
      <path d="M10 14 Q7.5 12 5 9.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      {/* Right branch */}
      <path d="M10 14 Q12.5 12 15 9.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      {/* Center branch */}
      <path d="M10 13 L10 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Nodes */}
      <circle cx="10" cy="5.5" r="2.5" fill={color} />
      <circle cx="4" cy="8.5" r="2" fill={color} opacity="0.75" />
      <circle cx="16" cy="8.5" r="2" fill={color} opacity="0.75" />
      {/* Root line */}
      <line x1="7" y1="19" x2="13" y2="19" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

/** People — overlapping person silhouettes */
export function PeopleNavIcon({ size = 20, color = 'currentColor', className }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      {/* Back person */}
      <circle cx="13" cy="5.5" r="2.5" stroke={color} strokeWidth="1.5" opacity="0.55" />
      <path d="M7.5 19 Q7.5 13 13 13 Q18.5 13 18.5 19"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.55" fill="none" />
      {/* Front person */}
      <circle cx="7.5" cy="6" r="3" stroke={color} strokeWidth="1.75" fill="var(--bg-surface)" />
      <path d="M0.5 19 Q0.5 12 7.5 12 Q14.5 12 14.5 19"
        stroke={color} strokeWidth="1.75" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Media — polaroid-style photo stack */
export function MediaNavIcon({ size = 20, color = 'currentColor', className }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      {/* Back frame (rotated) */}
      <rect x="3.5" y="2" width="12" height="14" rx="1.5"
        stroke={color} strokeWidth="1.5" opacity="0.4"
        transform="rotate(-6 9.5 9)" />
      {/* Front frame */}
      <rect x="4" y="4" width="12" height="14" rx="1.5"
        stroke={color} strokeWidth="1.75" fill="var(--bg-surface)" />
      {/* Photo scenery — mountain + sun */}
      <path d="M5.5 14.5 L9 10 L12 13 L14.5 10.5 L16 14.5 Z"
        fill={color} opacity="0.3" />
      <circle cx="7.5" cy="8.5" r="1.5" fill={color} opacity="0.5" />
    </svg>
  );
}

/** Search — magnifier with organic shape */
export function SearchNavIcon({ size = 20, color = 'currentColor', className }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="8.5" cy="8.5" r="5.5" stroke={color} strokeWidth="1.75" />
      <path d="M13 13 L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Inner detail */}
      <circle cx="7" cy="7" r="1.5" fill={color} opacity="0.25" />
    </svg>
  );
}

/** Settings — custom gear, not the generic cog */
export function SettingsNavIcon({ size = 20, color = 'currentColor', className }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      {/* Outer ring with tabs */}
      <path
        d="M10 2 L11.5 4 L14 3.5 L15.5 5.5 L18 6 L17.5 8.5 L19 10 L17.5 11.5 L18 14 L15.5 14.5 L14 16.5 L11.5 16 L10 18 L8.5 16 L6 16.5 L4.5 14.5 L2 14 L2.5 11.5 L1 10 L2.5 8.5 L2 6 L4.5 5.5 L6 3.5 L8.5 4 Z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      <circle cx="10" cy="10" r="3" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/** Shield / Privacy — rounded shield with a subtle lock mark */
export function PrivacyNavIcon({ size = 20, color = 'currentColor', className }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M10 2 L17 5 L17 10.5 C17 14.5 13.5 17.5 10 18.5 C6.5 17.5 3 14.5 3 10.5 L3 5 Z"
        stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      {/* Check mark inside */}
      <path d="M7 10 L9 12 L13 8"
        stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Admin / Shield-alert */
export function AdminNavIcon({ size = 20, color = 'currentColor', className }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M10 2 L17 5 L17 10.5 C17 14.5 13.5 17.5 10 18.5 C6.5 17.5 3 14.5 3 10.5 L3 5 Z"
        stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <line x1="10" y1="8" x2="10" y2="11.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="10" cy="13.5" r="0.9" fill={color} />
    </svg>
  );
}

/** DNA — double helix, matches the stroke weight/rounding of the other nav icons */
export function DnaNavIcon({ size = 20, color = 'currentColor', className }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      {/* Two interleaving strands */}
      <path
        d="M6 2 C6 5, 14 5, 14 8 C14 11, 6 11, 6 14 C6 17, 14 17, 14 18"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path
        d="M14 2 C14 5, 6 5, 6 8 C6 11, 14 11, 14 14 C14 17, 6 17, 6 18"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Rungs at each crossing */}
      <line x1="6.6" y1="4.1" x2="13.4" y2="4.1" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
      <line x1="6" y1="8" x2="14" y2="8" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
      <line x1="6.6" y1="11.9" x2="13.4" y2="11.9" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
      <line x1="6" y1="15.9" x2="14" y2="15.9" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// FEATURE ICONS — isometric 3D cube-face treatment (48–64px)
// Used in landing page feature sections, onboarding steps, empty states
// ───────────────────────────────────────────────────────────────────────────

interface FeatureIconProps {
  size?: number;
  className?: string;
}

/** Privacy vault — a physical safe door for the "Private by default" feature */
export function VaultFeatureIcon({ size = 56, className }: FeatureIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
      <defs>
        <linearGradient id="fi-vault-top" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A8A78" />
          <stop offset="100%" stopColor="#3E8A75" />
        </linearGradient>
        <linearGradient id="fi-vault-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2D6455" />
          <stop offset="100%" stopColor="#1E4037" />
        </linearGradient>
        <linearGradient id="fi-vault-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#152F28" />
          <stop offset="100%" stopColor="#0D2118" />
        </linearGradient>
        <linearGradient id="fi-vault-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F2A747" />
          <stop offset="100%" stopColor="#C97B2F" />
        </linearGradient>
        <filter id="fi-vault-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#091810" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter="url(#fi-vault-shadow)">
        {/* Right face */}
        <polygon points="38,12 50,18 50,44 38,38" fill="url(#fi-vault-right)" />
        {/* Top face */}
        <polygon points="18,8 38,12 50,18 30,14" fill="url(#fi-vault-top)" />
        {/* Front face (door) */}
        <rect x="8" y="14" width="30" height="30" rx="2" fill="url(#fi-vault-front)" />
        {/* Door frame detail */}
        <rect x="11" y="17" width="24" height="24" rx="1.5"
          stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="rgba(0,0,0,0.12)" />
        {/* Handle wheel */}
        <circle cx="23" cy="29" r="7" stroke="url(#fi-vault-amber)" strokeWidth="2" fill="none" />
        <circle cx="23" cy="29" r="3" fill="url(#fi-vault-amber)" />
        {/* Spokes */}
        <line x1="23" y1="22" x2="23" y2="36" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        <line x1="16" y1="29" x2="30" y2="29" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        {/* Bolt indicators */}
        <circle cx="35" cy="19" r="1.5" fill="rgba(255,255,255,0.2)" />
        <circle cx="35" cy="39" r="1.5" fill="rgba(255,255,255,0.2)" />
        {/* Top highlight */}
        <line x1="8" y1="14" x2="38" y2="14" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" />
        <line x1="8" y1="14" x2="8" y2="44" stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" />
      </g>
    </svg>
  );
}

/** Collaboration — two people connected by an amber thread */
export function CollabFeatureIcon({ size = 56, className }: FeatureIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
      <defs>
        <radialGradient id="fi-person-a" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#5DA090" />
          <stop offset="100%" stopColor="#1E4037" />
        </radialGradient>
        <radialGradient id="fi-person-b" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#F2A747" />
          <stop offset="100%" stopColor="#C97B2F" />
        </radialGradient>
        <linearGradient id="fi-thread" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A8A78" />
          <stop offset="50%" stopColor="#C97B2F" />
          <stop offset="100%" stopColor="#4A8A78" />
        </linearGradient>
        <filter id="fi-collab-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#091810" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#fi-collab-shadow)">
        {/* Connecting thread */}
        <path d="M19 22 Q28 15 37 22" stroke="url(#fi-thread)" strokeWidth="2"
          strokeDasharray="3 2" strokeLinecap="round" />
        {/* Left person — forest */}
        <circle cx="13" cy="14" r="7" fill="url(#fi-person-a)" />
        <path d="M3 42 Q3 28 13 28 Q23 28 23 42" fill="url(#fi-person-a)" opacity="0.6" />
        {/* Right person — amber */}
        <circle cx="43" cy="14" r="7" fill="url(#fi-person-b)" />
        <path d="M33 42 Q33 28 43 28 Q53 28 53 42" fill="url(#fi-person-b)" opacity="0.6" />
        {/* Highlight on circles */}
        <circle cx="10.5" cy="11.5" r="2" fill="rgba(255,255,255,0.35)" />
        <circle cx="40.5" cy="11.5" r="2" fill="rgba(255,255,255,0.35)" />
        {/* Connection node at midpoint */}
        <circle cx="28" cy="15.5" r="3" fill="#C97B2F" opacity="0.9" />
      </g>
    </svg>
  );
}

/** AI Research — a magnifier over a tree branch with a "hint" sparkle */
export function AIFeatureIcon({ size = 56, className }: FeatureIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
      <defs>
        <linearGradient id="fi-ai-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3E8A75" />
          <stop offset="100%" stopColor="#152F28" />
        </linearGradient>
        <linearGradient id="fi-ai-branch" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#2D6455" />
          <stop offset="100%" stopColor="#4A8A78" />
        </linearGradient>
        <filter id="fi-ai-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#091810" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#fi-ai-shadow)">
        {/* Tree branch */}
        <path d="M14 50 L14 34 Q14 24 24 20" stroke="url(#fi-ai-branch)" strokeWidth="4"
          strokeLinecap="round" />
        <path d="M14 38 Q20 32 28 30" stroke="url(#fi-ai-branch)" strokeWidth="3"
          strokeLinecap="round" />
        {/* Node on branch */}
        <circle cx="24" cy="20" r="4" fill="#C97B2F" />
        <circle cx="28" cy="30" r="3.5" fill="#2D6455" />
        {/* Magnifier */}
        <circle cx="36" cy="24" r="12" stroke="url(#fi-ai-glass)" strokeWidth="3"
          fill="rgba(45,100,85,0.1)" />
        <line x1="45" y1="33" x2="53" y2="41" stroke="url(#fi-ai-glass)" strokeWidth="3.5"
          strokeLinecap="round" />
        {/* Sparkle inside magnifier */}
        <path d="M36 18 L37.2 22.8 L42 24 L37.2 25.2 L36 30 L34.8 25.2 L30 24 L34.8 22.8 Z"
          fill="#F2A747" opacity="0.9" />
      </g>
    </svg>
  );
}

/** GEDCOM / Export — a document with a tree watermark */
export function ExportFeatureIcon({ size = 56, className }: FeatureIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
      <defs>
        <linearGradient id="fi-doc-top" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#5DA090" />
          <stop offset="100%" stopColor="#4A8A78" />
        </linearGradient>
        <linearGradient id="fi-doc-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EFF7F4" />
          <stop offset="100%" stopColor="#D8EDE8" />
        </linearGradient>
        <linearGradient id="fi-doc-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B0D8CC" />
          <stop offset="100%" stopColor="#78BEA8" />
        </linearGradient>
        <filter id="fi-doc-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#091810" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#fi-doc-shadow)">
        {/* Page right face */}
        <polygon points="40,10 50,15 50,50 40,45" fill="url(#fi-doc-right)" />
        {/* Page top face */}
        <polygon points="16,6 40,10 50,15 26,11" fill="url(#fi-doc-top)" />
        {/* Page front */}
        <rect x="6" y="11" width="34" height="39" rx="2" fill="url(#fi-doc-front)" />
        {/* Folded corner */}
        <polygon points="34,11 40,11 40,17" fill="#A3C0B8" />
        {/* Mini tree watermark on page */}
        <path d="M23 44 L23 36 Q23 30 28 28" stroke="#2D6455" strokeWidth="1.5"
          strokeLinecap="round" opacity="0.4" />
        <path d="M23 40 Q26 36 29 34" stroke="#2D6455" strokeWidth="1.25"
          strokeLinecap="round" opacity="0.4" />
        <circle cx="28" cy="27" r="2.5" fill="#C97B2F" opacity="0.5" />
        {/* Lines of text */}
        <rect x="10" y="17" width="18" height="2" rx="1" fill="#2D6455" opacity="0.3" />
        <rect x="10" y="22" width="14" height="2" rx="1" fill="#2D6455" opacity="0.2" />
        <rect x="10" y="27" width="20" height="2" rx="1" fill="#2D6455" opacity="0.2" />
        {/* Top highlight */}
        <line x1="6" y1="11" x2="34" y2="11" stroke="rgba(255,255,255,0.6)" strokeWidth="0.75" />
      </g>
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// EMPTY STATE ILLUSTRATIONS — SVG scenes, not generic icons
// ───────────────────────────────────────────────────────────────────────────

/** No trees yet — a single seedling waiting to grow */
export function EmptySeedlingIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <radialGradient id="es-soil" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="#C97B2F" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#C97B2F" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="es-glow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#4A8A78" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#4A8A78" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Glow */}
      <ellipse cx="60" cy="80" rx="45" ry="30" fill="url(#es-glow)" />
      {/* Soil */}
      <ellipse cx="60" cy="95" rx="32" ry="8" fill="url(#es-soil)" />
      {/* Ground arc */}
      <path d="M28 95 Q60 88 92 95" stroke="#D1E0DA" strokeWidth="2" fill="none" />
      {/* Stem */}
      <path d="M60 95 L60 65" stroke="#2D6455" strokeWidth="3" strokeLinecap="round" />
      {/* Left leaf */}
      <path d="M60 72 Q50 65 46 58 Q55 60 60 68 Z"
        fill="#3E8A75" opacity="0.9" />
      {/* Right leaf */}
      <path d="M60 78 Q72 72 76 64 Q67 68 60 76 Z"
        fill="#2D6455" opacity="0.9" />
      {/* Tiny bud */}
      <circle cx="60" cy="63" r="4" fill="#C97B2F" opacity="0.85" />
      <circle cx="58.5" cy="61.5" r="1.2" fill="rgba(255,255,255,0.4)" />
      {/* Ambient dots */}
      <circle cx="34" cy="72" r="2" fill="#D1E0DA" opacity="0.6" />
      <circle cx="88" cy="68" r="1.5" fill="#D1E0DA" opacity="0.4" />
      <circle cx="78" cy="82" r="1" fill="#D1E0DA" opacity="0.5" />
    </svg>
  );
}

/** No people in tree — three empty node outlines */
export function EmptyPeopleIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Branches */}
      <path d="M60 100 L60 75" stroke="#D1E0DA" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 80 Q45 72 30 62" stroke="#D1E0DA" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 80 Q75 72 90 62" stroke="#D1E0DA" strokeWidth="2.5" strokeLinecap="round" />
      {/* Empty node circles — dashed */}
      <circle cx="60" cy="52" r="10" stroke="#B0D8CC" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="30" cy="55" r="8" stroke="#B0D8CC" strokeWidth="1.75" strokeDasharray="3 3" />
      <circle cx="90" cy="55" r="8" stroke="#B0D8CC" strokeWidth="1.75" strokeDasharray="3 3" />
      {/* Plus signs inside empty nodes */}
      <line x1="56" y1="52" x2="64" y2="52" stroke="#B0D8CC" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="48" x2="60" y2="56" stroke="#B0D8CC" strokeWidth="2" strokeLinecap="round" />
      <line x1="27" y1="55" x2="33" y2="55" stroke="#B0D8CC" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="30" y1="52" x2="30" y2="58" stroke="#B0D8CC" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="87" y1="55" x2="93" y2="55" stroke="#B0D8CC" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="90" y1="52" x2="90" y2="58" stroke="#B0D8CC" strokeWidth="1.5" strokeLinecap="round" />
      {/* Ground */}
      <ellipse cx="60" cy="102" rx="25" ry="5" fill="#EFF7F4" />
    </svg>
  );
}

/** No media — an empty frame with faded mountain scene */
export function EmptyMediaIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Back frame */}
      <rect x="25" y="20" width="60" height="70" rx="4"
        stroke="#D1E0DA" strokeWidth="2" strokeDasharray="5 3" fill="#F7FAF9" />
      {/* Mountain silhouette (faded) */}
      <path d="M32 82 L50 55 L62 70 L74 48 L88 82 Z"
        fill="#EFF7F4" stroke="#D1E0DA" strokeWidth="1" />
      {/* Sun */}
      <circle cx="72" cy="42" r="6" fill="#FAF0E0" stroke="#E4DDD0" strokeWidth="1" />
      {/* Mount indicator */}
      <circle cx="45" cy="62" r="3" fill="#D1E0DA" />
      {/* Corner mounts */}
      {[30, 79].flatMap(x => [25, 83].map(y =>
        `M${x},${y} L${x+3},${y} L${x+3},${y+3}` // removed JSX
      ))}
      <path d="M30,25 L30,28 L27,28" stroke="#B0D8CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30,88 L30,85 L27,85" stroke="#B0D8CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M90,25 L90,28 L87,28" stroke="#B0D8CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M90,88 L90,85 L87,85" stroke="#B0D8CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Plus */}
      <circle cx="60" cy="60" r="14" fill="rgba(45,100,85,0.06)" stroke="#B0D8CC" strokeWidth="1.5" />
      <line x1="55" y1="60" x2="65" y2="60" stroke="#4A8A78" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="55" x2="60" y2="65" stroke="#4A8A78" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
