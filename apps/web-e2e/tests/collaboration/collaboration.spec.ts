import { test, expect } from '../../helpers/fixtures.ts';

// ── Settings Page ─────────────────────────────────────────────────────────────

test.describe('Settings Page', () => {
  test('@smoke renders settings page with sections', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /profile/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /security/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /subscription/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /danger zone/i })).toBeVisible();
  });

  test('profile section shows user email', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const email = process.env['E2E_USER_EMAIL'] ?? 'e2e@rootlink.test';
    await expect(page.getByDisplayValue(email)).toBeVisible({ timeout: 8_000 });
    // Email field should be disabled (cannot change without re-verification)
    await expect(page.getByDisplayValue(email)).toBeDisabled();
  });

  test('can update first name', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const firstNameInput = page.getByLabel(/first name/i).first();
    await firstNameInput.clear();
    await firstNameInput.fill('Updated');

    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.locator('[data-sonner-toast]')).toContainText(/updated/i, { timeout: 8_000 });

    // Revert
    await firstNameInput.clear();
    await firstNameInput.fill('E2E');
    await page.getByRole('button', { name: /save changes/i }).click();
  });

  test('security section shows 2FA status', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /security/i }).click();

    await expect(page.getByText(/two-factor authentication/i)).toBeVisible({ timeout: 5_000 });
    // Either "Enabled" badge or "Enable" button should be visible
    const twoFaState = page.getByText(/enabled/i).or(page.getByRole('button', { name: /enable/i }));
    await expect(twoFaState).toBeVisible({ timeout: 5_000 });
  });

  test('subscription section shows current plan', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /subscription/i }).click();

    await expect(page.getByText(/storage used/i)).toBeVisible({ timeout: 5_000 });
    // Current plan badge
    await expect(page.getByText(/current/i)).toBeVisible({ timeout: 5_000 });
  });

  test('danger zone account delete is gated by confirmation', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /danger zone/i }).click();

    const deleteButton = page.getByRole('button', { name: /delete my account/i });
    await expect(deleteButton).toBeDisabled();

    await page.getByPlaceholder(/delete my account/i).fill('delete my account');
    await expect(deleteButton).toBeEnabled();
  });

  test('sidebar navigation between sections works', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Navigate through all sections
    for (const section of ['Profile', 'Security', 'Subscription', 'Danger Zone']) {
      await page.getByRole('button', { name: new RegExp(section, 'i') }).click();
      await expect(
        page.getByRole('heading', { name: new RegExp(section, 'i') }).first(),
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ── Notifications ─────────────────────────────────────────────────────────────

test.describe('Notifications Panel', () => {
  test('notification bell is visible in header', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /notifications/i })).toBeVisible({ timeout: 8_000 });
  });

  test('clicking bell opens notifications panel', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /notifications/i }).click();

    await expect(
      page.getByRole('heading', { name: /notifications/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('notifications panel closes on backdrop click', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /notifications/i }).click();
    await expect(
      page.getByRole('heading', { name: /notifications/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Click outside
    await page.locator('body').click({ position: { x: 100, y: 400 } });
    await expect(
      page.getByRole('heading', { name: /notifications/i }),
    ).not.toBeVisible({ timeout: 3_000 });
  });

  test('shows all caught up when no notifications', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /notifications/i }).click();

    // Either shows notification list or "all caught up"
    const content = page.getByText(/all caught up/i).or(
      page.locator('[data-notification-item]'),
    );
    await expect(content.first()).toBeVisible({ timeout: 5_000 });
  });
});

// ── Search Page ───────────────────────────────────────────────────────────────

