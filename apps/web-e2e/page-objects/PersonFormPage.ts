import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class PersonFormPage {
  readonly page:           Page;
  readonly heading:        Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput:  Locator;
  readonly sexSelect:      Locator;
  readonly isLivingToggle: Locator;
  readonly biographyField: Locator;
  readonly addEventButton: Locator;
  readonly submitButton:   Locator;
  readonly cancelButton:   Locator;

  constructor(page: Page) {
    this.page            = page;
    this.heading         = page.getByRole('heading', { name: /add person|edit person/i });
    this.firstNameInput  = page.getByLabel(/first name/i);
    this.lastNameInput   = page.getByLabel(/last name/i);
    this.sexSelect       = page.getByLabel(/sex/i);
    this.isLivingToggle  = page.getByRole('switch', { name: /living/i });
    this.biographyField  = page.getByLabel(/biography/i);
    this.addEventButton  = page.getByRole('button', { name: /add life event/i });
    this.submitButton    = page.getByRole('button', { name: /add to tree|save changes/i });
    this.cancelButton    = page.getByRole('button', { name: /cancel/i });
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10_000 });
    await expect(this.firstNameInput).toBeVisible();
  }

  async fillBasicInfo(data: {
    firstName:  string;
    lastName:   string;
    sex?:       string;
    isLiving?:  boolean;
    biography?: string;
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);

    if (data.sex) {
      await this.sexSelect.selectOption(data.sex);
    }

    if (data.isLiving === false) {
      const checked = await this.isLivingToggle.getAttribute('aria-checked');
      if (checked === 'true') {
        await this.isLivingToggle.click();
      }
    }

    if (data.biography) {
      await this.biographyField.fill(data.biography);
    }
  }

  async addBirthEvent(year: number, place?: string) {
    await this.addEventButton.click();

    // The last event row added
    const lastEventRow = this.page.locator('[data-event-row]').last()
      .or(this.page.locator('.space-y-4 > div').last());

    // Type select — should default to 'birth'
    const typeSelect = lastEventRow.getByLabel(/event type/i).or(
      this.page.locator('select').filter({ hasText: /birth/i }).last(),
    );
    await typeSelect.selectOption('birth');

    const yearInput = this.page.getByLabel(/year/i).last();
    await yearInput.fill(String(year));

    if (place) {
      const placeInput = this.page.getByLabel(/place/i).last();
      await placeInput.fill(place);
    }
  }

  async submit() {
    await this.submitButton.click();
  }

  async submitAndWaitForTree() {
    await this.submit();
    // After successful submit, should redirect back to tree page
    await this.page.waitForURL('**/trees/**', { timeout: 15_000 });
    await this.page.waitForURL((url) => !url.pathname.includes('/persons'), { timeout: 10_000 });
  }

  async expectFieldError(fieldName: string, errorMessage: string) {
    await expect(
      this.page.locator(`text=${errorMessage}`).first(),
    ).toBeVisible({ timeout: 3_000 });
  }
}
