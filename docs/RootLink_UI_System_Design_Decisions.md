# UI & System Design Decisions — RootLink

**"Rooted Modernity" — the design system's name, philosophy, and implementation.**

This document exists so a future contributor (human or AI) can extend RootLink's interface consistently without having to reverse-engineer the system from finished screens. It covers *why* each decision was made, not just what the resulting code looks like — a design system is only as durable as the reasoning behind it survives being written down.

---

## 1. Design Philosophy

### 1.1 Where the language came from

The visual identity was derived by studying a small set of reference products for what made each of them feel deliberate rather than templated, then asking what RootLink's own product truth would look like expressed the same way:

- **Physical weight as a trust signal** (from a booking-app reference): a chunky pill navigation, an escrow-style payment card with real depth — the interface *feels* secure before you read a word about security.
- **Numbers as the protagonist** (from a logistics-dashboard reference): large tabular figures given more visual weight than their labels, because the data is the point, not the chrome around it.
- **Genuine dimensionality where the product is genuinely dimensional** (from an industrial/infrastructure reference): real isometric objects used because the underlying product is itself physical infrastructure — the lesson taken was not "add 3D everywhere" but "use dimensional treatment where the product's own subject matter is dimensional."
- **Contextual awareness** (from an HR-dashboard reference): the interface visibly knows what day it is, what's due, what's relevant right now.

### 1.2 RootLink's own answer: "Rooted Modernity"

A family tree is simultaneously an heirloom (something with weight, history, warmth) and a piece of software (something that should feel current, fast, uncondescending). Most genealogy products pick one of these — either a dated, "serious archive" aesthetic, or a generic SaaS-template look with a tree icon bolted on. Rooted Modernity is the deliberate attempt to hold both at once: **heritage gets warmth and weight; the interface itself doesn't slow down for it.**

Concretely, this resolved into a small number of hard rules that everything else in this document follows from:

1. The palette is warm, not corporate-cold — no pure white, no neutral gray shadows.
2. The brand mark must encode the product's actual function (a pedigree chart), not stand in for it with an unrelated decorative icon.
3. Any surface gets deliberately assigned to one of three contextual modes (§3) rather than defaulting to "whatever the last screen used."
4. Nothing generic ships where something specific was affordable to build instead — this is why a custom icon system (§4) and custom loading/empty states (§6) exist rather than reaching for a stock icon library and spinner everywhere.

---

## 2. The Token System

All tokens are CSS custom properties defined in [`apps/web/src/styles/globals.css`](../apps/web/src/styles/globals.css) and mirrored into Tailwind's theme in [`apps/web/tailwind.config.ts`](../apps/web/tailwind.config.ts), so both raw CSS (`style={{ color: 'var(--text-primary)' }}`) and Tailwind utility classes (`className="bg-forest-700"`) resolve to the same values.

### 2.1 Color

```css
/* Surfaces */
--bg-base:    #F7F5F1;   /* warm bone — not pure white, has ground texture */
--bg-surface: #FFFFFF;
--bg-subtle:  #EFF4F0;   /* whisper of forest */
--bg-muted:   #E4EDE9;

/* Text */
--text-primary:   #0E1C18;   /* near-black, green undertone, not pure black */
--text-secondary: #2B4A40;
--text-muted:     #5A7A72;
--text-faint:     #92ABA4;

/* Brand — Forest */
--accent-primary:  #152F28;   /* deep forest — authority, sidebar, hero bg */
--accent-grove:    #1E4037;   /* hover states */
--accent-canopy:   #2D6455;   /* interactive elements */
--accent-leaf:     #4A8A78;   /* highlights */

/* Brand — Amber */
--accent-ember:       #C97B2F;   /* warm amber CTA */
--accent-ember-light: #E8941F;   /* hover */
--accent-ember-soft:  #FAF0E0;   /* backgrounds */
```

**Why near-black-with-green-undertone instead of pure black for `--text-primary`:** pure black (`#000`) against a warm bone background reads as sterile and disconnects the text from the palette around it. `#0E1C18` carries the same forest undertone as the brand colors, so headline text feels like part of the same world as the buttons and icons beneath it, not a generic default the design system forgot to override.

**Why shadows are warm-tinted, not neutral gray:**

