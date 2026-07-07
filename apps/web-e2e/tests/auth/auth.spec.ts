import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage.ts';

const EMAIL    = process.env['E2E_USER_EMAIL']    ?? 'e2e@rootlink.test';
const PASSWORD = process.env['E2E_USER_PASSWORD'] ?? 'E2ePassword123!';

// ── Registration ──────────────────────────────────────────────────────────────

test.describe('Registration', () => {
  test('renders register page with all required fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create free account/i })).toBeVisible();
  });

  test('shows password strength indicators as user types', async ({ page }) => {
    await page.goto('/register');
    const passwordField = page.getByLabel(/password/i);

    await passwordField.fill('short');
    await expect(page.getByText(/at least 12 characters/i)).toBeVisible();

    await passwordField.fill('LongerPassword1');
    await expect(page.getByText(/one special character/i)).toBeVisible();
  });

  test('rejects weak password on submit', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/first name/i).fill('Test');
    await page.getByLabel(/last name/i).fill('User');
    await page.getByLabel(/email/i).fill(`weak-${Date.now()}@test.com`);
    await page.getByLabel(/password/i).fill('weak');
    await page.getByRole('button', { name: /create free account/i }).click();

    // Validation error should appear without navigating
    await expect(page).toHaveURL(/\/register/);
  });

  test('rejects duplicate email', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/first name/i).fill('Dupe');
    await page.getByLabel(/last name/i).fill('User');
    await page.getByLabel(/email/i).fill(EMAIL); // Already exists
    await page.getByLabel(/password/i).fill('ValidPass123!');
    await page.getByRole('button', { name: /create free account/i }).click();

    await expect(page.locator('[data-sonner-toast]')).toContainText(
      /already exists/i,
      { timeout: 8_000 },
    );
  });

  test('link to login page works', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

test.describe('Login', () => {
  test('@smoke renders login page correctly', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.forgotLink).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test('@smoke successful login redirects to dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /your trees/i })).toBeVisible();
  });

  test('rejects wrong password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillCredentials(EMAIL, 'WrongPassword123!');
    await loginPage.submit();
    await loginPage.expectError(/invalid email or password/i);
    // Must stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('rejects invalid email format', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.emailInput.fill('not-an-email');
    await loginPage.passwordInput.fill('SomePass123!');
    await loginPage.submit();
    // HTML5 validation or server validation should block submission
    await expect(page).toHaveURL(/\/login/);
  });

  test('forgot password link navigates correctly', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.forgotLink.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('register link navigates correctly', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('eye icon toggles password visibility', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.passwordInput.fill('TestPassword123!');

    // Initially hidden
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    // Click show
    await page.getByRole('button', { name: /show password/i }).click();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

    // Click hide
    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });
});

// ── Forgot Password ───────────────────────────────────────────────────────────

test.describe('Forgot Password', () => {
  test('renders forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });

  test('shows success message for any email (prevents enumeration)', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByRole('textbox', { name: /email/i }).fill('nonexistent@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();

    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('shows success message for real email too', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL);
    await page.getByRole('button', { name: /send reset link/i }).click();

    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('back to sign in link works', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByRole('link', { name: /back to sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

test.describe('Logout', () => {
  test('logout button redirects to login', async ({ page }) => {
    // This test starts authenticated (storageState is loaded)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click logout button in sidebar
    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('protected routes redirect to login when unauthenticated', async ({ browser }) => {
    // Use a fresh context with no auth state
    const ctx  = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    await page.goto('/trees/some-tree-id');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    await ctx.close();
  });
});
