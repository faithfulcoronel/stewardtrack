import { Page, expect } from '@playwright/test';

/**
 * Custom Assertions Helper
 *
 * Provides reusable assertions for E2E tests
 */

/**
 * Assert user is authenticated
 */
export async function assertUserIsAuthenticated(page: Page, userIdentifier?: string) {
  const pattern = userIdentifier ? new RegExp(userIdentifier, 'i') : /.+/;

  const userMenu = page.getByRole('button', { name: pattern })
    .or(page.getByText(/logout|sign out/i));

  await expect(userMenu).toBeVisible({ timeout: 10000 });
}

/**
 * Assert user is on onboarding page
 */
export async function assertOnOnboardingPage(page: Page) {
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 30000 });
  await expect(
    page.getByRole('heading', { name: /welcome|onboarding/i }).first()
  ).toBeVisible({ timeout: 10000 });
}

/**
 * Assert user is on dashboard/admin page
 */
export async function assertOnDashboard(page: Page) {
  await expect(page).toHaveURL(/\/(admin|dashboard)/, { timeout: 30000 });
}

/**
 * Assert error message is displayed
 */
export async function assertErrorMessage(page: Page, messagePattern?: string | RegExp) {
  const pattern = messagePattern || /error|failed|invalid/i;

  const errorElement = page.getByRole('alert')
    .or(page.getByText(pattern));

  await expect(errorElement).toBeVisible({ timeout: 5000 });
}

/**
 * Assert success message is displayed
 */
export async function assertSuccessMessage(page: Page, messagePattern?: string | RegExp) {
  const pattern = messagePattern || /success|complete|created/i;

  const successElement = page.getByRole('alert')
    .or(page.getByText(pattern));

  await expect(successElement).toBeVisible({ timeout: 5000 });
}

/**
 * Assert validation error for specific field
 */
export async function assertFieldValidationError(page: Page, fieldName: string) {
  const fieldPattern = new RegExp(fieldName, 'i');
  const field = page.getByLabel(fieldPattern);

  // Check for aria-invalid attribute
  await expect(field).toHaveAttribute('aria-invalid', 'true', { timeout: 2000 });
}

/**
 * Assert form has validation errors
 */
export async function assertFormHasErrors(page: Page) {
  const errorElements = page.getByText(/required|invalid|error/i);
  await expect(errorElements.first()).toBeVisible({ timeout: 5000 });
}
