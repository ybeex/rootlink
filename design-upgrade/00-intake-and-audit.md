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

### Finding 3 — a real accessibility gap the design doc doesn't yet own up to

`outline: none` / `outline-none` appears **44 times**. `:focus-visible` appears **once**. The design doc's §6.6 describes real, deliberate accessibility engineering for the tree canvas specifically — but that same rigor hasn't reached the other 43 places that suppress the default focus ring. This is a genuine keyboard-accessibility regression risk sitting right next to a section of the docs that says accessibility is taken seriously. Also found: 2 places (`FamilySearchReviewModal.tsx`, `NotificationsPanel.tsx`) using `onClick` on a `<div>`/`<span>` instead of a real button — not keyboard-reachable at all. Fix: a single `:focus-visible` treatment (amber ring, matching the existing `--accent-ember` language) added once, applied everywhere `outline-none` currently strips it bare; convert the two div/span click handlers to real buttons.

### Finding 4 — an undocumented but real, deliberate color convention

`#6688cc` (blue) and `#c47ac0` (pink) are not slop — they're a consistent sex-indicator convention (male/female/unspecified) used across 5 files: the tree canvas, search, the people list, the person detail page, and the add-relationship modal. It's real and intentional, just (a) not tokenized — repeated as raw hex in every file instead of `--sex-male`/`--sex-female` — and (b) not mentioned anywhere in the design doc, and (c) a stock blue/pink binary that doesn't obviously belong to the warm forest/amber palette everything else in the product commits to. **This is a real design question, not a bug** — worth your call rather than mine (see below).

### Smaller, lower-priority findings (full numbers in `inventory-before.md`)

- Radius: `rounded-xl` (144 uses) is actually the *most common* radius, not `rounded-2xl`/16px, which §2.4 of the design doc specifically calls out as "the" card radius. Worth reconciling which radius means what.
- Motion: 25 distinct durations, 7 easings — no documented motion scale (fast/base/slow) for anything outside the specific named components (`PageTransition`, `BranchLoader`) the doc already covers.
- Spacing: 27% of spacing values fall off a 4px grid.
- Shadow: hover/active button shadow states (`0 3px 0 #0a1f1a, 0 6px 24px rgba(21,47,40,0.45)`, etc.) are hardcoded per-instance rather than tokenized as `--shadow-btn-primary-hover`.

## Coverage

Static inventory covered all 167 files under `apps/web/src`. Targeted manual reads: `globals.css`, `Logo.tsx`, `icons/index.tsx`, the two div/span-onClick files, `PedigreeTree.tsx` (sex-color convention). Not yet individually read line-by-line: the remaining ~160 files — relying on the regex inventory plus this session's own accumulated knowledge of the codebase from building most of these features directly. Full per-file keep/fix/replace verdicts would be the next step if you confirm the audit-and-tighten scope.

## Open questions (need your call before Phase 3)

1. **Confirm scope**: audit-and-tighten (fix the 4 findings above + smaller ones, keep the thesis/palette/type as-is), or did you actually want a full visual rebrand despite the existing system? These are very different amounts of work and I don't want to guess wrong.
2. **The sex-color convention** (Finding 4): keep blue/pink but tokenize it, replace it with something that fits the forest/amber palette (e.g., canopy-green / ember-amber / neutral, echoing the existing brand colors instead of a generic binary), or drop the color-coding entirely? This is a product decision as much as a visual one.
