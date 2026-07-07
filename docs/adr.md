# Architecture Decision Records

ADRs document significant decisions made during the design and development of RootLink.

---

## ADR-001: Fastify over Express

**Status**: Accepted  
**Date**: 2026-06

**Context**: We needed a Node.js HTTP framework for the REST API. The main candidates were Express, Fastify, and Hono.

**Decision**: Fastify.

**Reasons**:
- 2–3× throughput advantage over Express on JSON-heavy routes (benchmarked at ~75k req/s vs ~30k)
- First-class TypeScript support with plugin type declarations
- Built-in request schema validation via `@fastify/sensible`
- Plugin encapsulation prevents global state leakage between route groups
- `app.inject()` enables zero-network integration testing

**Consequences**: Developers unfamiliar with Fastify's plugin system (register/decorate pattern) may need a short ramp-up. Plugin hooks (`preHandler`, `onSend`) are more explicit than Express middleware chains.

---

## ADR-002: Drizzle ORM over Prisma

**Status**: Accepted  
**Date**: 2026-06

**Context**: We needed a TypeScript-first ORM for PostgreSQL that could handle complex relational queries (tree traversals, multi-table joins) without N+1 surprises.

**Decision**: Drizzle ORM.

**Reasons**:
- Schema defined in pure TypeScript — no separate `.prisma` DSL, no separate codegen step
- SQL-first mental model: queries are type-safe SQL builders, not magic black boxes
- Zero-overhead: Drizzle generates the exact SQL you'd write by hand
- Migrations are plain SQL files you can inspect, version, and audit
- No binary engine to ship in Docker (Prisma embeds a ~50MB Rust binary)

**Consequences**: Less "magic" than Prisma for simple CRUD — more verbose for basic operations. The team needs to understand SQL to write complex queries. This is a feature, not a bug.

---

## ADR-003: Soft Deletes for Genealogy Data

**Status**: Accepted  
**Date**: 2026-06

**Context**: Genealogy data is uniquely precious. An accidental deletion of a person with 50 linked sources and events is catastrophic. We needed a recovery strategy.

**Decision**: All core entities (persons, trees, media, users) use soft deletes via `deleted_at` timestamp. Hard deletes run on a scheduled job after a retention period (30 days for accounts, 7 days for media).

**Consequences**:
- Every query that returns active records must include `WHERE deleted_at IS NULL` (enforced by Drizzle helper conditions)
- Storage overhead is minimal for the retention period
- GDPR right-to-erasure is implemented in the scheduled hard-delete job with an audit entry

---

## ADR-004: Presigned Upload Pattern for Media

**Status**: Accepted  
**Date**: 2026-06

**Context**: Users upload photos and documents up to 200MB. Routing these through the API server would create memory pressure and bandwidth bottlenecks.

**Decision**: Three-step presigned upload:
1. Client requests presigned URL from API (metadata validation here)
2. Client uploads directly to S3/MinIO (API never sees bytes)
3. Client confirms upload to API, which enqueues processing job

**Consequences**: Clients need two API calls plus one direct S3 call. The UX is slightly more complex but the operational benefits are significant: API servers stay stateless and memory-efficient regardless of file size.

---

## ADR-005: BullMQ for Background Processing

**Status**: Accepted  
**Date**: 2026-06

**Context**: Several operations (media processing, GEDCOM import, AI bio generation) are too slow for a synchronous request/response cycle and need retry semantics.

**Decision**: BullMQ backed by Redis.

**Reasons**:
- Built on Redis RPUSH/LPOP — same Redis instance we use for caching
- Durable job storage (jobs survive API restarts)
- Configurable retry with exponential backoff per job
- Dead-letter queue for failed jobs
- Worker concurrency controls (prevent overloading downstream APIs)
- Bull Board UI for job monitoring (can be added)

**Consequences**: Adding Redis as a hard dependency. Redis unavailability would affect both caching and job queuing. Mitigated by Redis Sentinel/Cluster in production.

---

## ADR-006: Token Rotation for Refresh Token Security

**Status**: Accepted  
**Date**: 2026-06

**Context**: Long-lived refresh tokens are a security liability. If stolen, an attacker has persistent access.

**Decision**: Refresh token rotation with family tracking. Each use of a refresh token issues a new one and revokes the old. If a revoked token is ever presented, the entire family is revoked (token theft detection).

**Consequences**: Users are logged out if a refresh token is stolen and used before them. This is the correct behavior. Clients must persist the new refresh token on each rotation. The token family mechanism adds one DB field (`family`) and one extra revocation query on theft detection.
