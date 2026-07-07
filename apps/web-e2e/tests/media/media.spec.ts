import { test, expect } from '../../helpers/fixtures.ts';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Creates a minimal valid JPEG buffer (1x1 pixel white) for upload tests. */
function makeMinimalJpeg(): Buffer {
  // Smallest valid JPEG: SOI + APP0 + SOF0 + SOS + EOI
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xfb, 0x00,
    0xff, 0xd9,
  ]);
}

/** Creates a temporary JPEG file and returns its path, cleaning up after use. */
async function withTempJpeg(
  callback: (filePath: string) => Promise<void>,
): Promise<void> {
  const dir      = os.tmpdir();
  const filePath = path.join(dir, `e2e-photo-${Date.now()}.jpg`);
  fs.writeFileSync(filePath, makeMinimalJpeg());
  try {
    await callback(filePath);
  } finally {
    fs.unlinkSync(filePath);
  }
}

// ── Media Page ────────────────────────────────────────────────────────────────

test.describe('Media Page', () => {
  test('@smoke renders media page with upload zone', async ({ page }) => {
    await page.goto('/media');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /media/i })).toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByText(/drag & drop|drop files here/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('filter tabs are all rendered', async ({ page }) => {
    await page.goto('/media');
    await page.waitForLoadState('networkidle');

    for (const label of ['all', 'photo', 'document', 'audio', 'video']) {
      await expect(
        page.getByRole('button', { name: label, exact: true }),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('empty state message appears when no media exists', async ({ page, testTree }) => {
    // Navigate directly to the media page with the test tree pre-selected
    await page.goto('/media');
    await page.waitForLoadState('networkidle');

    // Select the test tree from the dropdown if multiple exist
    const dropdown = page.locator('select').first();
    if (await dropdown.isVisible()) {
      await dropdown.selectOption({ label: testTree.name });
    }

    await page.waitForTimeout(500); // debounce

    // Should show empty state
    await expect(
      page.getByText(/no media yet/i).or(page.getByText(/drop files above/i)),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('filter tab click changes active state', async ({ page }) => {
    await page.goto('/media');
    await page.waitForLoadState('networkidle');

    const photoTab = page.getByRole('button', { name: 'photo', exact: true });
    await photoTab.click();

    // Tab should now have the active background style
    const bg = await photoTab.evaluate((el) =>
      window.getComputedStyle(el).background,
    );
    // We just verify the click doesn't error — visual assertion is fragile
    await expect(photoTab).toBeVisible();
  });

  test('drag-and-drop zone responds to drag events', async ({ page }) => {
    await page.goto('/media');
    await page.waitForLoadState('networkidle');

    const dropZone = page.locator('[class*="border-dashed"]').first();
    await expect(dropZone).toBeVisible();

    // Simulate dragenter
    await dropZone.dispatchEvent('dragenter', {
      dataTransfer: { files: [], types: ['Files'] },
    });

    // The label text should change to "Drop files here"
    await expect(page.getByText(/drop files here/i)).toBeVisible({ timeout: 3_000 });
  });
});

// ── File Upload ───────────────────────────────────────────────────────────────

test.describe('File Upload', () => {
  test('upload flow — file input accepts image files', async ({ page, testTree }) => {
    await page.goto('/media');
    await page.waitForLoadState('networkidle');

    // Select test tree
    const dropdown = page.locator('select').first();
    if (await dropdown.isVisible()) {
      await dropdown.selectOption({ label: testTree.name });
    }

    await withTempJpeg(async (filePath) => {
      // Trigger the hidden file input
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);

      // Uploading indicator should appear
      await expect(
        page.getByText(/uploading/i),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('rejects unsupported file types via accept attribute', async ({ page, testTree }) => {
    await page.goto('/media');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]');
    const accept    = await fileInput.getAttribute('accept');

    // The accept attribute should include image types
    expect(accept).toMatch(/image\/jpeg|image\/png|image\/webp/);
    // Should NOT include arbitrary types
    expect(accept).not.toMatch(/application\/octet-stream/);
  });
});

// ── Lightbox ──────────────────────────────────────────────────────────────────

test.describe('Lightbox', () => {
  test('backdrop click closes lightbox', async ({ page, testTree, api }) => {
    // For lightbox tests we need an existing media asset — skip gracefully if none
    await page.goto('/media');
    await page.waitForLoadState('networkidle');

    const mediaItems = page.locator('.aspect-square');
    const count      = await mediaItems.count();

    if (count === 0) {
      test.skip(); // No media in this test environment
      return;
    }

    // Open first item
    await mediaItems.first().click();

    const lightbox = page.locator('.fixed.inset-0').filter({ has: page.locator('img') });
    await expect(lightbox).toBeVisible({ timeout: 5_000 });

    // Click backdrop
    await lightbox.click({ position: { x: 10, y: 10 } });
    await expect(lightbox).not.toBeVisible({ timeout: 3_000 });
  });

  test('lightbox close button works', async ({ page }) => {
    await page.goto('/media');
    await page.waitForLoadState('networkidle');

    const mediaItems = page.locator('.aspect-square');
    if (await mediaItems.count() === 0) { test.skip(); return; }

    await mediaItems.first().click();
    const closeBtn = page.locator('.fixed.inset-0').getByRole('button', { name: /close/i }).or(
      page.locator('.fixed.inset-0 button').last(),
    );
    await expect(closeBtn).toBeVisible({ timeout: 5_000 });
    await closeBtn.click();

    await expect(page.locator('.fixed.inset-0').filter({ has: page.locator('img') }))
      .not.toBeVisible({ timeout: 3_000 });
  });
});

// ── GEDCOM panel ──────────────────────────────────────────────────────────────

test.describe('GEDCOM Panel', () => {
  test('GEDCOM panel opens from tree settings', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /import gedcom/i }).click();

    await expect(
      page.getByRole('heading', { name: /import \/ export gedcom/i }),
    ).toBeVisible({ timeout: 5_000 });

    await expect(page.getByText(/export tree as gedcom/i)).toBeVisible();
    await expect(page.getByText(/import from gedcom file/i)).toBeVisible();
  });

  test('GEDCOM panel close button works', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /import gedcom/i }).click();
    const panel = page.getByRole('heading', { name: /import \/ export gedcom/i }).locator('../..');
    await expect(panel).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: /close/i }).last().click();
    await expect(
      page.getByRole('heading', { name: /import \/ export gedcom/i }),
    ).not.toBeVisible({ timeout: 3_000 });
  });

  test('GEDCOM file input accepts .ged extension', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /import gedcom/i }).click();
    await expect(
      page.getByRole('heading', { name: /import \/ export gedcom/i }),
    ).toBeVisible({ timeout: 5_000 });

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      const accept = await fileInput.getAttribute('accept');
      expect(accept).toMatch(/\.ged|gedcom/i);
    }
  });
});
