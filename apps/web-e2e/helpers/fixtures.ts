import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';

// ── Typed test data ───────────────────────────────────────────────────────────

export interface TestUser {
  email:     string;
  password:  string;
  firstName: string;
  lastName:  string;
}

export interface CreatedTree {
  id:   string;
  name: string;
}

export interface CreatedPerson {
  id:          string;
  firstName:   string;
  lastName:    string;
  treeId:      string;
}

// ── API helper (direct HTTP, no UI) ──────────────────────────────────────────

export class ApiHelper {
  private accessToken: string | null = null;

  constructor(private readonly request: APIRequestContext, private readonly apiBase: string) {}

  async login(email: string, password: string): Promise<string> {
    const res = await this.request.post(`${this.apiBase}/v1/auth/login`, {
      data: { email, password },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { data: { accessToken: string } };
    this.accessToken = body.data.accessToken;
    return this.accessToken;
  }

  async register(user: TestUser): Promise<void> {
    const res = await this.request.post(`${this.apiBase}/v1/auth/register`, {
      data: user,
    });
    // 201 = created, 409 = already exists (idempotent in test env)
    expect([201, 409]).toContain(res.status());
  }

  private authHeaders() {
    return { Authorization: `Bearer ${this.accessToken ?? ''}` };
  }

  async createTree(name: string): Promise<CreatedTree> {
    const res = await this.request.post(`${this.apiBase}/v1/trees`, {
      data:    { name, privacyLevel: 'family' },
      headers: this.authHeaders(),
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as { data: CreatedTree };
    return body.data;
  }

  async deleteTree(treeId: string): Promise<void> {
    await this.request.delete(`${this.apiBase}/v1/trees/${treeId}`, {
      headers: this.authHeaders(),
    });
  }

  async createPerson(treeId: string, data: {
    firstName: string;
    lastName:  string;
    sex?:      string;
    isLiving?: boolean;
  }): Promise<CreatedPerson> {
    const res = await this.request.post(`${this.apiBase}/v1/trees/${treeId}/persons`, {
      data: {
        firstName:    data.firstName,
        lastName:     data.lastName,
        sex:          data.sex ?? 'unknown',
        isLiving:     data.isLiving ?? false,
        privacyLevel: 'family',
        events:       [],
        externalIds:  {},
      },
      headers: this.authHeaders(),
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as { data: { id: string; firstName: string; lastName: string } };
    return { ...body.data, treeId };
  }

  async deletePerson(treeId: string, personId: string): Promise<void> {
    await this.request.delete(`${this.apiBase}/v1/trees/${treeId}/persons/${personId}`, {
      headers: this.authHeaders(),
    });
  }

  async createRelationship(
    treeId: string,
    fromPersonId: string,
    toPersonId: string,
    type: string,
  ): Promise<{ id: string }> {
    const res = await this.request.post(`${this.apiBase}/v1/trees/${treeId}/relationships`, {
      data: {
        fromPersonId,
        toPersonId,
        type,
        certainty: 'confirmed',
        sourceIds: [],
        startDate: null,
        endDate: null,
        notes: null,
      },
      headers: this.authHeaders(),
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as { data: { id: string } };
    return body.data;
  }
}

// ── Custom fixture types ──────────────────────────────────────────────────────

interface E2EFixtures {
  api:          ApiHelper;
  authedPage:   Page;
  testTree:     CreatedTree;
}

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';
const E2E_EMAIL    = process.env['E2E_USER_EMAIL']    ?? 'e2e@rootlink.test';
const E2E_PASSWORD = process.env['E2E_USER_PASSWORD'] ?? 'E2ePassword123!';

// ── Extended test object ──────────────────────────────────────────────────────

export const test = base.extend<E2EFixtures>({
  // API helper — direct HTTP calls, no browser
  api: async ({ request }, use) => {
    const api = new ApiHelper(request, API_URL);
    await api.login(E2E_EMAIL, E2E_PASSWORD);
    await use(api);
  },

  // Page pre-loaded with auth state from storage state file
  authedPage: async ({ page }, use) => {
    await use(page);
  },

  // A clean tree created before each test that uses it, deleted after
  testTree: async ({ api }, use) => {
    const uniqueName = `Test Tree ${Date.now()}`;
    const tree = await api.createTree(uniqueName);
    await use(tree);
    // Cleanup: delete tree after test
    await api.deleteTree(tree.id).catch(() => undefined);
  },
});

export { expect };
