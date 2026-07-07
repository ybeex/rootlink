import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../server.js';
import type { FastifyInstance } from 'fastify';

// These tests require a test DB and Redis.
// Run: DATABASE_URL=... REDIS_URL=... vitest

describe('Auth Routes', () => {
  let app: FastifyInstance;

  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'SecurePass123!',
    firstName: 'Test',
    lastName: 'User',
  };

  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/auth/register - creates a new user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: testUser,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<{ success: boolean; data: { user: { email: string } } }>();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(testUser.email);
  });

  it('POST /v1/auth/register - rejects duplicate email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: testUser,
    });
    expect(response.statusCode).toBe(409);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('AUTH_008');
  });

  it('POST /v1/auth/login - returns tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: testUser.email, password: testUser.password },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      success: boolean;
      data: { accessToken: string; refreshToken: string };
    }>();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
    accessToken = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  it('POST /v1/auth/login - rejects bad password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: testUser.email, password: 'WrongPassword!' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('GET /v1/users/me - returns profile with valid token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/users/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ data: { email: string } }>();
    expect(body.data.email).toBe(testUser.email);
  });

  it('GET /v1/users/me - rejects missing token', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/users/me' });
    expect(response.statusCode).toBe(401);
  });

  it('POST /v1/auth/refresh - rotates tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ data: { accessToken: string } }>();
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.accessToken).not.toBe(accessToken);
    accessToken = body.data.accessToken;
  });

  it('POST /v1/auth/logout - revokes tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(response.statusCode).toBe(204);
  });
});

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live - returns 200', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ status: string }>();
    expect(body.status).toBe('ok');
  });

  it('GET /health/version - returns version info', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/version' });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ name: string }>();
    expect(body.name).toBe('rootlink-api');
  });
});

describe('Trees Routes', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let treeId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Register + login
    const email = `tree_test_${Date.now()}@example.com`;
    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'SecurePass123!', firstName: 'Tree', lastName: 'Tester' },
    });
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'SecurePass123!' },
    });
    const loginBody = loginRes.json<{ data: { accessToken: string } }>();
    accessToken = loginBody.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/trees - creates a tree', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/trees',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Smith Family Tree', description: 'Our family history' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<{ data: { id: string; name: string } }>();
    expect(body.data.name).toBe('Smith Family Tree');
    treeId = body.data.id;
  });

  it('GET /v1/trees - lists user trees', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/trees',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ data: unknown[] }>();
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('GET /v1/trees/:treeId - gets one tree', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/trees/${treeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(response.statusCode).toBe(200);
  });

  it('PATCH /v1/trees/:treeId - updates tree', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/trees/${treeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Updated Smith Tree' },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ data: { name: string } }>();
    expect(body.data.name).toBe('Updated Smith Tree');
  });

  it('POST /v1/trees/:treeId/persons - creates a person', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/v1/trees/${treeId}/persons`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        firstName: 'John',
        lastName: 'Smith',
        sex: 'male',
        isLiving: false,
        events: [
          {
            type: 'birth',
            date: { year: 1920, month: 5, day: 12, circa: false, beforeYear: null, afterYear: null },
            certainty: 'confirmed',
            sourceIds: [],
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<{ data: { id: string; firstName: string } }>();
    expect(body.data.firstName).toBe('John');
  });
});
