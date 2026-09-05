import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Reference',
  description: 'Read-only API access for your RootLink trees (Pro plan).',
};

function Endpoint({ method, path, description, response }: {
  method: string; path: string; description: string; response: string;
}) {
  return (
    <div className="mb-8 rounded-2xl p-5" style={{ background: 'var(--bg-subtle)' }}>
      <div className="mb-2 flex items-center gap-2">
        <span
          className="rounded-md px-2 py-0.5 font-mono text-2xs font-semibold uppercase"
          style={{ background: 'var(--accent-primary)', color: 'white' }}
        >
          {method}
        </span>
        <code className="text-sm" style={{ color: 'var(--text-primary)' }}>{path}</code>
      </div>
      <p className="mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
      <pre className="overflow-x-auto rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
{response}
      </pre>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <span
        className="inline-block rounded-full px-3 py-1 font-mono text-2xs font-medium uppercase tracking-wider"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
      >
        Pro plan
      </span>
      <h1 className="mt-5 font-display text-4xl tracking-tight">API Reference</h1>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        A small, read-only API for building your own tools against your RootLink trees. This is
        deliberately minimal today — read access to trees and persons only. Mutation endpoints
        (create/update/delete) aren&rsquo;t exposed yet.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl">Authentication</h2>
      <p className="mb-3 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Generate a key from <code>Settings → Subscription → API Access</code> (Pro plan required).
        Send it as a bearer token on every request:
      </p>
      <pre className="mb-3 overflow-x-auto rounded-xl p-3 text-xs" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
{`curl https://api.rootlink.app/v1/public/trees \\
  -H "Authorization: Bearer rl_live_..."`}
      </pre>
      <p className="mb-3 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        A key is shown in full exactly once, at creation. RootLink stores only a hash of it —
        there is no way to retrieve a lost key; revoke it and generate a new one instead.
      </p>

      <h2 className="mb-3 mt-10 font-display text-xl">Rate limits</h2>
      <p className="mb-3 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        60 requests per minute per key. Each response includes <code>X-RateLimit-Limit</code>,{' '}
        <code>X-RateLimit-Remaining</code>, and <code>X-RateLimit-Reset</code> headers; a request
        over the limit returns <code>429</code>.
      </p>

      <h2 className="mb-4 mt-10 font-display text-xl">Endpoints</h2>

      <Endpoint
        method="GET"
        path="/v1/public/trees"
        description="List every tree you own or are a member of."
        response={`{
  "success": true,
  "data": [
    { "id": "…", "name": "Smith Family", "createdAt": "…" }
  ]
}`}
      />

      <Endpoint
        method="GET"
        path="/v1/public/trees/:treeId"
        description="Get a single tree, including its member list. Returns 403 if the key's owner doesn't have at least viewer access."
        response={`{
  "success": true,
  "data": { "id": "…", "name": "Smith Family", "members": [ … ] }
}`}
      />

      <Endpoint
        method="GET"
        path="/v1/public/trees/:treeId/persons"
        description="List persons in a tree. Supports the same query params as the in-app search (q, sex, isLiving, birthYearMin/Max, page, pageSize). Living-person privacy rules apply exactly as they do in the app, based on the key owner's role on the tree."
        response={`{
  "success": true,
  "data": [ { "id": "…", "firstName": "…", "lastName": "…" } ],
  "pagination": { "page": 1, "pageSize": 25, "total": 42 }
}`}
      />

      <Endpoint
        method="GET"
        path="/v1/public/trees/:treeId/persons/:personId"
        description="Get a single person, including vital events."
        response={`{
  "success": true,
  "data": { "id": "…", "firstName": "…", "events": [ … ] }
}`}
      />

      <p className="mt-8 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Every response uses the same envelope as the rest of the RootLink API: a top-level{' '}
        <code>success</code> boolean, and on error, <code>error.code</code> /{' '}
        <code>error.message</code> instead of <code>data</code>.
      </p>
    </div>
  );
}
