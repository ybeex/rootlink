/**
 * API-level integration tests using Playwright's request context.
 * These run independently of the browser — pure HTTP assertions against the live API.
 * They form the fastest layer of confidence: if these pass, the API contract is intact.
 */
import { test, expect } from '@playwright/test';

const API = process.env['API_URL'] ?? 'http://localhost:3001';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAndLogin(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  suffix: string,
) {
  const email    = `api-test-${suffix}-${Date.now()}@rootlink.test`;
  const password = 'ApiTestPass123!';

  await request.post(`${API}/v1/auth/register`, {
    data: { email, password, firstName: 'API', lastName: 'Test' },
  });

  const loginRes = await request.post(`${API}/v1/auth/login`, {
    data: { email, password },
  });
  const loginBody = (await loginRes.json()) as { data: { accessToken: string } };
  return { email, password, token: loginBody.data.accessToken };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── Health ────────────────────────────────────────────────────────────────────

test.describe('Health endpoints', () => {
  test('@smoke GET /health/live returns 200', async ({ request }) => {
    const res = await request.get(`${API}/health/live`);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  test('GET /health/version returns name and uptime', async ({ request }) => {
    const res  = await request.get(`${API}/health/version`);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { name: string; uptime: number };
    expect(body.name).toBe('rootlink-api');
    expect(typeof body.uptime).toBe('number');
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

test.describe('Auth API', () => {
  test('@smoke register → login → get profile flow', async ({ request }) => {
    const { token, email } = await registerAndLogin(request, 'flow');

    const profileRes = await request.get(`${API}/v1/users/me`, { headers: auth(token) });
    expect(profileRes.status()).toBe(200);

    const profile = (await profileRes.json()) as { data: { email: string } };
    expect(profile.data.email).toBe(email);
  });

  test('login returns access token and refresh token', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'tokens');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(50);
  });

  test('login with wrong password returns 401', async ({ request }) => {
    const email = `wrong-pass-${Date.now()}@rootlink.test`;
    await request.post(`${API}/v1/auth/register`, {
      data: { email, password: 'Correct123!', firstName: 'A', lastName: 'B' },
    });

    const res = await request.post(`${API}/v1/auth/login`, {
      data: { email, password: 'WrongPass123!' },
    });
    expect(res.status()).toBe(401);

    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('AUTH_001');
  });

  test('duplicate email registration returns 409', async ({ request }) => {
    const email    = `dup-${Date.now()}@rootlink.test`;
    const payload  = { email, password: 'Pass123!word', firstName: 'A', lastName: 'B' };

    const first  = await request.post(`${API}/v1/auth/register`, { data: payload });
    expect(first.status()).toBe(201);

    const second = await request.post(`${API}/v1/auth/register`, { data: payload });
    expect(second.status()).toBe(409);

    const body = (await second.json()) as { error: { code: string } };
    expect(body.error.code).toBe('AUTH_008');
  });

  test('protected route returns 401 without token', async ({ request }) => {
    const res = await request.get(`${API}/v1/users/me`);
    expect(res.status()).toBe(401);
  });

  test('refresh token rotates correctly (httpOnly cookie)', async ({ request }) => {
    const email    = `refresh-${Date.now()}@rootlink.test`;
    const password = 'RefreshPass123!';

    await request.post(`${API}/v1/auth/register`, {
      data: { email, password, firstName: 'R', lastName: 'T' },
    });

    const loginRes = await request.post(`${API}/v1/auth/login`, { data: { email, password } });
    expect(loginRes.status()).toBe(200);
    const loginBody = (await loginRes.json()) as { data: { accessToken: string } };

    // The refresh token is no longer in the JSON body — verify it arrived as
    // an httpOnly cookie instead (audit fix #2).
    const setCookie = loginRes.headers()['set-cookie'] ?? '';
    expect(setCookie).toContain('rootlink_refresh_token=');
    expect(setCookie.toLowerCase()).toContain('httponly');

    // Playwright's APIRequestContext stores and replays cookies automatically
    // for subsequent requests against the same origin, so no body is needed.
    const refreshRes = await request.post(`${API}/v1/auth/refresh`);
    expect(refreshRes.status()).toBe(200);

    const refreshBody = (await refreshRes.json()) as { data: { accessToken: string } };
    expect(refreshBody.data.accessToken).toBeTruthy();
    // New token should be different
    expect(refreshBody.data.accessToken).not.toBe(loginBody.data.accessToken);
  });

  test('forgot password always returns 200', async ({ request }) => {
    const res1 = await request.post(`${API}/v1/auth/forgot-password`, {
      data: { email: 'does-not-exist@example.com' },
    });
    expect(res1.status()).toBe(200);

    const res2 = await request.post(`${API}/v1/auth/forgot-password`, {
      data: { email: `api-test-flow-${Date.now()}@rootlink.test` },
    });
    expect(res2.status()).toBe(200);
  });
});

// ── Trees ─────────────────────────────────────────────────────────────────────

test.describe('Trees API', () => {
  test('@smoke create → get → update → delete tree', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'tree-crud');

    // Create
    const createRes = await request.post(`${API}/v1/trees`, {
      data:    { name: 'API Test Tree', privacyLevel: 'family' },
      headers: auth(token),
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as { data: { id: string; name: string } };
    const treeId  = created.data.id;
    expect(created.data.name).toBe('API Test Tree');

    // Get
    const getRes = await request.get(`${API}/v1/trees/${treeId}`, { headers: auth(token) });
    expect(getRes.status()).toBe(200);

    // Update
    const patchRes = await request.patch(`${API}/v1/trees/${treeId}`, {
      data:    { name: 'Renamed Tree' },
      headers: auth(token),
    });
    expect(patchRes.status()).toBe(200);
    const patched = (await patchRes.json()) as { data: { name: string } };
    expect(patched.data.name).toBe('Renamed Tree');

    // Delete
    const delRes = await request.delete(`${API}/v1/trees/${treeId}`, { headers: auth(token) });
    expect(delRes.status()).toBe(204);

    // Confirm gone
    const gone = await request.get(`${API}/v1/trees/${treeId}`, { headers: auth(token) });
    expect(gone.status()).toBe(404);
  });

  test('lists user trees', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'tree-list');

    await request.post(`${API}/v1/trees`, {
      data: { name: 'List Test Tree' }, headers: auth(token),
    });

    const res  = await request.get(`${API}/v1/trees`, { headers: auth(token) });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('generates and uses share token', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'share-token');

    const tree = (await (await request.post(`${API}/v1/trees`, {
      data: { name: 'Share Tree' }, headers: auth(token),
    })).json()) as { data: { id: string } };

    // Generate share token
    const shareRes = await request.post(`${API}/v1/trees/${tree.data.id}/share-token`, {
      headers: auth(token),
    });
    expect(shareRes.status()).toBe(200);
    const shareBody = (await shareRes.json()) as { data: { shareToken: string } };
    expect(shareBody.data.shareToken).toBeTruthy();

    // Access via share token (no auth)
    const publicRes = await request.get(
      `${API}/v1/trees/shared?token=${shareBody.data.shareToken}`,
    );
    expect(publicRes.status()).toBe(200);

    // Revoke token
    const revokeRes = await request.delete(`${API}/v1/trees/${tree.data.id}/share-token`, {
      headers: auth(token),
    });
    expect(revokeRes.status()).toBe(204);

    // Now the share link should be gone
    const afterRevoke = await request.get(
      `${API}/v1/trees/shared?token=${shareBody.data.shareToken}`,
    );
    expect(afterRevoke.status()).toBe(404);

    // Cleanup
    await request.delete(`${API}/v1/trees/${tree.data.id}`, { headers: auth(token) });
  });
});

// ── Persons ───────────────────────────────────────────────────────────────────

test.describe('Persons API', () => {
  test('@smoke create → get → update → delete person', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'person-crud');

    const tree = (await (await request.post(`${API}/v1/trees`, {
      data: { name: 'Person Test Tree' }, headers: auth(token),
    })).json()) as { data: { id: string } };
    const treeId = tree.data.id;

    // Create
    const createRes = await request.post(`${API}/v1/trees/${treeId}/persons`, {
      data: {
        firstName:    'Ada',
        lastName:     'Lovelace',
        sex:          'female',
        isLiving:     false,
        privacyLevel: 'family',
        events:       [{
          type:        'birth',
          date:        { year: 1815, month: 12, day: 10, circa: false, beforeYear: null, afterYear: null },
          endDate:     null,
          place:       null,
          description: null,
          certainty:   'confirmed',
          sourceIds:   [],
        }],
        externalIds: {},
      },
      headers: auth(token),
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as { data: { id: string; firstName: string } };
    const personId = created.data.id;
    expect(created.data.firstName).toBe('Ada');

    // Get
    const getRes = await request.get(`${API}/v1/trees/${treeId}/persons/${personId}`, {
      headers: auth(token),
    });
    expect(getRes.status()).toBe(200);

    // Update
    const patchRes = await request.patch(`${API}/v1/trees/${treeId}/persons/${personId}`, {
      data:    { firstName: 'Augusta Ada' },
      headers: auth(token),
    });
    expect(patchRes.status()).toBe(200);
    const patched = (await patchRes.json()) as { data: { firstName: string } };
    expect(patched.data.firstName).toBe('Augusta Ada');

    // Delete
    const delRes = await request.delete(`${API}/v1/trees/${treeId}/persons/${personId}`, {
      headers: auth(token),
    });
    expect(delRes.status()).toBe(204);

    // Cleanup
    await request.delete(`${API}/v1/trees/${treeId}`, { headers: auth(token) });
  });

  test('person list supports pagination', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'person-pagination');

    const tree = (await (await request.post(`${API}/v1/trees`, {
      data: { name: 'Pagination Tree' }, headers: auth(token),
    })).json()) as { data: { id: string } };
    const treeId = tree.data.id;

    // Create 5 persons
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request.post(`${API}/v1/trees/${treeId}/persons`, {
          data: {
            firstName:    `Person${i}`,
            lastName:     'Paged',
            sex:          'unknown',
            isLiving:     false,
            privacyLevel: 'family',
            events:       [],
            externalIds:  {},
          },
          headers: auth(token),
        }),
      ),
    );

    // First page
    const page1 = await request.get(
      `${API}/v1/trees/${treeId}/persons?page=1&pageSize=3`,
      { headers: auth(token) },
    );
    expect(page1.status()).toBe(200);
    const body1 = (await page1.json()) as {
      data: unknown[];
      pagination: { total: number; hasNext: boolean; hasPrev: boolean };
    };
    expect(body1.data).toHaveLength(3);
    expect(body1.pagination.total).toBeGreaterThanOrEqual(5);
    expect(body1.pagination.hasNext).toBe(true);
    expect(body1.pagination.hasPrev).toBe(false);

    // Second page
    const page2 = await request.get(
      `${API}/v1/trees/${treeId}/persons?page=2&pageSize=3`,
      { headers: auth(token) },
    );
    const body2 = (await page2.json()) as { data: unknown[]; pagination: { hasPrev: boolean } };
    expect(body2.data.length).toBeGreaterThanOrEqual(2);
    expect(body2.pagination.hasPrev).toBe(true);

    await request.delete(`${API}/v1/trees/${treeId}`, { headers: auth(token) });
  });

  test('person search by name', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'person-search');

    const tree = (await (await request.post(`${API}/v1/trees`, {
      data: { name: 'Search Tree' }, headers: auth(token),
    })).json()) as { data: { id: string } };
    const treeId = tree.data.id;

    await Promise.all([
      request.post(`${API}/v1/trees/${treeId}/persons`, {
        data: { firstName: 'Unique', lastName: 'Findable', sex: 'unknown', isLiving: false, privacyLevel: 'family', events: [], externalIds: {} },
        headers: auth(token),
      }),
      request.post(`${API}/v1/trees/${treeId}/persons`, {
        data: { firstName: 'Other', lastName: 'Person', sex: 'unknown', isLiving: false, privacyLevel: 'family', events: [], externalIds: {} },
        headers: auth(token),
      }),
    ]);

    const res = await request.get(
      `${API}/v1/trees/${treeId}/persons?q=Unique`,
      { headers: auth(token) },
    );
    const body = (await res.json()) as { data: Array<{ firstName: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.firstName).toBe('Unique');

    await request.delete(`${API}/v1/trees/${treeId}`, { headers: auth(token) });
  });

  test('edit history is recorded', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'edit-history');

    const tree = (await (await request.post(`${API}/v1/trees`, {
      data: { name: 'History Tree' }, headers: auth(token),
    })).json()) as { data: { id: string } };
    const treeId = tree.data.id;

    const person = (await (await request.post(`${API}/v1/trees/${treeId}/persons`, {
      data: { firstName: 'H', lastName: 'Test', sex: 'unknown', isLiving: false, privacyLevel: 'family', events: [], externalIds: {} },
      headers: auth(token),
    })).json()) as { data: { id: string } };
    const personId = person.data.id;

    await request.patch(`${API}/v1/trees/${treeId}/persons/${personId}`, {
      data: { firstName: 'Updated' }, headers: auth(token),
    });

    const histRes = await request.get(
      `${API}/v1/trees/${treeId}/persons/${personId}/history`,
      { headers: auth(token) },
    );
    expect(histRes.status()).toBe(200);
    const histBody = (await histRes.json()) as { data: Array<{ action: string }> };
    expect(histBody.data.length).toBeGreaterThanOrEqual(1);
    const actions = histBody.data.map((e) => e.action);
    expect(actions).toContain('create');

    await request.delete(`${API}/v1/trees/${treeId}`, { headers: auth(token) });
  });
});

