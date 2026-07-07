import { test, expect } from '../../helpers/fixtures.ts';
import { DashboardPage } from '../../page-objects/DashboardPage.ts';
import { TreePage } from '../../page-objects/TreePage.ts';

// ── Dashboard ─────────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test('@smoke loads dashboard with trees heading', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectLoaded();
  });

  test('shows empty state when no trees exist', async ({ page, api }) => {
    // This test is only meaningful on a fresh account — skip if trees already exist
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await page.waitForLoadState('networkidle');

    const treeCount = await page.locator('article').count();
    if (treeCount === 0) {
      await expect(
        page.getByText(/your story starts here|create your first tree/i),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: /create your first tree/i })).toBeVisible();
    }
  });

  test('new tree button navigates to creation form', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.clickNewTree();
    await expect(page).toHaveURL('**/trees/new');
    await expect(page.getByRole('heading', { name: /create a new tree/i })).toBeVisible();
  });

  test('tree card shows person count and privacy badge', async ({ page, testTree }) => {
    // testTree is created fresh for this test
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await page.waitForLoadState('networkidle');

    const card = page.locator('article').filter({ hasText: testTree.name });
    await expect(card).toBeVisible({ timeout: 8_000 });
    await expect(card.getByText(/0 people/)).toBeVisible();
    await expect(card.getByText(/family/i)).toBeVisible(); // privacy badge
  });
});

// ── Tree Creation ─────────────────────────────────────────────────────────────

test.describe('Tree Creation', () => {
  test('@smoke creates a new tree and redirects to tree view', async ({ page, api }) => {
    const treeName = `E2E Tree ${Date.now()}`;

    await page.goto('/trees/new');
    await page.waitForLoadState('networkidle');

    await page.getByLabel(/tree name/i).fill(treeName);
    await page.getByRole('button', { name: /create tree/i }).click();

    // Should redirect to the tree view
    await page.waitForURL('**/trees/**', { timeout: 15_000 });
    await page.waitForURL((url) => !url.pathname.includes('/new'), { timeout: 10_000 });

    // Tree name appears in header
    await expect(page.getByText(treeName)).toBeVisible({ timeout: 8_000 });

    // Cleanup
    const treeId = page.url().split('/trees/')[1]?.split('/')[0];
    if (treeId) await api.deleteTree(treeId).catch(() => undefined);
  });

  test('shows validation error when name is empty', async ({ page }) => {
    await page.goto('/trees/new');
    await page.getByRole('button', { name: /create tree/i }).click();
    // Should not navigate away — name is required
    await expect(page).toHaveURL('**/trees/new');
  });

  test('cancel button navigates back', async ({ page }) => {
    await page.goto('/dashboard');
    await page.goto('/trees/new');
    await page.getByRole('button', { name: /cancel/i }).click();
    // Should go back
    await page.waitForURL((url) => !url.pathname.includes('/trees/new'), { timeout: 5_000 });
  });

  test('privacy selector has correct options', async ({ page }) => {
    await page.goto('/trees/new');
    const privacySelect = page.getByLabel(/privacy/i);
    await expect(privacySelect).toBeVisible();

    await expect(privacySelect.getByRole('option', { name: /family only/i })).toBeAttached();
    await expect(privacySelect.getByRole('option', { name: /private/i })).toBeAttached();
    await expect(privacySelect.getByRole('option', { name: /public/i })).toBeAttached();
  });
});

// ── Tree View ─────────────────────────────────────────────────────────────────

