/**
 * Global setup: runs once before all test suites.
 * Creates the E2E test users via the API and saves browser auth state
 * (cookies + localStorage) so authenticated tests skip the login flow.
 */
import { test as setup, expect } from '@playwright/test';

const BASE_URL  = process.env['BASE_URL']  ?? 'http://localhost:3000';
const API_URL   = process.env['API_URL']   ?? 'http://localhost:3001';
const EMAIL     = process.env['E2E_USER_EMAIL']    ?? 'e2e@rootlink.test';
const PASSWORD  = process.env['E2E_USER_PASSWORD'] ?? 'E2ePassword123!';
const EMAIL2    = process.env['E2E_USER2_EMAIL']   ?? 'e2e-collaborator@rootlink.test';
const PASSWORD2 = process.env['E2E_USER2_PASSWORD'] ?? 'E2ePassword123!';

async function ensureUserExists(
  request: Parameters<Parameters<typeof setup>[1]>[0]['request'],
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) {
  const res = await request.post(`${API_URL}/v1/auth/register`, {
    data: { email, password, firstName, lastName },
  });
  // 201 = created, 409 = already exists — both are acceptable
  if (res.status() !== 201 && res.status() !== 409) {
    throw new Error(`Failed to ensure user ${email} exists: ${res.status()}`);
  }
}

setup('create test users and save auth state', async ({ page, request }) => {
  // ── Ensure both test users exist ─────────────────────────────────────────
  await ensureUserExists(request, EMAIL,  PASSWORD,  'E2E',  'Tester');
  await ensureUserExists(request, EMAIL2, PASSWORD2, 'E2E',  'Collaborator');

  // ── Log in as primary test user via the UI ────────────────────────────────
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('textbox', { name: /email/i }).fill(EMAIL);
  await page.getByRole('textbox', { name: /password/i }).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for successful redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: /your trees/i })).toBeVisible({ timeout: 10_000 });

  // ── Save storage state (cookies + localStorage with tokens) ──────────────
  await page.context().storageState({ path: 'fixtures/auth-state.json' });
});
