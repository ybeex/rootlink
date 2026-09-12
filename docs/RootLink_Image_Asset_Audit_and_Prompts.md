# RootLink — Image Asset Audit & Generation Prompts

## Key finding, up front

**There are no missing, broken, or placeholder images anywhere in the app.** I audited
every marketing page, the app shell, auth pages, the 404/error pages, and the empty-state
system. RootLink's entire visual identity — hero, icons, illustrations, even the 404 page
— is hand-built from custom SVG and CSS, with exactly **one** raster image in the whole
product (the social-share OG image, which already exists and is on-brand). This is a
deliberate, documented design choice (`RootLink_UI_System_Design_Decisions.md`), not an
oversight:

- **`HeroTree.tsx`** — the landing page's hero is not an image at all. It's a hand-coded,
  animated SVG pedigree chart (trunk grows, branches draw, nodes bloom amber-then-white)
  that literally demonstrates the product before a word of copy loads.
- **`icons/index.tsx`** — a full custom icon system: 8 nav icons (stroke-based, forest
  green) and 4 large "feature" icons (`VaultFeatureIcon`, `CollabFeatureIcon`,
  `AIFeatureIcon`, `ExportFeatureIcon` — isometric 3D cube-face treatment, upper-left
  light source, three-tone shading).
- **`EmptyState.tsx`** — 7 inline SVG illustrations (trees/people/media/search/
  notifications/audit/dna empty states), matching the icon system's stroke weight.
- **`not-found.tsx`** (404 page) — another hand-animated SVG (a branch drawing itself,
  then blooming), not a static image.
- **`og-image.jpg`** — the one real raster asset. 1200×630, logo + tagline on the Grove
  gradient. Already wired into `layout.tsx`'s OpenGraph/Twitter metadata. Genuinely fine
  as-is.

So this document isn't a gap-fill list — it's **two things**: a plain audit (above,
already done), and a set of prompts for **new** imagery the site doesn't currently have,
for you to decide whether to introduce at all. Adding photographic or AI-generated
imagery to a product whose entire identity is precise, hand-drawn vector art is a real
style decision, not a completion of unfinished work — read the constraints section below
before generating anything.

---

## Constraints on anything generated (read before prompting)

1. **No depictions of real or implied real people.** There is no team/testimonial photo
   slot anywhere on the current site, and none should be added by generating fake human
   faces and presenting them as real customers or team members — that's deceptive
   regardless of how it's captioned. Every prompt below is deliberately object-based,
   symbolic, or abstract — never a rendered human face.
2. **Match the palette exactly.** Use these hex values in every prompt, not
   approximations:
   - Deep forest (`--accent-primary`): `#152F28`
   - Grove (hover state): `#1E4037`
   - Canopy (interactive): `#2D6455`
   - Leaf (highlight): `#4A8A78`
   - Warm bone (`--bg-base`): `#F7F5F1`
   - Ember (amber CTA): `#C97B2F` / lighter `#E8941F`
   - Near-black text: `#0E1C18`
3. **Match the lighting/shading convention**, if the image has any dimensional/isometric
   quality: light source from the **upper-left**, three-tone shading (lightest top face,
   mid-tone front face, darkest side face), thin white highlight on lit edges — this is
   the exact rule the `FeatureIcon` system already follows.
4. **No stock-photo aesthetic.** Nothing that reads as a generic SaaS hero photo
   (laptop-on-a-desk, diverse-people-smiling-at-a-screen). Every prompt below asks for
   flat/soft-dimensional illustration, not photorealism — to sit next to hand-drawn SVG
   icons without clashing.
5. **Typography**, if any prompt asks for lettering: `Playfair Display` for anything
   headline-like (serif, editorial), never a generic sans for display text.

---

## Opportunity 1: Blog post cover images