test.describe('Tree View', () => {
  test('@smoke loads tree page with toolbar', async ({ page, testTree }) => {
    const treePage = new TreePage(page);
    await treePage.goto(testTree.id);
    await treePage.expectLoaded();

    await expect(treePage.addPersonButton).toBeVisible();
    await expect(treePage.shareButton).toBeVisible();
    await expect(treePage.zoomInButton).toBeVisible();
    await expect(treePage.zoomOutButton).toBeVisible();
    await expect(treePage.fitViewButton).toBeVisible();
  });

  test('shows empty canvas state when no persons exist', async ({ page, testTree }) => {
    const treePage = new TreePage(page);
    await treePage.goto(testTree.id);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/add your first person/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /add first person/i })).toBeVisible();
  });

  test('add person button navigates to person form', async ({ page, testTree }) => {
    const treePage = new TreePage(page);
    await treePage.goto(testTree.id);
    await treePage.clickAddPerson();
    await expect(page).toHaveURL(`**/trees/${testTree.id}/persons/new`);
  });

  test('view mode switcher renders all three modes', async ({ page, testTree }) => {
    const treePage = new TreePage(page);
    await treePage.goto(testTree.id);
    await treePage.expectLoaded();

    await expect(page.getByRole('button', { name: 'pedigree', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'fan',      exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'descendants', exact: true })).toBeVisible();
  });

  test('switching view mode changes the rendered SVG, not just the label', async ({
    page,
    testTree,
    api,
  }) => {
    // Build a small 2-generation tree so the fan/descendants layouts have
    // something to render (an isolated root produces an empty SVG in every
    // mode, which would make this assertion meaningless).
    const root  = await api.createPerson(testTree.id, { firstName: 'Root', lastName: 'Person' });
    const child = await api.createPerson(testTree.id, { firstName: 'Child', lastName: 'Person' });
    await api.createRelationship(testTree.id, root.id, child.id, 'biological_parent');

    const treePage = new TreePage(page);
    await treePage.goto(testTree.id);
    await page.waitForLoadState('networkidle');

    // d3.tree() (pedigree) produces <rect>/<path> nodes; the fan chart
    // produces <path class="fan-arc"> wedges — fundamentally different DOM,
    // so comparing element counts/selectors is a reliable cross-layout check.
    const pedigreeNodeCount = await page.locator('svg .node').count();
    expect(pedigreeNodeCount).toBeGreaterThan(0);
    await expect(page.locator('svg .fan-arc')).toHaveCount(0);

    await treePage.switchViewMode('fan');
    await page.waitForTimeout(300); // d3 render tick

    await expect(page.locator('svg .fan-arc')).toHaveCount(pedigreeNodeCount);
    await expect(page.locator('svg .node')).toHaveCount(0);

    await treePage.switchViewMode('descendants');
    await page.waitForTimeout(300);

    // Card-based nodes again, but now walking children instead of parents.
    // We don't assert an exact count here since it depends on which person
    // the tree page resolves as rootPerson (persons[0] from the API) — only
    // that the layout actually re-rendered as cards (not an empty canvas,
    // not fan arcs left over from the previous mode).
    const descendantsNodeCount = await page.locator('svg .node').count();
    expect(descendantsNodeCount).toBeGreaterThan(0);
    await expect(page.locator('svg .fan-arc')).toHaveCount(0);

    await api.deletePerson(testTree.id, child.id);
    await api.deletePerson(testTree.id, root.id);
  });

  test('zoom controls are clickable', async ({ page, testTree }) => {
    const treePage = new TreePage(page);
    await treePage.goto(testTree.id);
    await treePage.expectLoaded();

    // Buttons must be enabled and clickable — no assertion on visual output
    await expect(treePage.zoomInButton).toBeEnabled();
    await expect(treePage.zoomOutButton).toBeEnabled();
    await treePage.zoomInButton.click();
    await treePage.zoomOutButton.click();
    await treePage.fitViewButton.click();
  });
});

// ── Tree Settings ─────────────────────────────────────────────────────────────

test.describe('Tree Settings', () => {
  test('settings page renders all sections', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /tree settings/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /general/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /import & export/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /danger zone/i })).toBeVisible();
  });

  test('can update tree name', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByLabel(/tree name/i);
    await nameInput.clear();
    await nameInput.fill('Renamed Tree');
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.locator('[data-sonner-toast]')).toContainText(/updated/i, { timeout: 8_000 });
  });

  test('danger zone delete is gated by confirmation text', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    const deleteButton = page.getByRole('button', { name: /delete tree/i });

    // Should be disabled without confirmation text
    await expect(deleteButton).toBeDisabled();

    // Type partial confirmation — still disabled
    await page.getByPlaceholder(/delete this tree/i).fill('delete');
    await expect(deleteButton).toBeDisabled();

    // Type full confirmation — now enabled
    await page.getByPlaceholder(/delete this tree/i).fill('delete this tree');
    await expect(deleteButton).toBeEnabled();
  });

  test('invite member button opens invite modal', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /invite member/i }).click();

    await expect(page.getByRole('heading', { name: /invite to tree/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/role/i)).toBeVisible();
  });

  test('back button navigates to tree view', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.getByRole('button', { name: /back to tree/i }).click();
    await expect(page).toHaveURL(`**/trees/${testTree.id}`);
  });
});

// ── Share Modal ───────────────────────────────────────────────────────────────

test.describe('Share Tree', () => {
  test('share modal can generate and copy a link', async ({ page, testTree }) => {
    const treePage = new TreePage(page);
    await treePage.goto(testTree.id);
    await treePage.expectLoaded();

    await treePage.clickShare();

    const modal = page.getByRole('heading', { name: /share tree/i }).locator('..').locator('..');
    await expect(page.getByRole('heading', { name: /share tree/i })).toBeVisible({ timeout: 5_000 });

    // If no token yet, generate button should be visible
    const generateButton = page.getByRole('button', { name: /generate share link/i });
    if (await generateButton.isVisible()) {
      await generateButton.click();
      // Copy button should appear
      await expect(page.getByRole('button', { name: /copy/i })).toBeVisible({ timeout: 8_000 });
    }
  });

  test('shared tree page requires token', async ({ browser }) => {
    const ctx  = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.goto('/shared');
    // No token — should show invalid link state
    await expect(page.getByRole('heading', { name: /invalid or expired link/i })).toBeVisible({ timeout: 8_000 });

    await ctx.close();
  });
});
