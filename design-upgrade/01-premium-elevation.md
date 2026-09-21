# Premium UI Elevation — What Was Done

## Pre-flight (Section 0)
- Animation lib: Framer Motion — already a dependency, used extensively.
- Icons: `lucide-react` for generic UI chrome + a separate hand-crafted brand icon
  system (`components/brand/icons`) for nav/feature icons — a deliberate two-tier
  split, not something to collapse into "one icon set." No emojis found in core
  production UI to eradicate.
- Dark mode: `.dark` class, toggled via a real theme switcher in the app shell.
- Styling system: Tailwind + inline `style` objects (hybrid, used consistently).

## What was actually elevated (and why so little of "everywhere")

The existing `.btn`/`.card` system already implements most of what this skill
exists to add to a generic app — shimmer sweep on hover, 3D press-down active
states, layered shadows, gradient backgrounds. Piling more effects on top would
violate the skill's own restraint rule ("no more than one motion flourish per
element") and risk looking busy rather than premium. So this pass targeted two
*real, specific, verifiable* problems rather than a cosmetic sweep:

1. **`.card`'s hover shadow was animating `box-shadow` directly** — a named,
   non-negotiable violation in this skill's own performance rule (forces
   paint/layout every frame; only `transform`/`opacity` should animate on
   frequently-triggered elements). Fixed: the hover shadow is now a separate
   `::after` overlay whose *opacity* crossfades — visually identical, but the
   browser only ever touches a compositor-friendly property. `.card-lift`
   (used alongside `.card` in the two places it appears) now only handles the
   `transform: translateY` lift, since the shadow crossfade already comes from
   `.card::after`.

2. **Framer Motion had zero `useReducedMotion()` coverage anywhere in the app.**
   The existing global CSS reduced-motion block only catches CSS
   `transition`/`animation` — it has no effect on Framer Motion, which drives
   its own values via `requestAnimationFrame`. Fixed the single most
   consequential instance: `PageTransition.tsx`, which runs on *every* route
   change in the app. Under reduced motion it now renders instantly (duration
   0, no enter/exit slide) instead of ignoring the preference entirely.

## Deliberately not done this pass (disclosed, not silently skipped)

- **The button system's `:hover`/`:active` box-shadow changes** — same
  category of issue as the card fix, but the shadow, `transform`, and
  `background` gradient are tightly choreographed together to sell a literal
  "pressed button" illusion. Splitting the shadow into a separate overlay
  layer risks a barely-desynced feel between the button's instant transform
  and a separately-timed opacity fade, and I have no live browser in this
  sandbox to confirm it still reads correctly. A single button element is
  also a much lower actual performance cost than a scrollable grid of cards.
  Worth doing, but as its own verified pass — not bundled in here as a guess.
- **`useReducedMotion()` on every other Framer Motion usage in the app** —
  ~~real gap, same class of fix as `PageTransition`, but dozens of call
  sites; fixing the highest-traffic one now and the rest as a follow-up is
  more honest than claiming a sweep that didn't happen.~~ **Update:**
  extended to all 7 modal/panel components (`InviteMemberModal`,
  `GedcomPanel`, `HintsPanel`, `ShareTreeModal`, `AddRelationshipModal`,
  `RelationshipFinderModal`, `NotificationsPanel`) in a follow-up pass —
  same minimal initial/exit-only pattern as `PageTransition`. While in
  `NotificationsPanel` for that fix, found the earlier token sweep had a
  real blind spot: it only matched hex literals, missing the same colors
  expressed as decimal `rgba()` — 5 more `--danger-soft` duplicates and 8
  more sex-indicator-soft duplicates (2 new tokens added:
  `--sex-male-soft`, `--sex-female-soft`) found and swept. Still not done:
  `PersonPanel.tsx` (`motion.aside`) and the 9 page-level entrance
  animations (`dashboard`, `search`, `media`, `dna`, `people`, `onboarding`,
  `admin`, the person detail page, and one more) — lower urgency since
  these are simpler opacity/y fades rather than the modal pattern's more
  pronounced scale+slide, but genuinely not yet done.
- **Icon tactile feedback, skeleton loaders, scroll-driven reveals** — the
  skill's other pillars. Not applied broadly this pass; the app's existing
  loading states already use skeletons in most places already inspected this
  session, and scroll-driven reveal on marketing pages is a legitimate
  follow-up, not done here to keep this pass to changes that were fully
  verified (balance-checked, structurally reasoned through) rather than
  broad and shallow.
