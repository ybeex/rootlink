# RootLink — External Record Matching: A Design Proposal

**Status: built.** Phase 1 (FamilySearch only) described below is now implemented —
schema (`connectedAccounts`), OAuth connect/callback/disconnect, on-demand search,
`researchHints` integration, and the field-by-field review-and-import modal. See the git
log for the commits (`familysearch.service.ts`, `integrations.routes.ts`,
`FamilySearchReviewModal.tsx`, and the search-trigger route on `persons.routes.ts`). This
document is now a historical record of the reasoning behind what was built, not an open
proposal — kept in place because the reasoning still matters for anyone extending it
(e.g. eventually adding Findmypast behind the same `RecordMatchProvider`-shaped seam).

**One scope cut made during implementation, not anticipated in the original proposal:**
only year-based facts are importable through the review modal. Place import was cut
because RootLink's `Place` schema requires a validated `country`/`countryCode`, and there
is no reliable way to derive those from FamilySearch's free-text place strings without
risking fabricated data — exactly the failure mode this whole feature is designed to
avoid. A FamilySearch fact's place is shown as read-only reference text in the review
modal so the user can copy it in manually; it is never written automatically. Solving
this properly would need a real place-parsing/geocoding step, which is real, distinct,
future scope (a `Places` API integration, or a manual place-matching UI), not something
to fake with a best-guess country.

**Also unverified, disclosed in code comments rather than asserted as fact:** the exact
per-environment-tier API hostnames and the live JSON response shape from FamilySearch's
Search-and-Match and Read-Person endpoints — built from published documentation, not a
live account (no FamilySearch developer credentials or network access to
familysearch.org in this sandbox). Confirm both against a real sandbox call before
trusting this beyond local development.

**Relationship to the PRD:** the PRD's §3.2 non-goal is specific and worth quoting exactly,
because this whole proposal is an attempt to answer it, not route around it:

> not an AI system that presents externally-sourced record matches as fact [...] Matching
> against external records to *surface as suggested facts* remains an explicit non-goal
> until a matching approach can be built that doesn't risk presenting a plausible-but-wrong
> match as if it were verified.

Everything below is designed against that bar specifically: would a user ever see an
external record treated as more certain than it actually is?

---

## 1. The provider landscape is not what the original roadmap assumed

The original v1.0 roadmap named three providers — FamilySearch, Findmypast, Fold3 — as if
they were three equivalent integration targets. They are not. This matters enough to
change the shape of the recommendation, so it comes first.

| Provider | API access | Verdict |
|---|---|---|
| **FamilySearch** | Free, self-serve developer registration, OAuth2, REST (GEDCOM X). Has a **"Search and Match" endpoint built for exactly this use case.** Production traffic requires an app-readiness review after development, but sandbox/dev access is immediate and requires no partnership conversation. | **Genuinely buildable now.** |
| **Findmypast** | Had a "Hints" API (`matches`/`hints`/`hint status` endpoints) matching this use case closely — but access is an API key **manually issued by Findmypast**, not self-serve, and their public docs repository is now archived/unmaintained. Current status is uncertain from the outside. | **Requires direct outreach to Findmypast first.** Do not assume it still works as documented. |
| **Fold3** | No public developer API found anywhere. Fold3 is Ancestry-owned, and Ancestry's own APIs have historically been kept private. | **Not integrable without a formal partnership**, and there's no public evidence one exists to build toward. |

**Recommendation:** treat this as a FamilySearch integration with a pluggable
provider interface, not a three-provider integration. Design the matching pipeline
provider-agnostically (a `RecordMatchProvider` interface — search-by-candidate,
provider name, base confidence weighting), but only *implement* FamilySearch. Findmypast
and Fold3 become "add a provider" work later, contingent on an actual partnership
conversation — engineering readiness was never the blocker for those two; API access was.

## 2. What already exists that this can build on

Two things already in the codebase fit this feature closely enough that they change the
scope of what's left to build:

- **`researchHints` (schema)** — `personId`, `treeId`, `provider`, `externalRecordId`,
  `title`, `description`, `recordUrl`, `confidence`, `status` (`pending`/`accepted`/
  `rejected`/`snoozed`). This table was seemingly designed with this exact feature in
  mind, and the duplicate-detection work (§5.2) already proved it generalizes cleanly to
  a second kind of hint (`provider: 'duplicate_detection'`) beyond its original apparent
  purpose. A FamilySearch match becomes `provider: 'familysearch'`,
  `externalRecordId: <FamilySearch Person ID>`, `recordUrl: <link to the record>`.
- **`GET/PATCH /v1/trees/:treeId/hints`** (`hints.routes.ts`) — list-by-status and
  accept/reject already exist and work.