```css
--shadow-sm: 0 1px 3px rgba(14, 28, 24, 0.06), 0 2px 8px rgba(14, 28, 24, 0.04);
--shadow-md: 0 4px 12px rgba(14, 28, 24, 0.08), 0 2px 4px rgba(14, 28, 24, 0.05);
--shadow-lg: 0 12px 40px rgba(14, 28, 24, 0.12), 0 4px 12px rgba(14, 28, 24, 0.06);
```

The shadow color (`rgba(14, 28, 24, ...)`) is the same value as `--text-primary`, not a generic `rgba(0,0,0,...)`. A shadow cast in the same hue as the page's ink color reads as *the page's own shadow*, not a CSS default nobody thought to change — this is a small thing that shows up in almost every card and button in the product and is one of the more effective "does this look templated or considered" signals in the whole system.

### 2.2 Typography

```css
--font-display: 'Playfair Display', Georgia, serif;   /* headings — editorial warmth */
--font-body:    'DM Sans', system-ui, sans-serif;      /* everything else — clean, humanist */
--font-mono:    'DM Mono', Menlo, monospace;           /* dates, IDs, eyebrow labels, code */
```

A serif display face for headings is a deliberate rejection of the sans-serif-everything convention common to SaaS templates — it's the single fastest way to make a screen feel like it belongs to a heritage product rather than a generic dashboard, without touching layout or color at all.

### 2.3 The 3D button system

Buttons use a real bottom-edge shadow that visually functions as the button's own depth, and collapses when pressed — not just an opacity or scale change on `:hover`/`:active`.

```css
.btn-primary {
  background: var(--gradient-canopy);
  color: #fff;
  border-color: rgba(255,255,255,0.08);
  box-shadow: var(--shadow-btn-primary);   /* 0 2px 0 #0A1F1A, 0 4px 16px rgba(21,47,40,0.35) */
  transform: translateY(-1px);
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
.btn-primary:hover {
  background: linear-gradient(135deg, #2D6455, #1E4037);
  transform: translateY(-2px);
  box-shadow: 0 3px 0 #0A1F1A, 0 6px 24px rgba(21, 47, 40, 0.45);
}
.btn-primary:active {
  box-shadow: 0 0 0 #0A1F1A, 0 2px 8px rgba(21, 47, 40, 0.25);
}
```

The `0 2px 0 #0A1F1A` component of the shadow is a flat, zero-blur offset — this is what reads as a physical bottom edge rather than a soft glow. On `:active`, that offset collapses to `0 0 0`, which combined with `transform: translateY(1px)` (set globally on `.btn:active`) creates the illusion of the button physically depressing into the surface. This is the mechanism behind every "3D button" in the product; there is no separate implementation per button variant, only different color values fed into the same shadow shape (`.btn-amber` uses the identical structure with amber hex values).

### 2.4 Card system

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.25s var(--ease-out), transform 0.25s var(--ease-out);
}
.card:hover { box-shadow: var(--shadow-card-hover); }
```

`--shadow-card` includes an inset highlight (`0 1px 0 rgba(255,255,255,0.9) inset`) in addition to the drop shadow — a 1px light line along the card's top inner edge, simulating a subtle bevel as if light is catching the top of a slightly raised surface. This is easy to miss at a glance and is exactly the kind of detail meant to be felt rather than consciously noticed.

---

## 3. The Three-Mode System

Every screen in the product is deliberately assigned to one of three modes. A new screen should be assigned a mode explicitly during design, not left to inherit whatever the previous screen happened to use.

| Mode | Palette | Used for | Examples |
|---|---|---|---|
| **Grove** | Dark forest gradient (`--gradient-hero` / `--gradient-grove`), amber accents on dark | High-emotion or high-stakes moments: first impressions, decision points, privileged areas | Landing page hero, onboarding sidebar, admin sidebar, public-tree-page header/footer, 404/error pages when outside the app shell |
| **Vault** | Warm bone (`--bg-base`, `--bg-subtle`), forest/amber accents on light | Archival, reading, or reflective contexts | Blog, marketing sub-pages, the canvas area of the public shared-tree page |
| **Workbench** | Clean white (`--bg-surface`), minimal warmth, precision-first | Editing, data-dense, task-focused contexts | Dashboard, admin content area, forms, settings |

**Why a dark section deliberately reappears at both the top and bottom of the public tree-sharing page, with a light section in between:** this is the clearest single example of the mode system in practice. The Grove header establishes trust and brand identity before a stranger (who may have no relationship with RootLink at all, having only received a link) sees any actual family data. The Vault canvas in the middle is where the actual content lives, rendered without competing visual noise. The Grove footer closes with a product CTA — the same dark/light/dark rhythm the admin dashboard uses for a different reason (privileged-area signaling) turns up here for a trust-and-conversion reason instead. The mode is chosen for what the *moment* needs, not applied uniformly by rote.

---

## 4. Icon System

Generic icon libraries (`lucide-react` is used elsewhere in the app for purely functional, non-brand glyphs — a close button, a chevron) are deliberately not used for anything that represents the *brand* or a *primary feature category*. Two custom tiers exist instead, both in [`apps/web/src/components/brand/icons/index.tsx`](../apps/web/src/components/brand/icons/index.tsx).

### 4.1 NavIcon tier (18–24px)

Compact, single-color, stroke-based icons for navigation. Each is built to be *specific* rather than a generic stand-in — `TreeNavIcon`, for instance, is not a generic tree silhouette but a miniature version of the product's own bifurcating pedigree shape:

```tsx
export function TreeNavIcon({ size = 20, color = 'currentColor', className }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M10 19 L10 13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M10 14 Q7.5 12 5 9.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M10 14 Q12.5 12 15 9.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M10 13 L10 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="5.5" r="2.5" fill={color} />
      <circle cx="4" cy="8.5" r="2" fill={color} opacity="0.75" />
      <circle cx="16" cy="8.5" r="2" fill={color} opacity="0.75" />
      <line x1="7" y1="19" x2="13" y2="19" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}
