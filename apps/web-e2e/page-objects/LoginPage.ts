import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class LoginPage {
  readonly page:          Page;
  readonly emailInput:    Locator;
  readonly passwordInput: Locator;
  readonly submitButton:  Locator;
  readonly errorMessage:  Locator;
  readonly totpInput:     Locator;
  readonly forgotLink:    Locator;
  readonly registerLink:  Locator;

  constructor(page: Page) {
    this.page          = page;
    this.emailInput    = page.getByRole('textbox', { name: /email/i });
    this.passwordInput = page.getByRole('textbox', { name: /password/i });
    this.submitButton  = page.getByRole('button',  { name: /sign in/i });
    this.errorMessage  = page.getByRole('status').or(page.locator('[data-sonner-toast]'));
    this.totpInput     = page.getByRole('textbox', { name: /authenticator code/i });
    this.forgotLink    = page.getByRole('link',   { name: /forgot password/i });
    this.registerLink  = page.getByRole('link',   { name: /create one free/i });
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.submit();
    // Wait for redirect away from login page
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 15_000,
    });
  }

  async expectError(messageSubstring: string) {
    await expect(this.page.locator('[data-sonner-toast]')).toContainText(
      messageSubstring,
      { timeout: 5_000 },
    );
  }

  async expectTotpField() {
    await expect(this.totpInput).toBeVisible({ timeout: 5_000 });
  }
}