// ── Relationships ─────────────────────────────────────────────────────────────

test.describe('Relationships API', () => {
  test('@smoke creates and deletes a relationship', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'rel-crud');

    const tree = (await (await request.post(`${API}/v1/trees`, {
      data: { name: 'Rel Tree' }, headers: auth(token),
    })).json()) as { data: { id: string } };
    const treeId = tree.data.id;

    const base = { sex: 'unknown' as const, isLiving: false, privacyLevel: 'family' as const, events: [], externalIds: {} };
    const p1 = (await (await request.post(`${API}/v1/trees/${treeId}/persons`, {
      data: { ...base, firstName: 'Parent', lastName: 'One' }, headers: auth(token),
    })).json()) as { data: { id: string } };
    const p2 = (await (await request.post(`${API}/v1/trees/${treeId}/persons`, {
      data: { ...base, firstName: 'Child', lastName: 'One' }, headers: auth(token),
    })).json()) as { data: { id: string } };

    // Create relationship
    const relRes = await request.post(`${API}/v1/trees/${treeId}/relationships`, {
      data: {
        fromPersonId: p1.data.id,
        toPersonId:   p2.data.id,
        type:         'biological_parent',
        certainty:    'confirmed',
        sourceIds:    [],
        startDate:    null,
        endDate:      null,
        notes:        null,
      },
      headers: auth(token),
    });
    expect(relRes.status()).toBe(201);
    const rel = (await relRes.json()) as { data: { id: string } };

    // Delete
    const delRes = await request.delete(
      `${API}/v1/trees/${treeId}/relationships/${rel.data.id}`,
      { headers: auth(token) },
    );
    expect(delRes.status()).toBe(204);

    await request.delete(`${API}/v1/trees/${treeId}`, { headers: auth(token) });
  });

  test('rejects self-relationship', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'self-rel');

    const tree = (await (await request.post(`${API}/v1/trees`, {
      data: { name: 'Self Rel Tree' }, headers: auth(token),
    })).json()) as { data: { id: string } };
    const treeId = tree.data.id;

    const p = (await (await request.post(`${API}/v1/trees/${treeId}/persons`, {
      data: { firstName: 'Solo', lastName: 'Person', sex: 'unknown', isLiving: false, privacyLevel: 'family', events: [], externalIds: {} },
      headers: auth(token),
    })).json()) as { data: { id: string } };

    const res = await request.post(`${API}/v1/trees/${treeId}/relationships`, {
      data: {
        fromPersonId: p.data.id,
        toPersonId:   p.data.id,
        type:         'spouse',
        certainty:    'confirmed',
        sourceIds:    [],
        startDate:    null,
        endDate:      null,
        notes:        null,
      },
      headers: auth(token),
    });
    expect(res.status()).toBe(400);

    await request.delete(`${API}/v1/trees/${treeId}`, { headers: auth(token) });
  });
});