**One real gap found while checking this:** `HintsPanel.tsx` (the frontend component
that renders hints) exists and appears complete, but a repo-wide search turns up **no
place that actually renders `<HintsPanel>`**. It's built but not mounted anywhere in the
app today. This has nothing to do with FamilySearch specifically — it's a pre-existing
gap noticed as a side effect of reading this code, not something introduced by this
proposal — but it's a hard prerequisite: there's no point writing FamilySearch matches
into `researchHints` if nothing in the UI currently surfaces that table's contents to a
user. Wiring `HintsPanel` into a real page (the person detail page is the natural home,
next to the existing Timeline/Sources/History tabs) is Phase 0, before any FamilySearch
code, and is a small, independent, immediately shippable fix on its own regardless of
whether the rest of this proposal is approved.

## 3. The core design question: how do we not present a guess as a fact?

Every design decision below exists to answer that one question.

### 3.1 A match is a hint, never a write

A FamilySearch search result becomes a `researchHints` row. It is never written into
`persons`, `vitalEvents`, or any other table automatically, at any confidence level —
there is no confidence score high enough to skip human review, because the failure mode
(a wrong record silently becomes a "fact" in someone's family tree) is qualitatively
worse than the failure mode of a missed match (the user just doesn't see a hint).

### 3.2 The hint always shows *why*, not just a score

Directly reusing the pattern already built for duplicate detection (§5.2): a
`DuplicateMatch` there carries `reasons: string[]` (`"similar name"`, `"same birth
year"`, `"same birthplace"`) rather than a bare number. A FamilySearch hint should carry
the same shape — which specific fields matched (name, birth year ± tolerance,
birthplace) and which didn't, so a user is evaluating the actual evidence, not trusting a
percentage they have no way to sanity-check. A hint titled "87% confidence match" is a
black box; a hint titled "Same name and birth year; birthplace not recorded in either
record" is something a human can actually judge.

### 3.3 Accepting a hint opens a field-by-field review, never a bulk import

This is the single most important interaction in the whole feature, and the one most
likely to get shortcut under time pressure — worth stating plainly: **"Accept" must never
mean "copy every field from the external record onto this person."** It means: open a
review screen listing each candidate fact the external record contains (birth date,
birthplace, death date, etc.) next to what's currently on the person (blank, or already
filled in), each with its own checkbox, defaulted to **unchecked**. The user explicitly
opts in per field. Fields the person already has a value for are shown but not
prioritized for import — an existing value is not silently overwritten.

### 3.4 Every imported fact carries its source, permanently

When a field is accepted, RootLink doesn't just set `persons.birthYear = 1930` — it
should also create (or extend, if a sources/citations feature exists by then) a citation
record pointing at the external `recordUrl`. A fact that arrived this way should be
distinguishable later from a fact the user typed in directly, the same way GEDCOM-import
provenance should ideally be tracked. If RootLink doesn't have a general
sources/citations table yet, this is a dependency worth flagging now rather than
discovering after the FamilySearch integration is half-built — check current schema
before starting Phase 1 below.

### 3.5 UI language always hedges

"Possible match found on FamilySearch," never "Found: birth record." The DNA disclosure
panel (§2 of the continuation plan) and the duplicate-detection copy (§5.2) both already
apply this standard; the wording bar here should be identical — never let the feature's
own UI overclaim what the matching actually established.

## 4. Matching approach (Phase 1: FamilySearch only)

1. **Trigger:** on-demand only at first ("Search FamilySearch for this person" button on
   the person detail page), not automatic/proactive background scanning. Automatic
   scanning multiplies API call volume against a free nonprofit API and multiplies the
   surface area for a wrong match to appear unprompted; on-demand keeps the person
   actively driving the research, consistent with "hints [...] generated only from
   patterns in the user's own already-entered data" being the standard this project has
   already held itself to (per the PRD quote in §1 above) — external hints should meet
   that same "the user is in the loop" bar, just via a button-press instead of a stored
   pattern.
2. **Query construction:** send the person's name, birth year (± a small tolerance,
   e.g. 2 years), and birthplace (if recorded) to FamilySearch's Search and Match
   endpoint. Do not send anything about living persons — checking `isLiving` before ever
   making the external call is a hard gate, not a UI nicety, since FamilySearch is a
   third party and living-person data shouldn't leave RootLink's systems for a
   speculative search.
3. **Result handling:** each candidate result becomes one `researchHints` row (capped —
   e.g. top 5 by FamilySearch's own ranking — rather than importing every result
   FamilySearch returns).
4. **Rate limiting & caching:** cache identical searches (same name+year+place) for a
   period (e.g. 24h) to avoid re-querying FamilySearch every time a page loads; respect
   whatever rate limits the production readiness review specifies.

## 5. Explicitly out of scope for Phase 1

- Findmypast and Fold3 (see §1 — not a technical decision, an access one).
- Any automatic/background/proactive scanning.
- Any bulk "accept all" action.
- Any attempt to auto-resolve conflicts between an accepted external fact and an
  existing one — that's still a manual per-field decision (§3.3).

## 6. Suggested next step

Phase 0 (mount `HintsPanel` somewhere real) is independent, small, and worth doing
regardless of the rest of this document's fate. Everything past that — actually writing
FamilySearch integration code — should wait for an explicit go-ahead, since it involves
external-service dependency (developer registration, eventual production review) that's
a product/business decision as much as an engineering one.
