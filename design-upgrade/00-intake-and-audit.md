# RootLink UI Design Upgrade — Intake & Audit Summary

## Phase 0: Intake

- **Repo shape**: Turborepo monorepo. All UI lives in one package, `apps/web` (Next.js 15 / React 19). `packages/ui` exists in the workspace glob but is empty — not in use.
- **Stack**: Tailwind 3, Radix primitives (dialog/dropdown/tabs/select/etc.), Framer Motion, D3 (tree canvas), Recharts.
- **Brand assets that must stay**: the "Rooted Modernity" thesis and its token system, documented in `docs/RootLink_UI_System_Design_Decisions.md` — a named design philosophy, a three-mode system (Grove/Vault/Workbench), warm-tinted shadows, a custom two-tier icon system with a fixed isometric lighting convention, and an explicit accessibility floor for the tree canvas. This is not a generic template with a logo bolted on; the reasoning behind almost every major visual choice is already written down.

**This changes the shape of the engagement.** The skill's default assumption — redesign the look, invent a new thesis from reference research — is built for the common case where nothing in the product justifies its current choices. That's not this codebase. Inventing a new palette or brand voice here would mean discarding real, reasoned prior work without evidence it's wrong, which is the opposite of this skill's own "evidence over defaults" principle.

**Recommended freedom level: audit-and-tighten, not redesign-or-rebrand.** Keep the thesis, the palette, the type choices, and the three-mode system. Use the audit to find where the *implementation* has drifted from that already-good system, and fix the drift. Full scope confirmation needed from you before Phase 3 (see "Open questions" at the end) — the rest of this document is the evidence that recommendation is based on, not a final decision.

## Phase 2: Bottom-up audit (static — this sandbox can't run the app)

Ran `inventory.py` across all 167 UI-relevant files. Headline number: **74% of colour literals appear outside token files.** That sounds like classic slop-drift. It mostly isn't — but two real, worth-fixing issues were hiding inside that number.

### Finding 1 — the drift is mostly the icon system repeating itself, not off-brand colour

The two heaviest files by far are `components/brand/icons/index.tsx` (93 literals) and `Logo.tsx` (40). Checked the actual values: they're overwhelmingly the *documented* palette (`#2d6455`, `#4a8a78`, `#c97b2f`, `#152f28`, `#f2a747`...) typed as raw hex inside SVG gradient `<stop>` elements, not CSS custom properties. This is real — every isometric icon redefines its own top/front/side gradient stops from scratch — but it's a **DRY problem, not a brand problem**: the values are correct, just not shared. Fix: extract the shared gradient definitions (trunk-front/trunk-right/trunk-top/node-amber/node-forest, etc. — the same five or six tone pairs the design doc already names) into one `<defs>` block referenced by every icon, instead of each icon redeclaring them. Verdict: **fix, not replace.**

### Finding 2 — two competing "error red" values, neither one a token

`#e33209` (35 uses) and `#b02020` (10 uses) are both in active use as validation/error text color, across 16 different files, with **no `--danger` or `--error` custom property anywhere in `globals.css`.** The design doc's token section (§2.1) never mentions an error color at all — it was never formalized, so two slightly different reds accumulated independently. This is genuine drift, not a DRY nitpick: two different reds for the same semantic meaning is visible inconsistency. Fix: pick one (recommend `#e33209` — it's the overwhelming majority usage), add `--danger` / `--danger-soft` tokens in the same warm-tinted spirit as the rest of the palette, sweep both literals to the token.

### Finding 3 — a real but narrower accessibility gap than the raw numbers suggested

The raw inventory count (44 `outline-none` vs. 1 `focus-visible`) looked alarming but mostly wasn't, once checked against how the cascade actually resolves: Tailwind's `outline-none` utility only sets `outline-color` to transparent (a deliberate Tailwind design choice, not a hard `outline: none`), and `globals.css` already has a hand-written `:focus-visible { outline: 2px solid var(--accent-ember); ... }` rule positioned *after* Tailwind's injected utilities in the compiled stylesheet. Equal specificity, later source order — the amber focus ring already wins and already shows for keyboard users on all 44 elements. No inline `style={{outline:'none'}}` (which *would* have defeated this) was found anywhere. **Verified false alarm, not fixed because nothing was broken.**

What *was* real: 2 modal backdrops (`FamilySearchReviewModal.tsx`, `NotificationsPanel.tsx`) closed on click but had no `Escape`-to-close keyboard equivalent. Both already had genuine, tabbable `<button>` close controls inside the actual dialog, so this was never a hard keyboard trap — just a missing standard-convention shortcut. Fixed: added an `Escape` handler to both. Also added `aria-hidden="true"` to the one backdrop that's a true sibling of the dialog content in the DOM (`NotificationsPanel`) — checked first, and correctly *did not* add it to `FamilySearchReviewModal`'s backdrop, which turned out to be the dialog's own parent wrapper; `aria-hidden` there would have hidden the entire modal's content from screen readers, a worse regression than the gap it would have "fixed."

