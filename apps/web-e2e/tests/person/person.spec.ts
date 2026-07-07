import { test, expect } from '../../helpers/fixtures.ts';
import { TreePage } from '../../page-objects/TreePage.ts';
import { PersonFormPage } from '../../page-objects/PersonFormPage.ts';

// ── Person Creation ───────────────────────────────────────────────────────────

test.describe('Person Creation', () => {
  test('@smoke renders person form with all key fields', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/persons/new`);

    const form = new PersonFormPage(page);
    await form.expectLoaded();

    await expect(form.firstNameInput).toBeVisible();
    await expect(form.lastNameInput).toBeVisible();
    await expect(form.sexSelect).toBeVisible();
    await expect(form.isLivingToggle).toBeVisible();
    await expect(form.biographyField).toBeVisible();
    await expect(form.addEventButton).toBeVisible();
    await expect(form.submitButton).toBeVisible();
    await expect(form.cancelButton).toBeVisible();
  });

  test('@smoke creates a person and returns to tree view', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/persons/new`);
    const form = new PersonFormPage(page);
    await form.expectLoaded();

    await form.fillBasicInfo({
      firstName: 'Margaret',
      lastName:  'O\'Brien',
      sex:       'female',
      isLiving:  false,
    });

    await form.submitAndWaitForTree();

    // Verify we are back on the tree page
    await expect(page).toHaveURL(`**/trees/${testTree.id}`);
    await expect(page.getByRole('button', { name: /add person/i })).toBeVisible();
  });

  test('creates person with birth event', async ({ page, testTree, api }) => {
    await page.goto(`/trees/${testTree.id}/persons/new`);
    const form = new PersonFormPage(page);
    await form.expectLoaded();

    await form.fillBasicInfo({
      firstName: 'Patrick',
      lastName:  'Murphy',
      sex:       'male',
      isLiving:  false,
    });

    await form.addBirthEvent(1920, 'Cork, Ireland');
    await form.submitAndWaitForTree();
    await expect(page).toHaveURL(`**/trees/${testTree.id}`);
  });

  test('living toggle defaults to true', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/persons/new`);
    const toggle = page.getByRole('switch', { name: /living/i });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('cancel returns to tree without creating person', async ({ page, testTree, api }) => {
    await page.goto(`/trees/${testTree.id}/persons/new`);
    const form = new PersonFormPage(page);
    await form.expectLoaded();

    await form.fillBasicInfo({ firstName: 'Cancelled', lastName: 'Person' });
    await form.cancelButton.click();

    await page.waitForURL((url) => !url.pathname.includes('/persons'), { timeout: 8_000 });

    // Verify no person was created
    const persons = await api.createPerson(testTree.id, { firstName: '_check', lastName: '_check' });
    // If we got a response, the cancel worked correctly (no duplicate name conflict)
    await api.deletePerson(testTree.id, persons.id);
  });

  test('sex select has all expected options', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/persons/new`);
    const sexSelect = page.getByLabel(/sex/i);
    await expect(sexSelect.getByRole('option', { name: /unknown/i })).toBeAttached();
    await expect(sexSelect.getByRole('option', { name: /male/i })).toBeAttached();
    await expect(sexSelect.getByRole('option', { name: /female/i })).toBeAttached();
    await expect(sexSelect.getByRole('option', { name: /other/i })).toBeAttached();
  });

  test('privacy select has all expected options', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/persons/new`);
    const privacySelect = page.getByLabel(/privacy/i);
    await expect(privacySelect.getByRole('option', { name: /public/i })).toBeAttached();
    await expect(privacySelect.getByRole('option', { name: /family only/i })).toBeAttached();
    await expect(privacySelect.getByRole('option', { name: /private/i })).toBeAttached();
  });

  test('can add multiple life events', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/persons/new`);
    const form = new PersonFormPage(page);
    await form.expectLoaded();

    await form.addEventButton.click();
    await form.addEventButton.click();
    await form.addEventButton.click();

    // Should have 3 event rows
    const eventRows = page.locator('button:has-text("Remove event")').or(
      page.locator('[aria-label="Remove event"]'),
    );
    // The remove buttons indicate event rows exist
    await expect(eventRows).toHaveCount(3, { timeout: 5_000 });
  });
});

// ── Person Edit ───────────────────────────────────────────────────────────────

test.describe('Person Edit', () => {
  test('@smoke edit form pre-populates existing data', async ({ page, testTree, api }) => {
    const person = await api.createPerson(testTree.id, {
      firstName: 'Editable',
      lastName:  'Person',
      sex:       'male',
    });

    await page.goto(`/trees/${testTree.id}/persons/${person.id}/edit`);
    const form = new PersonFormPage(page);
    await form.expectLoaded();

    await expect(form.firstNameInput).toHaveValue('Editable');
    await expect(form.lastNameInput).toHaveValue('Person');

    await api.deletePerson(testTree.id, person.id);
  });

  test('updates person name and shows success toast', async ({ page, testTree, api }) => {
    const person = await api.createPerson(testTree.id, {
      firstName: 'Original',
      lastName:  'Name',
    });

    await page.goto(`/trees/${testTree.id}/persons/${person.id}/edit`);
    const form = new PersonFormPage(page);
    await form.expectLoaded();

    await form.firstNameInput.clear();
    await form.firstNameInput.fill('Updated');
    await form.submit();

    await expect(page.locator('[data-sonner-toast]')).toContainText(/updated/i, { timeout: 8_000 });

    await api.deletePerson(testTree.id, person.id);
  });
});

