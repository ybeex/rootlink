/**
 * E2E seed script — run before a test suite to ensure test users exist.
 * Usage: npx tsx scripts/seed-e2e.ts
 * This is separate from the auth.setup.ts Playwright setup because it can
 * also be run standalone in CI before the test matrix starts.
 */
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const API      = process.env['API_URL']            ?? 'http://localhost:3001';
const EMAIL    = process.env['E2E_USER_EMAIL']     ?? 'e2e@rootlink.test';
const PASSWORD = process.env['E2E_USER_PASSWORD']  ?? 'E2ePassword123!';
const EMAIL2   = process.env['E2E_USER2_EMAIL']    ?? 'e2e-collaborator@rootlink.test';
const PASS2    = process.env['E2E_USER2_PASSWORD'] ?? 'E2ePassword123!';

interface RegisterPayload {
  email:     string;
  password:  string;
  firstName: string;
  lastName:  string;
}

async function register(payload: RegisterPayload): Promise<void> {
  const res = await fetch(`${API}/v1/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (res.status === 201) {
    console.log(`  Created: ${payload.email}`);
  } else if (res.status === 409) {
    console.log(`  Already exists: ${payload.email}`);
  } else {
    const body = await res.text();
    throw new Error(`Failed to register ${payload.email}: ${res.status} ${body}`);
  }
}

async function waitForApi(maxRetries = 30, delayMs = 2_000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${API}/health/live`);
      if (res.ok) {
        console.log(`API is ready at ${API}`);
        return;
      }
    } catch {
      // Not ready yet
    }
    console.log(`Waiting for API... (${i + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`API not available at ${API} after ${maxRetries} retries`);
}

async function main() {
  console.log('RootLink E2E seed starting...');
  console.log(`Target API: ${API}`);

  await waitForApi();

  console.log('\nProvisioning test users:');

  await register({
    email:     EMAIL,
    password:  PASSWORD,
    firstName: 'E2E',
    lastName:  'Tester',
  });

  await register({
    email:     EMAIL2,
    password:  PASS2,
    firstName: 'E2E',
    lastName:  'Collaborator',
  });

  console.log('\nSeed complete. Test users are ready.\n');
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