```

Every `NavIcon` accepts `color` as a prop rather than hardcoding a fill — this is what lets the same icon component serve both the light Workbench sidebar (rendered in `var(--text-muted)`) and the dark Grove admin sidebar (rendered in `rgba(255,255,255,0.5)`) without needing two separate icon components.

### 4.2 FeatureIcon tier (48–64px)

Larger, isometric, multi-tone icons for marketing feature sections. These use a genuine (if simplified) 3-face isometric treatment — a top face, a front face, and a right/side face, each a different tone of the same gradient family, lit consistently from the upper-left:

```tsx
// VaultFeatureIcon (excerpt) — a physical safe door standing in for "Privacy first"
<polygon points="38,12 50,18 50,44 38,38" fill="url(#fi-vault-right)" />   {/* darkest — right face */}
<polygon points="18,8 38,12 50,18 30,14" fill="url(#fi-vault-top)" />      {/* lightest — top face */}
<rect x="8" y="14" width="30" height="30" rx="2" fill="url(#fi-vault-front)" />  {/* mid-tone — front face */}
```

**The lighting convention — top face lightest, front face mid-tone, right/side face darkest, light source upper-left — is fixed across every `FeatureIcon` and the brand logo itself.** This consistency is what makes four otherwise-unrelated icons (a safe door, two connected figures, a magnifying glass, a document) read as belonging to the same object family rather than four different artists' work.

### 4.3 Illustrated empty-state scenes

A third, even less icon-like tier exists for empty states — small narrative SVG scenes rather than symbols. `EmptySeedlingIllustration`, for instance, renders a soil line, a stem, two leaves, and a small amber bud, aiming for "something is about to grow here" rather than a crossed-out folder or a generic "0 results" glyph. See §6.2.

---

## 5. Brand Mark

The logo (`RootLinkIcon` / `RootLinkLogo`, in [`apps/web/src/components/brand/Logo.tsx`](../apps/web/src/components/brand/Logo.tsx)) is not a decorative tree glyph — it is a literal, miniature pedigree chart:

- An isometric trunk rendered with three faces (front/right/top), matching the same lighting convention as the FeatureIcon tier.
- Branches reaching to outer nodes (ancestors, rendered in forest green).
- A single amber center node at the top — **"you," the root of your own tree** — larger and warmer than the others, because the product's core idea is that every user's tree starts from themselves, not from a distant ancestor.
- Amber root tendrils below a ground line, representing heritage beneath the surface.

```tsx
export function RootLinkLogo({ size = 'md', inverted = false, className = '' }: {...}) {
  const rootColor = inverted ? '#FFFFFF' : 'var(--accent-primary)';
  const linkColor = inverted ? 'rgba(255,255,255,0.75)' : 'var(--accent-canopy)';
  return (
    <div className={`flex items-center ${SIZE[size].gap} ${className}`}>
      <RootLinkIcon size={SIZE[size].icon} />
      <div className="flex items-baseline leading-none">
        <span className={`font-display font-bold tracking-tight ${SIZE[size].text}`} style={{ color: rootColor }}>Root</span>
        <span className={`font-display font-normal tracking-tight ${SIZE[size].text}`} style={{ color: linkColor }}>Link</span>
      </div>
    </div>
  );
}
```

**Why "Root" is bold and "Link" is not:** a small typographic choice that reinforces the same idea as the amber center node — the wordmark itself visually emphasizes the *root* half of the name, which is the half that's actually about the person and their heritage, over the *link* half, which is more about the mechanism of connection.

**Every usage of the logo across the entire product must go through this component.** A recurring, explicitly-tracked defect during development (see the [bugs & security report](./RootLink_Bugs_And_Security_Fixes.md), Milestone 21 Fix 1) was pages quietly reverting to a generic `lucide-react` `TreePine` icon wrapped in a colored square — this happened because that pattern was easy to copy-paste from an older page. There is no longer a legitimate reason for that pattern to exist anywhere in the codebase; if it reappears, it's a regression, not a stylistic choice.

---

## 6. Edge Cases

### 6.1 Loading states

Generic spinners are banned in favor of `BranchLoader` — an SVG pedigree branch that draws itself in a repeating loop (trunk grows, two branches extend, three nodes bloom in sequence), in [`apps/web/src/components/ui/BrandedLoader.tsx`](../apps/web/src/components/ui/BrandedLoader.tsx):

```tsx
<svg width={cfg.w} height={cfg.h} viewBox="0 0 120 90" fill="none" aria-label="Loading">
  <line x1="60" y1="85" x2="60" y2="55" stroke={color} strokeWidth={cfg.stroke}
    strokeLinecap="round" pathLength={1} className="bl-trunk" />
  {/* ...branches and nodes, each with a staggered animation-delay... */}
