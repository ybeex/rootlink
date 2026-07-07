import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class DashboardPage {
  readonly page:          Page;
  readonly heading:       Locator;
  readonly newTreeButton: Locator;
  readonly treeCards:     Locator;

  constructor(page: Page) {
    this.page          = page;
    this.heading       = page.getByRole('heading', { name: /your trees/i });
    this.newTreeButton = page.getByRole('link', { name: /new tree/i });
    this.treeCards     = page.locator('article');
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10_000 });
  }

  async clickNewTree() {
    await this.newTreeButton.click();
    await this.page.waitForURL('**/trees/new');
  }

  async getTreeCard(name: string) {
    return this.page.locator('article').filter({ hasText: name });
  }

  async openTree(name: string) {
    const card = await this.getTreeCard(name);
    await card.click();
    await this.page.waitForURL('**/trees/**');
  }

  async expectTreeVisible(name: string) {
    const card = await this.getTreeCard(name);
    await expect(card).toBeVisible({ timeout: 8_000 });
  }

  async expectTreeCount(count: number) {
    await expect(this.treeCards).toHaveCount(count, { timeout: 8_000 });
  }
}
