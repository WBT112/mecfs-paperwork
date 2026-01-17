import { expect, type Locator } from '@playwright/test';

/**
 * Robust click helper for action buttons that may be re-rendered quickly
 * (e.g., React state changes, locale switches, offline toggles).
 *
 * Playwright's `locator.click()` will auto-scroll and is resilient to detached
 * elements by re-resolving and retrying.
 */
export const clickActionButton = async (
  button: Locator,
  timeout: number = 20_000,
) => {
  await expect(button).toBeVisible({ timeout });
  await expect(button).toBeEnabled({ timeout });
  await button.click({ timeout });
};