### Finding 4 — an undocumented but real, deliberate color convention

`#6688cc` (blue) and `#c47ac0` (pink) are not slop — they're a consistent sex-indicator convention (male/female/unspecified) used across 5 files: the tree canvas, search, the people list, the person detail page, and the add-relationship modal. It's real and intentional, just (a) not tokenized — repeated as raw hex in every file instead of `--sex-male`/`--sex-female` — and (b) not mentioned anywhere in the design doc, and (c) a stock blue/pink binary that doesn't obviously belong to the warm forest/amber palette everything else in the product commits to. **This is a real design question, not a bug** — worth your call rather than mine (see below).

### Smaller, lower-priority findings (full numbers in `inventory-before.md`)

- Radius: `rounded-xl` (144 uses) is actually the *most common* radius, not `rounded-2xl`/16px, which §2.4 of the design doc specifically calls out as "the" card radius. Worth reconciling which radius means what.
- Motion: 25 distinct durations, 7 easings — no documented motion scale (fast/base/slow) for anything outside the specific named components (`PageTransition`, `BranchLoader`) the doc already covers.
- Spacing: 27% of spacing values fall off a 4px grid.
- Shadow: hover/active button shadow states (`0 3px 0 #0a1f1a, 0 6px 24px rgba(21,47,40,0.45)`, etc.) are hardcoded per-instance rather than tokenized as `--shadow-btn-primary-hover`.

## Coverage

Static inventory covered all 167 files under `apps/web/src`. Targeted manual reads: `globals.css`, `Logo.tsx`, `icons/index.tsx`, the two div/span-onClick files, `PedigreeTree.tsx` (sex-color convention). Not yet individually read line-by-line: the remaining ~160 files — relying on the regex inventory plus this session's own accumulated knowledge of the codebase from building most of these features directly. Full per-file keep/fix/replace verdicts would be the next step if you confirm the audit-and-tighten scope.

## Fixes applied (this pass)

- `--danger` / `--danger-soft` tokens added to `globals.css`; swept both competing literals (`#e33209`, `#b02020`) to `var(--danger)` across 24 files, 54 occurrences.
- `--sex-male` / `--sex-female` / `--sex-unspecified` tokens added (kept the existing blue/pink values, per product decision — not replaced); swept both literals across the same 24-file sweep.
- Escape-to-close added to the 2 modals that were missing it; `aria-hidden="true"` added to the 1 backdrop where it was structurally safe to do so (checked DOM nesting first — the other backdrop turned out to be the dialog's own parent wrapper, where `aria-hidden` would have hidden the real content instead of just the decorative scrim).
- Confirmed via full-file balance checks (brace/paren counts) after every edit — no compiler available in this sandbox, so this is the verification method used throughout.

## Open questions

1. ~~Confirm scope~~ — resolved: audit-and-tighten, keep the existing thesis.
2. ~~Sex-color convention~~ — resolved: keep blue/pink, tokenize it.

Deferred, not attempted this pass (flagged, not silently dropped): radius-scale reconciliation; a formal motion-duration scale; spacing-grid cleanup; tokenizing the per-instance button hover/active shadows.

## Finding 1, revisited (follow-up session)

Came back to this one since verification tooling (a cairosvg render pipeline, built for an unrelated logo task) made it tractable. The original premise turned out to be wrong: the feature icons are not duplicate gradients repeating themselves — `fi-vault-front`'s dark forest tones and `fi-doc-front`'s pale paper tones are genuinely, intentionally different per-icon designs. There was no "shared defs" consolidation to be had.

The real, narrower opportunity: ~8 distinct hex values in `icons/index.tsx` happened to exactly match existing `:root` token values. Substituting those makes previously theme-static icons become theme-reactive — a real visual behavior change, not a no-op refactor, so this was surfaced as a decision rather than made silently. Product decision: tokenize.

Executed carefully — matched only against verified `:root` values (excluding 3 values that only coincidentally matched *dark-mode-only* overrides, which would have changed light-mode appearance too), then rendered all 7 affected icons in both light and dark resolved values before calling it done. That verification caught a real problem: `--border-default`'s dark value is tuned for a border on a raised surface, not line art sitting directly on the page's darkest background with nothing behind it — which is exactly how `EmptyState`'s illustrations render (confirmed by reading the component, not assumed). The connecting-line stroke in `EmptyPeopleIllustration` went nearly invisible in dark mode. Reverted that one substitution (10 occurrences, all within the 3 illustrations), kept the other 7 (34 occurrences) which verified correctly in both modes.