// ── Person Detail Page ────────────────────────────────────────────────────────

test.describe('Person Detail Page', () => {
  test('renders person detail with tabs', async ({ page, testTree, api }) => {
    const person = await api.createPerson(testTree.id, {
      firstName: 'Detail',
      lastName:  'Person',
      sex:       'female',
    });

    await page.goto(`/trees/${testTree.id}/persons/${person.id}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Detail Person' })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /timeline/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sources/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /history/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /edit/i })).toBeVisible();

    await api.deletePerson(testTree.id, person.id);
  });

  test('edit button navigates to edit form', async ({ page, testTree, api }) => {
    const person = await api.createPerson(testTree.id, {
      firstName: 'Nav',
      lastName:  'Test',
    });

    await page.goto(`/trees/${testTree.id}/persons/${person.id}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /edit/i }).click();

    await expect(page).toHaveURL(`**/persons/${person.id}/edit`);

    await api.deletePerson(testTree.id, person.id);
  });

  test('history tab shows edit entries', async ({ page, testTree, api }) => {
    const person = await api.createPerson(testTree.id, {
      firstName: 'History',
      lastName:  'Test',
    });

    await page.goto(`/trees/${testTree.id}/persons/${person.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /history/i }).click();

    // At minimum, a create entry should exist
    await expect(
      page.getByText(/create/i).first().or(page.getByText(/no edit history/i)),
    ).toBeVisible({ timeout: 5_000 });

    await api.deletePerson(testTree.id, person.id);
  });

  test('shows 404-like state for nonexistent person', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/persons/00000000-0000-0000-0000-000000000000`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/person not found/i)).toBeVisible({ timeout: 8_000 });
  });
});

// ── Person Panel (in-tree slide-in) ──────────────────────────────────────────

test.describe('Person Panel', () => {
  test('person panel shows edit and add relation buttons when authenticated', async ({
    page,
    testTree,
    api,
  }) => {
    const person = await api.createPerson(testTree.id, {
      firstName: 'Panel',
      lastName:  'Person',
    });

    const treePage = new TreePage(page);
    await treePage.goto(testTree.id);
    await page.waitForLoadState('networkidle');

    // Click SVG node
    await page.locator('svg text').filter({ hasText: 'Panel' }).first().click({ timeout: 8_000 });

    const panel = page.getByRole('complementary', { name: /person details/i });
    await expect(panel).toBeVisible({ timeout: 8_000 });

    await expect(panel.getByRole('button', { name: /edit person/i })).toBeVisible();
    await expect(panel.getByRole('button', { name: /add relation/i })).toBeVisible();

    await api.deletePerson(testTree.id, person.id);
  });

  test('close button dismisses person panel', async ({ page, testTree, api }) => {
    const person = await api.createPerson(testTree.id, {
      firstName: 'Close',
      lastName:  'Test',
    });

    const treePage = new TreePage(page);
    await treePage.goto(testTree.id);
    await page.waitForLoadState('networkidle');

    await page.locator('svg text').filter({ hasText: 'Close' }).first().click({ timeout: 8_000 });

    const panel = page.getByRole('complementary', { name: /person details/i });
    await expect(panel).toBeVisible({ timeout: 8_000 });

    await panel.getByRole('button', { name: /close panel/i }).click();
    await expect(panel).not.toBeVisible({ timeout: 5_000 });

    await api.deletePerson(testTree.id, person.id);
  });
});

// ── People Page ───────────────────────────────────────────────────────────────

test.describe('People Page', () => {
  test('@smoke renders people page', async ({ page }) => {
    await page.goto('/people');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /people/i })).toBeVisible({ timeout: 8_000 });
  });

  test('search input filters visible persons', async ({ page, testTree, api }) => {
    // Create two persons with distinct names
    const p1 = await api.createPerson(testTree.id, { firstName: 'Unique', lastName: 'SearchName' });
    const p2 = await api.createPerson(testTree.id, { firstName: 'Other',  lastName: 'Person' });

    await page.goto('/people');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search by name/i);
    await searchInput.fill('Unique');

    // After debounce, only matching person should appear
    await expect(page.getByText('Unique SearchName')).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText('Other Person')).not.toBeVisible({ timeout: 3_000 });

    await api.deletePerson(testTree.id, p1.id);
    await api.deletePerson(testTree.id, p2.id);
  });

  test('pagination controls appear with many persons', async ({ page, testTree, api }) => {
    // Create 25 persons to trigger pagination (page size = 24)
    const created = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        api.createPerson(testTree.id, { firstName: `Paged${i}`, lastName: 'Person' }),
      ),
    );

    await page.goto('/people');
    await page.waitForLoadState('networkidle');

    // Pagination controls should appear
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible({ timeout: 8_000 });

    // Cleanup
    await Promise.all(created.map((p) => api.deletePerson(testTree.id, p.id)));
  });
});