</svg>
```

Four sizes exist (`sm`/`md`/`lg`/`page`), and a dedicated `PageLoader` wraps the `page` size with a deliberate **180ms display delay** — a loader that appears and disappears within 180ms reads as a flash/flicker, not as helpful feedback, so fast-resolving loads never show a loading state at all rather than showing one for a single frame.

For list/table content specifically, `SkeletonCard` and `SkeletonRow` provide shimmer placeholders shaped like the real content, rather than a centered spinner — this lets a user perceive the eventual layout before the data arrives.

### 6.2 Empty states

Every empty state in the product goes through the shared `EmptyState` component ([`apps/web/src/components/ui/EmptyState.tsx`](../apps/web/src/components/ui/EmptyState.tsx)), which pairs an illustrated SVG scene with warm, specific copy and exactly one action:

```tsx
const CONTENT: Record<EmptyStateProps['variant'], {...}> = {
  trees: {
    illustration: <EmptySeedlingIllustration size={120} />,
    headline: 'Your first tree is waiting to grow',
    body: 'Every family has a story that starts somewhere. Yours starts here — with your name, and whatever you know right now. You can always add more.',
  },
  // ...people, media, search, notifications, audit
};
```

**Copy rule for empty states:** never bureaucratic ("No records found"), never falsely urgent, never apologetic. The tone is closer to "here's what this space is for" than "here's what's missing." This is a deliberate departure from typical SaaS empty-state copy, which tends toward either clinical (`No data`) or artificially cheerful (`Whoops! Nothing here yet! 🎉`) — RootLink's is meant to read as calm and a little bit warm, matching a heritage product rather than a productivity tool.

### 6.3 Error boundaries and 404s

Both `not-found.tsx` and `error.tsx` extend the branch metaphor rather than using a generic "Oops" illustration:

- **404** — a branch drawn reaching toward a *dashed, question-marked node* — the visual language for "this record doesn't exist" is literally the same visual language the product uses for an unresearched ancestor, which is a coherent metaphor a generic 404 page can't achieve. The page auto-detects whether it's being shown inside the authenticated app or on a public marketing route, and switches between Workbench and Grove mode accordingly:

```tsx
useEffect(() => {
  const path = window.location.pathname;
  const appPaths = ['/dashboard', '/trees', '/admin', '/people', '/media', '/search', '/settings'];
  setDark(!appPaths.some(p => path.startsWith(p)));
}, []);
```

- **Error boundary** — a tilted brand icon ("the branch snapped") plus a `reset()` retry button and the error's `digest` surfaced in the UI for support purposes, without exposing a raw stack trace to the end user.

### 6.4 Reduced motion

Every animation in the system is written to check `prefers-reduced-motion` — both as a global CSS media query fallback and, for the more complex sequenced animations (the landing page's `HeroTree`, the onboarding flow's mini-tree preview), as an explicit JS check that swaps the entire animated sequence for its final resting state rather than merely speeding it up:

```tsx
useEffect(() => {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  setReduced(mql.matches);
  if (mql.matches) { setStep(99); return; }   // jump straight to the fully-drawn end state
  // ...otherwise run the real timed sequence
}, []);
```

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

The global CSS rule is a safety net; the explicit per-component check exists because some animations (like the hero tree's staggered multi-second draw sequence) look actively broken if merely sped up to near-zero duration rather than deliberately jumped to their final frame — a stroke-dashoffset animation compressed to 0.01ms can flash unstyled paths for a frame before settling, which the explicit JS branch avoids entirely.

### 6.5 Page transitions and shell boundaries

`PageTransition` ([`apps/web/src/components/layout/PageTransition.tsx`](../apps/web/src/components/layout/PageTransition.tsx)) is inserted **inside each shell layout's own content slot**, never at the root layout:

```tsx
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={pathname} variants={variants}
        initial="initial" animate="animate" exit="exit"
        transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Why this must never move to the root layout:** the root layout wraps every route group — marketing, auth, app, admin — each with completely different persistent chrome (or none at all). If `AnimatePresence` wrapped everything from the root, navigating from one dashboard page to another would force the *entire page, including the still-mounted sidebar*, to unmount and remount on every click, which reads as broken rather than smooth. Each shell layout (app, admin, marketing, auth) instead wraps only its own `{children}` — the sidebar/header/footer in each shell stay mounted and static; only the content beneath them cross-fades. This was itself a fixed bug (see the bugs report, Milestone 21 Fix 3) — an earlier, CSS-only approach (`animate-page-in`) never actually fired on client-side navigation at all, only on the very first page load, because CSS animations don't re-trigger when React swaps an already-mounted element's children.

