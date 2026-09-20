# Inventory: rootlink

Generated 2026-09-20T11:16:39 · 167 files scanned · UI roots: all

> Static regex scan. Cannot resolve runtime styles, theme indirection, class names assembled from variables, third-party component internals, or rendered output. Numbers mean 'found in source', not 'on screen'.

## Stack

- Frameworks: Next.js, React
- UI/animation/chart libraries: Radix, Recharts, Tailwind, clsx, d3, framer-motion, tailwind-merge
- Icon libraries: lucide-react
- Other: -
- Monorepo: yes (Turborepo, npm/yarn workspaces)

### Packages

| Path | Name | Kind (heuristic) |
|---|---|---|
| . | rootlink | other |
| apps/api | @rootlink/api | other |
| apps/web | @rootlink/web | web |
| apps/web-e2e | @rootlink/web-e2e | other |
| packages/db | @rootlink/db | other |
| packages/shared | @rootlink/shared | other |

### Token/theme files detected (by path)

- `apps/web/tailwind.config.ts`

## Summary metrics

| Metric | Value |
|---|---|
| Files scanned | 167 |
| Distinct colour literals | 184 |
| Distinct colours after merging near-duplicates | 166 |
| Colour drift ratio (outside token files) | 0.738 |
| CSS custom properties | 41 |
| Distinct font families | 6 |
| Distinct font sizes | 8 |
| Distinct radii | 6 |
| Distinct shadows | 16 |
| Distinct durations | 25 |
| Distinct easings | 7 |
| 'transition: all' uses | 24 |
| Reduced-motion references | 4 |
| Distinct spacing values | 11 |
| Spacing off the 4px grid (ratio) | 0.269 |
| Distinct z-indices | 1 |
| Distinct breakpoints | 0 |
| Tailwind arbitrary values | 69 |
| outline:none occurrences | 44 |
| :focus-visible references | 1 |
| Click handlers on div/span | 3 |
| Images without alt | 0 |
| Gradients | 28 |

## Colours

184 distinct literals (166 after merging near-duplicates; 18 merged). 453 of 614 occurrences (74%) are outside token/theme files.

Top literals:

| Value | Count |
|---|---|
| #e33209 | 35 |
| #c97b2f | 24 |
| #4a7c59 | 22 |
| #2d6455 | 20 |
| #4a8a78 | 17 |
| #b0d8cc | 17 |
| #ffffff | 16 |
| #f2a747 | 13 |
| rgba(74,124,89,0.12) | 12 |
| #152f28 | 11 |
| #d1e0da | 11 |
| #1e4037 | 10 |
| #b02020 | 10 |
| rgba(0,0,0,0.5) | 9 |
| rgba(255,255,255,0.5) | 9 |
| rgba(255,255,255,0.2) | 9 |
| #091810 | 8 |
| #3e8a75 | 8 |
| #8a4a0a | 7 |
| rgba(255,255,255,0.9) | 7 |

Top literals outside token files:

| Value | Count |
|---|---|
| #e33209 | 35 |
| #4a7c59 | 22 |
| #c97b2f | 19 |
| #2d6455 | 18 |
| #b0d8cc | 16 |
| #ffffff | 15 |
| #4a8a78 | 14 |
| rgba(74,124,89,0.12) | 12 |
| #f2a747 | 11 |
| #d1e0da | 10 |
| rgba(255,255,255,0.5) | 9 |
| rgba(255,255,255,0.2) | 9 |
| #b02020 | 9 |
| #3e8a75 | 8 |
| rgba(0,0,0,0.5) | 7 |
| #1e4037 | 6 |
| #091810 | 6 |
| rgba(255,255,255,0.35) | 6 |
| rgba(255,255,255,0.75) | 5 |
| #6688cc | 5 |

Files with the most colour literals outside token files:

| File | Count |
|---|---|
| apps/web/src/components/brand/icons/index.tsx | 93 |
| apps/web/src/components/brand/Logo.tsx | 40 |
| apps/web/src/styles/globals.css | 33 |
| apps/web/src/app/(app)/onboarding/page.tsx | 19 |
| apps/web/src/app/(marketing)/page.tsx | 18 |
| apps/api/src/workers/email.worker.ts | 18 |
| apps/web/src/app/(app)/admin/users/[userId]/page.tsx | 14 |
| apps/web/src/app/(app)/admin/layout.tsx | 13 |
| apps/web/src/app/(app)/admin/users/page.tsx | 13 |
| apps/web/src/components/tree/HintsPanel.tsx | 11 |
| apps/web/src/components/marketing/HeroTree.tsx | 11 |
| apps/web/src/app/not-found.tsx | 10 |
| apps/web/src/app/shared/page.tsx | 9 |
| apps/web/src/app/(app)/settings/page.tsx | 9 |
| apps/web/src/app/(app)/dna/page.tsx | 9 |

## Type

6 font families, 8 distinct sizes.

| Family | Count |
|---|---|
| var(--font-display) | 42 |
| var(--font-mono) | 13 |
| var(--font-body) | 8 |
| system-ui | 4 |
| Georgia | 1 |
| Menlo | 1 |