**Current state:** the blog listing (`apps/web/src/app/(marketing)/blog/page.tsx`) has 6
posts defined as plain data — title, excerpt, date. There is no cover-image field at all.
Adding cover images means a small data-model change first (adding an `image` field to
each post's object and rendering it in the listing/detail view) — that's a code change,
not something this doc does; flagging it so the images aren't generated before there's
anywhere to put them.

Each prompt below is scoped to **1200×630** (matches the OG image convention, doubles as
that post's individual social-share image) and asks for a single symbolic object
relevant to the post's topic, rendered in the site's illustration style — not a literal
photo of the topic, and never any readable, invented body text (avoid the model
hallucinating fake paragraphs of text in the image).

### Post 1 — "How to start a family tree when you don't know where to begin"
> A single warm-toned illustration on a `#F7F5F1` warm-bone background: an
> old-fashioned blank family tree diagram drawn in thin `#2D6455` forest-green ink lines,
> with just the trunk and two empty branches sketched in — deliberately unfinished, like
> the first pencil marks on a page. One small `#C97B2F` amber dot marks the single filled
> node at the base. Flat, minimal, editorial illustration style — no photorealism, no
> readable text anywhere in the image, generous negative space, thin consistent line
> weight throughout. Aspect ratio 1200×630.

### Post 2 — "The privacy problem with genealogy software nobody talks about"
> A flat illustration on a deep forest-green (`#152F28`) background: a single
> old photograph rendered as a simple bordered rectangle, half-tucked inside a
> softly-glowing outline of a padlock drawn in thin white and `#4A8A78` leaf-green
> lines — the photo peeking out suggests something meant to be private is exposed.
> Minimal, symbolic, no readable text or faces inside the photo shape (leave it as a
> solid warm-bone `#F7F5F1` rectangle, abstract). Thin consistent line weight, generous
> negative space, matches a refined editorial-illustration style. Aspect ratio 1200×630.

### Post 3 — "We rebuilt how AI hints work. Here's why the old approach was wrong."
> A flat illustration on warm-bone (`#F7F5F1`) background: a single lightbulb-like shape
> made of thin branching forest-green (`#2D6455`) lines instead of a bulb outline —
> literally a small tree growing where a lightbulb's filament would be — with one
> small `#C97B2F` amber leaf/node glowing at the top. Symbolizes an idea grounded in real
> data rather than a generic "AI sparkle" cliché. Minimal, geometric, no gradients except
> a soft glow behind the amber node, no text. Aspect ratio 1200×630.

### Post 4 — "Three generations in an afternoon: a practical method"
> A flat illustration on warm-bone (`#F7F5F1`) background: three simple concentric
> arcs of small circular nodes (like ripples), innermost in `#C97B2F` amber, middle ring
> in `#4A8A78` leaf green, outer ring in pale `#92ABA4` — evoking three generations
> radiating outward from one person, with thin connecting lines like a clock or sundial
> face suggesting "an afternoon." Minimal, geometric, no text, no realistic clock
> imagery — keep it abstract. Aspect ratio 1200×630.

### Post 5 — "GEDCOM explained for people who don't work in software"
> A flat illustration on warm-bone (`#F7F5F1`) background: a single simple document/page
> shape outlined in thin `#2D6455` forest-green lines, folding open like a book, with a
> small family-tree branch motif (a few connected `#4A8A78` nodes) growing out of the
> open page instead of text — representing a technical file format turning into
> something human and readable. No readable text or code inside the document shape,
> keep it abstract. Aspect ratio 1200×630.

### Post 6 — "How to attach photographs in a way that actually survives"
> A flat illustration on deep forest-green (`#152F28`) background: a single simple
> photograph shape (blank warm-bone `#F7F5F1` rectangle with a thin white border) with a
> small paperclip or ribbon in `#C97B2F` amber attaching it to a single branching node
> line, suggesting permanence and connection rather than a loose file. Minimal, no
> readable text or imagery inside the photo shape, generous negative space, consistent
> thin line weight matching the site's icon system. Aspect ratio 1200×630.

---

## Opportunity 2: About page accompanying illustration

**Current state:** `apps/web/src/app/(marketing)/about/page.tsx` is a single-column text
essay with zero imagery — just a heading and paragraphs. The essay's emotional core is a
specific image already described in the copy itself: *"An aunt whose photo you uploaded
because it was the only one anyone in the family still had."* One illustration
accompanying that specific paragraph would land well without needing any new imagery
elsewhere on the page.

> A single warm, editorial illustration on warm-bone (`#F7F5F1`) background: one old
> photograph rendered as a simple aged rectangle with slightly worn/rounded corners and a
> thin white border, tilted a few degrees, sitting alone with soft shadow — deliberately
> leave the "photo" itself as a solid muted `#92ABA4` gray-green rectangle with no face,
> no scene, no readable content inside it, evoking an old family photo without depicting
> any specific person. A few thin `#2D6455` forest-green lines extend from one corner of
> the photograph like a root or branch, connecting it to a small `#C97B2F` amber dot,
> suggesting this one photo is now linked into something larger. Minimal, warm, quiet —
> not busy. No text anywhere in the image. Portrait or square orientation, roughly
> 800×800 to sit inline in a narrow single-column article.

---

## Opportunity 3 (optional, lower priority): pricing page accent

**Current state:** `apps/web/src/app/(marketing)/pricing/page.tsx` is plans/cards only,
no decorative imagery — which is genuinely fine for a pricing page and arguably
shouldn't change. Including this only because it's a common pattern worth a conscious
yes/no rather than an oversight.

> A wide, subtle background illustration for a page header, deep forest-green
> (`#152F28`) background: extremely faint, low-contrast branching tree-node lines in
> `#1E4037` (barely lighter than the background, meant to sit behind headline text
> without competing with it), fading to fully transparent toward the bottom edge. No
> nodes brighter than `#2D6455`, no amber accents (this is a background texture, not a
> focal illustration), no text. Landscape, roughly 1920×480, seamless/subtle enough to
> sit behind white headline text without hurting legibility.

---

## What NOT to generate

- Team or founder photos (no team section exists; don't invent one with fake people).
- Testimonial/customer photos (none exist; same reasoning).
- Screenshots of the actual product UI — those should be real screenshots taken from the
  running app, not AI-generated approximations of RootLink's own interface.
- Anything photorealistic of people, including "diverse family smiling at a laptop"
  style stock-photo compositions — it would clash immediately with the vector-only
  system everywhere else on the site and reads as generic SaaS marketing, which this
  brand has specifically avoided so far.

## Practical notes for generating these in ChatGPT

- Generate at the largest size ChatGPT offers, then downscale for web — never upscale a
  small generation.
- Ask explicitly for **no text in the image** in every prompt (image models frequently
  add garbled fake text/labels unless told not to) — already included above, but worth
  repeating if you iterate on a prompt.
- If a result's colors drift from the hex values given, ask ChatGPT to regenerate "using
  exactly `#152F28` for the background and `#C97B2F` for the accent color only" — naming
  the two or three colors that matter most gets better adherence than repeating the full
  palette every time.
- Export as WebP for the site (matches `MediaAsset`'s existing thumbnail convention
  elsewhere in the app) at 80–85% quality; keep an original PNG for future re-edits.
- File destinations once generated:
  - Blog covers → `apps/web/public/blog/<post-slug>.webp` (new directory; none exists yet)
  - About page illustration → `apps/web/public/about-illustration.webp`
  - Pricing accent → `apps/web/public/pricing-bg.webp`