### 6.6 Accessibility floor for the tree canvas

The tree canvas (D3-rendered, the product's most complex interactive surface) maintains three independent layers of accessibility, deliberately redundant rather than relying on any single one being sufficient:

1. Every rendered node carries `tabindex`, `role="button"`, a computed `aria-label`, and `keydown` handling for Enter/Space — real keyboard navigation, not just visual focus styling.
2. The outer `<svg>` uses `role="application"` (not `role="img"`, which would suppress the individually-focusable children) with a label that includes literal navigation instructions.
3. A visually-hidden (`sr-only`) but fully native `<ul>` of real `<button>` elements — one per person — sits alongside the canvas as a guaranteed-robust fallback that doesn't depend on how well a given screen reader handles focus inside nested SVG.

This three-layer redundancy is deliberate: layers 1–2 serve the common case well; layer 3 exists specifically because SVG accessibility support varies meaningfully across browser/AT combinations, and a heritage product's primary interactive surface being inaccessible to some users is not an acceptable degradation to accept silently.

---

## 7. Component Extension Checklist

Before adding a new page or component to RootLink, the following should be deliberately decided, not defaulted:

1. **Which of the three modes (§3) does this surface belong to?**
2. **Does this need a brand-facing icon?** If so, does an existing `NavIcon`/`FeatureIcon` fit, or does a new one need to be drawn following the same lighting convention (§4.2)?
3. **What does this look like empty?** Every list/collection view should have a real `EmptyState` variant, not a blank space or a bare text string.
4. **What does this look like while loading?** `BranchLoader` or a `Skeleton*` placeholder, never a bare spinner or a blank flash.
5. **Does this need a page-level transition?** If it's a route, it should already inherit `PageTransition` from its shell layout — verify it's actually inside one of the four shells (app/admin/marketing/auth), not a route that accidentally sits outside all of them.
6. **Is this animated?** If so, confirm both the CSS-level and (if the animation is a multi-step JS sequence) the JS-level `prefers-reduced-motion` handling are in place.