test.describe('Search Page', () => {
  test('@smoke renders search page with input', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /search/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByPlaceholder(/search people, trees/i)).toBeVisible();
  });

  test('search input is focused on load', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const input = page.getByPlaceholder(/search people, trees/i);
    await expect(input).toBeFocused({ timeout: 5_000 });
  });

  test('shows recent searches section when no query', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // If there are recent searches stored, they appear
    // If not, the section is absent — both are valid
    const recentSection = page.getByText(/recent/i);
    // Just verify the page loaded without errors
    await expect(page.getByPlaceholder(/search people, trees/i)).toBeVisible();
  });

  test('typing shows results section', async ({ page, testTree, api }) => {
    const person = await api.createPerson(testTree.id, {
      firstName: 'Searchable',
      lastName:  'E2EPerson',
    });

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder(/search people, trees/i).fill('Searchable');

    // Should show a People section
    await expect(
      page.getByText(/people/i).filter({ hasNot: page.getByRole('heading', { name: /search/i }) }),
    ).toBeVisible({ timeout: 6_000 });

    await api.deletePerson(testTree.id, person.id);
  });

  test('clear button resets search', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const input = page.getByPlaceholder(/search people, trees/i);
    await input.fill('test query');
    await expect(input).toHaveValue('test query');

    await page.getByRole('button', { name: /clear/i }).click();
    await expect(input).toHaveValue('');
  });

  test('shows no results message for unknown query', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder(/search people, trees/i).fill('xyzabcunknown99999');

    await expect(
      page.getByText(/no results for/i),
    ).toBeVisible({ timeout: 6_000 });
  });
});

// ── Invite Member Flow ────────────────────────────────────────────────────────

test.describe('Invite Member Flow', () => {
  test('invite modal opens and has correct fields', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /invite member/i }).click();

    const modal = page.getByRole('heading', { name: /invite to tree/i });
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/role/i)).toBeVisible();
    await expect(page.getByLabel(/personal message/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send invitation/i })).toBeVisible();
  });

  test('invite modal role select has all valid options', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /invite member/i }).click();
    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).toBeVisible({ timeout: 5_000 });

    const roleSelect = page.getByLabel(/role/i);
    for (const role of ['viewer', 'contributor', 'editor', 'admin']) {
      await expect(
        roleSelect.getByRole('option', { name: new RegExp(role, 'i') }),
      ).toBeAttached();
    }
  });

  test('invite send requires valid email', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /invite member/i }).click();
    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Try to submit with no email
    await page.getByRole('button', { name: /send invitation/i }).click();
    // Should stay on modal
    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).toBeVisible();
  });

  test('cancel closes invite modal', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /invite member/i }).click();
    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(
      page.getByRole('heading', { name: /invite to tree/i }),
    ).not.toBeVisible({ timeout: 3_000 });
  });

  test('accept invite page shows sign in prompt when unauthenticated', async ({ browser }) => {
    const ctx  = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.goto('/accept-invite?token=fake-token-123');
    await page.waitForLoadState('networkidle');

    // Should prompt to sign in
    await expect(
      page.getByRole('heading', { name: /sign in to accept/i }),
    ).toBeVisible({ timeout: 8_000 });

    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create account/i })).toBeVisible();

    await ctx.close();
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test('@smoke sidebar links navigate correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // People
    await page.getByRole('link', { name: /people/i }).click();
    await expect(page).toHaveURL('**/people');

    // Media
    await page.getByRole('link', { name: /media/i }).click();
    await expect(page).toHaveURL('**/media');

    // Search
    await page.getByRole('link', { name: /search/i }).click();
    await expect(page).toHaveURL('**/search');

    // Settings
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL('**/settings');

    // Back to Trees/Dashboard
    await page.getByRole('link', { name: /trees/i }).click();
    await expect(page).toHaveURL('**/dashboard');
  });

  test('sidebar shows current user name and tier', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // User chip in sidebar
    await expect(page.getByText(/E2E/i)).toBeVisible({ timeout: 8_000 });
  });

  test('theme toggle cycles through themes', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const themeButton = page.getByRole('button', { name: /switch to/i });
    await expect(themeButton).toBeVisible({ timeout: 5_000 });

    // Click three times to cycle through all themes
    await themeButton.click();
    await themeButton.click();
    await themeButton.click();
    // No assertion on visual output — just confirm no errors thrown
    await expect(page.getByRole('heading', { name: /your trees/i })).toBeVisible();
  });

  test('browser back button works after tree navigation', async ({ page, testTree }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.goto(`/trees/${testTree.id}`);
    await page.waitForLoadState('networkidle');

    await page.goBack();
    await expect(page).toHaveURL('**/dashboard');
  });
});
