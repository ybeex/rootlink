# RootLink — Hero & Marketing Image Audit (follow-up)

## Current state: no outstanding gaps

Full re-sweep of all 10 marketing pages (`about`, `blog` listing, `blog/[slug]`, `contact`,
`docs/api`, `features`, the homepage, `pricing`, `privacy`, `terms`). Every image usage in
the site today:

| Location | Asset | Status |
|---|---|---|
| 6 blog posts (listing + detail + homepage preview) | `/blog/<slug>.webp` | Generated & wired, this session's earlier pass |
| About page | `/about-illustration.webp` | Generated & wired |
| Pricing page header | `/pricing-bg.webp` | Generated & wired |
| Homepage "From the blog" cards | *(same 6 covers)* | **Was unwired — fixed just now**, see below |

The one real finding from this sweep: the homepage's "From the blog" preview section
never rendered `post.image` at all, even after the covers existed — it turned out to have
its own third, independent copy of blog post data (distinct from both the listing page's
`POSTS` array and the detail page's `POSTS` record). Fixed by adding the same image paths
to that copy and rendering them. **Not fixed, flagged for its own pass:** three
independent hardcoded copies of the same blog content is a real consistency risk —
editing a post's title in one place silently leaves the other two stale.

Everything else on the site (the four feature sections, the final CTA, contact/docs/
privacy/terms) uses either plain text or the custom icon system — no photographic/
illustrative image slots exist there, filled or otherwise.

## The hero: not currently an image

`HeroTree.tsx` is a hand-coded, animated SVG — the trunk grows, branches draw themselves
in, nodes bloom amber-then-white, all keyed off scroll/load state. This was a deliberate
choice documented in the UI system docs: the hero *demonstrates the product* instead of
depicting it. Generating a static image for this spot is a real decision about what that
image is *for*, not a gap-fill — so here are detailed prompts for both ways it could
actually be used, rather than one dropped in blind.

### Option A — atmospheric background behind the existing animation (lower risk)

Keeps `HeroTree` exactly as-is; this sits behind it as a textured backdrop, the same role
`pricing-bg.webp` plays for the pricing header, but richer and hero-scale. The animated
tree stays the actual focal point and interactive centerpiece.

> A wide atmospheric background image, deep forest green (`#152F28`) as the dominant
> tone, deliberately soft and out-of-focus — meant to sit *behind* a sharp animated
> foreground illustration without competing with it. Suggest an abstract, softly-blurred
> impression of root systems and branching lines in slightly lighter forest tones
> (`#1E4037`, `#2D6455`), fading to the pure `#152F28` background toward the edges and
> corners. A very subtle warm amber glow (`#C97B2F`, low opacity, like a distant light
> source) positioned slightly above center, echoing where the hero's "you are here" node
> sits in the foreground animation. No sharp edges, no recognizable objects, no text, no
> depth-of-field objects in focus — this must read as atmosphere, not an illustration in
> its own right. Wide aspect ratio, roughly 1920×1080, seamless enough to scale across
> different viewport widths without an obvious repeat or hard edge.

### Option B — full static replacement for the hero illustration (bigger decision)

Replaces `HeroTree` outright. Loses the "the product demonstrates itself" interactive
quality that's core to the current design thesis — worth being certain about before using
this, since it's a step back from something genuinely well-built, not a step up from
nothing.

> A wide, editorial hero illustration, warm-bone (`#F7F5F1`) background. Center
> composition: an elegant family-tree structure rendered as warm bronze/amber branching
> lines (`#C97B2F` core tone, `#E8941F` highlights) rising from a root system at the
> bottom third of the frame, branching upward and outward into the upper two-thirds. At
> each branch tip, a small solid node — mostly deep forest green (`#152F28`,
> `#2D6455`), with exactly one node glowing warm amber (`#C97B2F`) positioned
> slightly off-center, representing the one person — "you" — the whole structure holds
> together. Flat-to-softly-dimensional illustration style (a light drop shadow under each
> node is fine; no photorealism, no 3D rendering, no literal photographic texture).
> Generous negative space above and to one side of the composition for headline text to
> sit beside it. Thin, confident, consistent line weight throughout — this needs to read
> as a single deliberate piece of editorial art, not a busy infographic. No readable text
> anywhere in the image. Wide aspect ratio, roughly 1920×1080 or 2:1.

### A third option worth naming: don't generate anything here

Given `HeroTree` is already a genuinely distinctive, working, on-brand piece of custom
work — rarer than a generated hero image in a market full of them — the strongest
argument against Option B specifically is that it trades something unusual for something
every AI-assisted site can now have. Option A (atmosphere only, animation untouched) is
the lower-risk way to add visual richness without that trade-off, if richness is really
what's wanted here rather than a replacement.

## If more imagery is wanted beyond the hero (optional, not gaps)

None of these are missing anything today — the feature sections work fine as icon + text.
Only worth generating if there's an actual appetite for more illustrated richness
sitewide, not because anything is unfinished:

> **Feature-section companion texture** (for the 4 alternating icon/text blocks on the
> homepage): a small set of 4 soft, abstract background textures — one per feature
> (Vault/privacy, Collaboration, AI hints, Export) — sitting behind each section's
> existing custom icon rather than replacing it. Each in warm-bone (`#F7F5F1`) or
> whisper-of-forest (`#EFF4F0`) background, a very faint (10–15% opacity) abstract motif
> echoing that feature's icon shape (a soft vault-door curve, overlapping circles for
> collaboration, a sparkle/branch hybrid for AI, a folded-document shape for export) —
> textural support for the icon, never competing with it, no text, roughly 800×800 each.
