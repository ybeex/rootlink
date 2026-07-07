/**
 * Visual regression tests — captures screenshots of key pages and compares
 * against stored baselines. Run `playwright test --update-snapshots` to
 * regenerate baselines after intentional design changes.
 *
 * Snapshots are stored in tests/visual/snapshots/ and committed to git.
 */
import { test, expect } from '../../helpers/fixtures.ts';

// Mask dynamic content that changes between runs (timestamps, live indicators)
const DYNAMIC_MASKS = [
  { selector: '[data-sonner-toast]' },     // toasts
  { selector: '.font-mono' },              // timestamps in mono font
  { selector: 'time' },                    // time elements
];

function maskSelectors(page: Parameters<Parameters<typeof test>[1]>[0]['page']) {
  return DYNAMIC_MASKS.map((m) => page.locator(m.selector));
}

// ── Auth pages ────────────────────────────────────────────────────────────────

test.describe('Visual — Auth pages', () => {
  test('login page — light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-light.png', {
      mask:          maskSelectors(page),
      fullPage:      true,
      threshold:     0.02,
      maxDiffPixels: 200,
    });
  });

  test('login page — dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.documentElement.classList.add('dark'));

    await expect(page).toHaveScreenshot('login-dark.png', {
      mask:          maskSelectors(page),
      fullPage:      true,
      threshold:     0.02,
      maxDiffPixels: 200,
    });
  });

  test('register page — light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('register-light.png', {
      mask:          maskSelectors(page),
      fullPage:      true,
      threshold:     0.02,
      maxDiffPixels: 200,
    });
  });

  test('forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('forgot-password.png', {
      fullPage:      true,
      threshold:     0.02,
      maxDiffPixels: 200,
    });
  });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

test.describe('Visual — Dashboard', () => {
  test('dashboard — light mode — empty state', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for content to stabilise
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-light.png', {
      mask:          maskSelectors(page),
      fullPage:      false,  // viewport only — avoids scrolling noise
      threshold:     0.03,
      maxDiffPixels: 500,
    });
  });

  test('dashboard — dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      mask:          maskSelectors(page),
      fullPage:      false,
      threshold:     0.03,
      maxDiffPixels: 500,
    });
  });
});

// ── Tree page ─────────────────────────────────────────────────────────────────

test.describe('Visual — Tree page', () => {
  test('empty tree canvas', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('tree-empty.png', {
      mask:          maskSelectors(page),
      fullPage:      false,
      threshold:     0.03,
      maxDiffPixels: 500,
    });
  });

  test('tree toolbar', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}`);
    await page.waitForLoadState('networkidle');

    // Screenshot just the toolbar
    const toolbar = page.locator('header').nth(1).or(
      page.locator('.flex.h-12.shrink-0').first(),
    );

    await expect(toolbar).toHaveScreenshot('tree-toolbar.png', {
      threshold:     0.02,
      maxDiffPixels: 100,
    });
  });
});

// ── Settings page ─────────────────────────────────────────────────────────────

test.describe('Visual — Settings', () => {
  test('settings page — profile section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('settings-profile.png', {
      mask:          maskSelectors(page),
      fullPage:      false,
      threshold:     0.03,
      maxDiffPixels: 400,
    });
  });

  test('settings page — subscription section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /subscription/i }).click();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('settings-subscription.png', {
      mask:          maskSelectors(page),
      fullPage:      false,
      threshold:     0.03,
      maxDiffPixels: 400,
    });
  });
});

// ── Person form ───────────────────────────────────────────────────────────────

test.describe('Visual — Person form', () => {
  test('new person form — blank state', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/persons/new`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('person-form-blank.png', {
      fullPage:      true,
      threshold:     0.02,
      maxDiffPixels: 300,
    });
  });

  test('new person form — with events expanded', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/persons/new`);
    await page.waitForLoadState('networkidle');

    // Add an event
    await page.getByRole('button', { name: /add life event/i }).click();
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('person-form-with-event.png', {
      fullPage:      true,
      threshold:     0.02,
      maxDiffPixels: 400,
    });
  });
});

// ── Modals ────────────────────────────────────────────────────────────────────

test.describe('Visual — Modals', () => {
  test('invite member modal', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /invite member/i }).click();
    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('modal-invite-member.png', {
      mask:          maskSelectors(page),
      fullPage:      false,
      threshold:     0.02,
      maxDiffPixels: 300,
    });
  });
});

// ── Component-level screenshots ───────────────────────────────────────────────

test.describe('Visual — Components', () => {
  test('sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('aside').first();
    await expect(sidebar).toHaveScreenshot('sidebar.png', {
      threshold:     0.02,
      maxDiffPixels: 200,
    });
  });

  test('notifications panel open', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /notifications/i }).click();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('notifications-panel.png', {
      mask:          maskSelectors(page),
      fullPage:      false,
      threshold:     0.03,
      maxDiffPixels: 400,
    });
  });

  test('search page — initial state', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('search-empty.png', {
      mask:          maskSelectors(page),
      fullPage:      false,
      threshold:     0.02,
      maxDiffPixels: 300,
    });
  });
});