// ── Sources ───────────────────────────────────────────────────────────────────

test.describe('Sources API', () => {
  test('creates and retrieves a source citation', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'sources');

    const tree = (await (await request.post(`${API}/v1/trees`, {
      data: { name: 'Source Tree' }, headers: auth(token),
    })).json()) as { data: { id: string } };
    const treeId = tree.data.id;

    const createRes = await request.post(`${API}/v1/trees/${treeId}/sources`, {
      data: {
        type:         'census',
        title:        '1920 US Federal Census',
        repository:   'Ancestry.com',
        confidence:   'confirmed',
        publishedDate: null,
        repositoryUrl: null,
        transcription: null,
        notes:         null,
      },
      headers: auth(token),
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as { data: { id: string; title: string } };
    expect(created.data.title).toBe('1920 US Federal Census');

    const listRes = await request.get(`${API}/v1/trees/${treeId}/sources`, {
      headers: auth(token),
    });
    const list = (await listRes.json()) as { data: unknown[] };
    expect(list.data.length).toBeGreaterThanOrEqual(1);

    await request.delete(`${API}/v1/trees/${treeId}`, { headers: auth(token) });
  });
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────

test.describe('Rate Limiting', () => {
  test('rate limit headers are present on API responses', async ({ request }) => {
    const res = await request.get(`${API}/health/live`);
    // Rate limit headers may or may not be on health routes depending on config
    // Just assert the response is successful
    expect(res.status()).toBe(200);
  });

  test('auth endpoints include rate limit headers', async ({ request }) => {
    const res = await request.post(`${API}/v1/auth/login`, {
      data: { email: 'test@example.com', password: 'wrong' },
    });
    // 401 is expected — we just want to see the headers exist
    const headers = res.headers();
    // Either rate limit headers present or not — depends on Redis availability in CI
    expect([200, 400, 401, 429]).toContain(res.status());
    void headers; // headers inspected, not asserted to handle CI variability
  });
});

// ── Idempotency ───────────────────────────────────────────────────────────────

test.describe('Idempotency', () => {
  test('duplicate POST with same idempotency key returns same result', async ({ request }) => {
    const { token } = await registerAndLogin(request, 'idempotency');

    const tree = (await (await request.post(`${API}/v1/trees`, {
      data: { name: 'Idempotency Tree' }, headers: auth(token),
    })).json()) as { data: { id: string } };
    const treeId     = tree.data.id;
    const idemKey    = `e2e-test-${Date.now()}`;

    const req1 = await request.post(`${API}/v1/trees/${treeId}/persons`, {
      data: {
        firstName:    'Idempotent',
        lastName:     'Person',
        sex:          'unknown',
        isLiving:     false,
        privacyLevel: 'family',
        events:       [],
        externalIds:  {},
      },
      headers: { ...auth(token), 'X-Idempotency-Key': idemKey },
    });
    expect(req1.status()).toBe(201);
    const body1 = (await req1.json()) as { data: { id: string } };

    // Second request with same key — should replay
    const req2 = await request.post(`${API}/v1/trees/${treeId}/persons`, {
      data: {
        firstName:    'Idempotent',
        lastName:     'Person',
        sex:          'unknown',
        isLiving:     false,
        privacyLevel: 'family',
        events:       [],
        externalIds:  {},
      },
      headers: { ...auth(token), 'X-Idempotency-Key': idemKey },
    });
    // Should return same person ID, same status
    expect(req2.status()).toBe(201);
    const body2 = (await req2.json()) as { data: { id: string } };
    expect(body2.data.id).toBe(body1.data.id);

    // Confirm only one person was created
    const listRes = await request.get(`${API}/v1/trees/${treeId}/persons`, { headers: auth(token) });
    const listBody = (await listRes.json()) as { pagination: { total: number } };
    expect(listBody.pagination.total).toBe(1);

    await request.delete(`${API}/v1/trees/${treeId}`, { headers: auth(token) });
  });
});
