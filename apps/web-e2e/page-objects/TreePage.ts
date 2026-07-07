import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class TreePage {
  readonly page:           Page;
  readonly treeTitle:      Locator;
  readonly addPersonButton: Locator;
  readonly shareButton:    Locator;
  readonly personPanel:    Locator;
  readonly zoomInButton:   Locator;
  readonly zoomOutButton:  Locator;
  readonly fitViewButton:  Locator;
  readonly liveIndicator:  Locator;

  constructor(page: Page) {
    this.page            = page;
    this.treeTitle       = page.locator('h1').first();
    this.addPersonButton = page.getByRole('button', { name: /add person/i });
    this.shareButton     = page.getByRole('button', { name: /share/i });
    this.personPanel     = page.getByRole('complementary', { name: /person details/i });
    this.zoomInButton    = page.getByRole('button', { name: /zoom in/i });
    this.zoomOutButton   = page.getByRole('button', { name: /zoom out/i });
    this.fitViewButton   = page.getByRole('button', { name: /fit to view/i });
    this.liveIndicator   = page.getByText('Live');
  }

  async goto(treeId: string) {
    await this.page.goto(`/trees/${treeId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.treeTitle).toBeVisible({ timeout: 10_000 });
  }

  async clickAddPerson() {
    await this.addPersonButton.click();
    await this.page.waitForURL('**/persons/new');
  }

  async openPersonPanel(personName: string) {
    // Click SVG node by finding the text label
    await this.page.locator('text=' + personName).first().click();
    await expect(this.personPanel).toBeVisible({ timeout: 5_000 });
  }

  async closePersonPanel() {
    await this.personPanel.getByRole('button', { name: /close panel/i }).click();
    await expect(this.personPanel).not.toBeVisible({ timeout: 3_000 });
  }

  async clickShare() {
    await this.shareButton.click();
  }

  async getPersonCount(): Promise<number> {
    const text = await this.page.locator('text=/\\d+ people/').first().textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1] ?? '0', 10) : 0;
  }

  async switchViewMode(mode: 'pedigree' | 'fan' | 'descendants') {
    await this.page.getByRole('button', { name: mode, exact: true }).click();
  }

  async expectViewMode(mode: string) {
    const statsOverlay = this.page.locator(`text=${mode}`).last();
    await expect(statsOverlay).toBeVisible({ timeout: 3_000 });
  }
}
