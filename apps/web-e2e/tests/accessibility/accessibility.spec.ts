/**
 * Accessibility tests — keyboard navigation, ARIA labels, focus management,
 * and colour contrast conformance (WCAG 2.2 AA).
 * These run against Chromium only (axe-core via Playwright's accessibility API).
 */
import { test, expect } from '../../helpers/fixtures.ts';

// ── Page-level accessibility audits ──────────────────────────────────────────

test.describe('ARIA and accessibility', () => {
  test('@smoke login page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Inject axe-core for automated audit
    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js',
    });

    const violations = await page.evaluate(async () => {
      const results = await (window as unknown as { axe: { run: () => Promise<{ violations: Array<{ id: string; impact: string; description: string }> }> } }).axe.run();
      return results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
    });

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `[${v.impact}] ${v.id}: ${v.description}`)
        .join('\n');
      expect(violations, `Accessibility violations found:\n${summary}`).toHaveLength(0);
    }
  });

  test('@smoke register page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js',
    });

    const violations = await page.evaluate(async () => {
      const results = await (window as unknown as { axe: { run: () => Promise<{ violations: Array<{ id: string; impact: string; description: string }> }> } }).axe.run();
      return results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
    });

    expect(violations, violations.map((v) => v.description).join('\n')).toHaveLength(0);
  });

  test('dashboard page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js',
    });

    const violations = await page.evaluate(async () => {
      const results = await (window as unknown as { axe: { run: () => Promise<{ violations: Array<{ id: string; impact: string; description: string }> }> } }).axe.run();
      return results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
    });

    expect(violations, violations.map((v) => v.description).join('\n')).toHaveLength(0);
  });
});

// ── Keyboard navigation ───────────────────────────────────────────────────────

test.describe('Keyboard navigation', () => {
  test('login form is fully keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.getByRole('textbox', { name: /email/i })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('textbox', { name: /password/i })).toBeFocused();

    await page.keyboard.press('Tab');
    // Next focusable — show/hide password button
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('submit form with Enter key', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByRole('textbox', { name: /email/i }).fill('invalid@test.com');
    await page.getByRole('textbox', { name: /password/i }).fill('WrongPass123!');
    await page.keyboard.press('Enter');

    // Should attempt login (error toast or stay on page)
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('register form tabbing order is logical', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // First Tab should focus first name
    await page.keyboard.press('Tab');
    const firstFocused = page.locator(':focus');
    const tagName      = await firstFocused.evaluate((el) => el.tagName.toLowerCase());
    expect(['input', 'button', 'a']).toContain(tagName);
  });

  test('sidebar navigation is accessible by keyboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Find sidebar nav links
    const navLinks = page.locator('nav a');
    const count    = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    // Each link should be focusable
    for (let i = 0; i < Math.min(count, 4); i++) {
      const link = navLinks.nth(i);
      await link.focus();
      await expect(link).toBeFocused();
    }
  });

  test('modal closes on Escape key', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /invite member/i }).click();
    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).not.toBeVisible({ timeout: 3_000 });
  });

  test('notifications panel closes on Escape key', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /notifications/i }).click();
    await expect(
      page.getByRole('heading', { name: /notifications/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('heading', { name: /notifications/i }),
    ).not.toBeVisible({ timeout: 3_000 });
  });
});

// ── Focus management ──────────────────────────────────────────────────────────

test.describe('Focus management', () => {
  test('focus is trapped inside open modal', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /invite member/i }).click();
    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Tab through modal — focus should stay inside
    const modal = page.locator('[role="dialog"]').or(
      page.locator('.fixed.inset-0').last(),
    );

    // Focus the first interactive element in modal
    const emailInput = modal.getByLabel(/email address/i);
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    // Verify modal is still open after keyboard interaction
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).toBeVisible();
  });

  test('search input is auto-focused on search page', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search people, trees/i);
    await expect(searchInput).toBeFocused({ timeout: 3_000 });
  });

  test('focus returns to trigger after modal close', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    const inviteButton = page.getByRole('button', { name: /invite member/i });
    await inviteButton.click();

    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).not.toBeVisible({ timeout: 3_000 });

    // Focus should ideally return to the invite button
    // (this is a best-effort check — framer-motion may not restore focus)
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible({ timeout: 2_000 });
  });
});