| Size | Count |
|---|---|
| 14px | 6 |
| 22px | 4 |
| 10px | 3 |
| 12px | 3 |
| 33.6px | 1 |
| 36px | 1 |
| 24px | 1 |
| 18px | 1 |

Tailwind text classes:

| Class | Count |
|---|---|
| text-sm | 330 |
| text-xs | 195 |
| text-base | 35 |
| text-xl | 26 |
| text-2xl | 19 |
| text-3xl | 19 |
| text-lg | 14 |
| text-4xl | 14 |
| text-5xl | 7 |
| text-6xl | 1 |
| text-7xl | 1 |

## Shape and elevation

6 distinct radii, 16 distinct shadows.

| Radius | Count |
|---|---|
| 10px | 5 |
| 4px | 2 |
| 0.75rem | 1 |
| 3px | 1 |
| 16px | 1 |
| 12px | 1 |

| Tailwind class | Count |
|---|---|
| rounded-xl | 144 |
| rounded-full | 81 |
| rounded-lg | 78 |
| rounded-2xl | 64 |
| rounded-default | 32 |
| rounded-3xl | 5 |
| rounded-md | 4 |

| Shadow | Count |
|---|---|
| var(--shadow-lg) | 10 |
| var(--shadow-md) | 10 |
| var(--shadow-sm) | 7 |
| var(--shadow-btn-primary) | 2 |
| var(--shadow-card-hover) | 2 |
| 0 0 32px rgba(201,123,47,0.25) | 1 |
| 0 0 48px rgba(201,123,47,0.45), 0 0 100px rgba(201,123,47,0.15) | 1 |
| 0 3px 0 #0a1f1a, 0 6px 24px rgba(21, 47, 40, 0.45) | 1 |
| 0 0 0 #0a1f1a, 0 2px 8px rgba(21, 47, 40, 0.25) | 1 |
| var(--shadow-btn-amber) | 1 |
| 0 3px 0 #8a4a0a, 0 8px 28px rgba(201, 123, 47, 0.50) | 1 |
| 0 0 0 #8a4a0a, 0 2px 8px rgba(201, 123, 47, 0.25) | 1 |

## Motion

25 durations, 7 easings, 24 `transition: all`, 22 keyframes, 4 reduced-motion references.

| Duration | Count |
|---|---|
| 600ms | 12 |
| 300ms | 11 |
| 400ms | 8 |
| 500ms | 7 |
| 150ms | 5 |
| 200ms | 3 |
| 800ms | 3 |
| 700ms | 3 |
| 250ms | 3 |
| 650ms | 2 |
| 450ms | 2 |
| 100ms | 2 |
| 350ms | 2 |
| 3000ms | 2 |
| 1800ms | 2 |

| Easing | Count |
|---|---|
| ease | 16 |
| ease-out | 13 |
| ease-in-out | 12 |
| cubic-bezier(0.65,0,0.35,1) | 7 |
| cubic-bezier(0.34,1.56,0.64,1) | 4 |
| cubic-bezier(0.16,1,0.3,1) | 3 |
| linear | 3 |

## Spacing, z-index, breakpoints

11 distinct spacing values; 27% off the 4px grid.

| px | Count |
|---|---|
| 24 | 16 |
| 12 | 10 |
| 10 | 8 |
| 0 | 5 |
| 32 | 5 |
| 9 | 4 |
| 8 | 3 |
| 20 | 2 |
| 16 | 2 |
| 1.6 | 1 |
| 4.8 | 1 |

z-index: 1 distinct. Breakpoints: 0 distinct.

| z-index | Count |
|---|---|
| 20 | 1 |

| Breakpoint | Count |
|---|---|

## Tailwind arbitrary values

69 uses, 23 distinct.

| Class | Count |
|---|---|
| hover:bg-[var(--bg-muted)] | 26 |
| hover:bg-[var(--bg-subtle)] | 9 |
| text-[var(--accent-primary)] | 5 |
| text-[var(--text-primary)] | 3 |
| hover:text-[var(--text-primary)] | 3 |
| hover:scale-[1.03] | 2 |
| max-w-[220px] | 2 |
| h-[60px] | 2 |
| max-w-[160px] | 2 |
| max-h-[70vh] | 2 |
| hover:bg-[var(--bg-surface)] | 1 |
| max-w-[560px] | 1 |
| sm:text-[2.1rem] | 1 |
| aspect-[4/3] | 1 |
| hover:scale-[1.02] | 1 |

## Accessibility greps and raw elements

| Check | Count |
|---|---|
| click_on_div_or_span | 3 |
| focus_visible_refs | 1 |
| img_without_alt | 0 |
| important | 4 |
| outline_none | 44 |
| positive_tabindex | 0 |

| Raw element | Occurrences in markup files |
|---|---|
| a | 10 |
| button | 134 |
| img | 8 |
| input | 45 |
| select | 18 |
| table | 4 |
| textarea | 5 |