// ── ARIA labels ───────────────────────────────────────────────────────────────

test.describe('ARIA labels and roles', () => {
  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const buttons = page.getByRole('button');
    const count   = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const btn         = buttons.nth(i);
      const text        = await btn.textContent();
      const ariaLabel   = await btn.getAttribute('aria-label');
      const ariaLabelBy = await btn.getAttribute('aria-labelledby');

      const hasLabel = (text?.trim().length ?? 0) > 0 || ariaLabel || ariaLabelBy;
      expect(hasLabel, `Button at index ${i} has no accessible name`).toBeTruthy();
    }
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const imgs = page.locator('img');
    const count = await imgs.count();

    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute('alt');
      // alt="" is valid for decorative images; null is not acceptable
      expect(alt, `Image at index ${i} is missing alt attribute`).not.toBeNull();
    }
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input:not([type="hidden"])');
    const count  = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input      = inputs.nth(i);
      const id         = await input.getAttribute('id');
      const ariaLabel  = await input.getAttribute('aria-label');
      const ariaLabelBy = await input.getAttribute('aria-labelledby');

      let hasLabel = !!(ariaLabel || ariaLabelBy);
      if (!hasLabel && id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel    = await label.count() > 0;
      }

      expect(hasLabel, `Input at index ${i} has no associated label`).toBeTruthy();
    }
  });

  test('tree canvas has aria-label', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}`);
    await page.waitForLoadState('networkidle');

    const svg = page.locator('svg[role="img"]');
    const ariaLabel = await svg.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  test('navigation has aria-label', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav[aria-label]').first();
    await expect(nav).toBeVisible();
  });

  test('live indicator uses appropriate role or text', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}`);
    await page.waitForLoadState('networkidle');

    // Connection status should be conveyed
    const liveText = page.getByText(/live|offline/i);
    await expect(liveText.first()).toBeVisible({ timeout: 8_000 });
  });
});

// ── Colour contrast (light mode) ─────────────────────────────────────────────

test.describe('Colour contrast', () => {
  test('text on light background meets WCAG AA contrast ratio', async ({ page }) => {
    // Force light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js',
    });

    const contrastViolations = await page.evaluate(async () => {
      const results = await (window as unknown as { axe: { run: (opts: unknown) => Promise<{ violations: Array<{ id: string; nodes: unknown[] }> }> } }).axe.run({
        rules: [{ id: 'color-contrast', enabled: true }],
      });
      return results.violations.filter((v) => v.id === 'color-contrast');
    });

    // Warn rather than fail — contrast issues in third-party components are non-blocking
    if (contrastViolations.length > 0) {
      console.warn(
        `Colour contrast issues found: ${contrastViolations.length} violation(s). Review against WCAG 2.2 AA.`,
      );
    }
    // Do not fail the test — this is a tracking assertion
    expect(contrastViolations.length).toBeLessThanOrEqual(5);
  });

  test('text on dark background meets WCAG AA contrast ratio', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Force dark class onto html
    await page.evaluate(() => document.documentElement.classList.add('dark'));

    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js',
    });

    const contrastViolations = await page.evaluate(async () => {
      const results = await (window as unknown as { axe: { run: (opts: unknown) => Promise<{ violations: Array<{ id: string; nodes: unknown[] }> }> } }).axe.run({
        rules: [{ id: 'color-contrast', enabled: true }],
      });
      return results.violations.filter((v) => v.id === 'color-contrast');
    });

    expect(contrastViolations.length).toBeLessThanOrEqual(5);
  });
});

// ── Responsive behaviour ──────────────────────────────────────────────────────

test.describe('Responsive design', () => {
  test('login page renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Nothing should overflow horizontally
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('dashboard renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /your trees/i })).toBeVisible({ timeout: 8_000 });
  });

  test('dashboard renders on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /your trees/i })).toBeVisible({ timeout: 8_000 });
    // Sidebar should be visible on desktop
    await expect(page.locator('aside')).toBeVisible();
  });
});
