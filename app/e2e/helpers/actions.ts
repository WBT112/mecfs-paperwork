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

  const perAttemptTimeout = Math.max(2_000, Math.floor(timeout / 3));
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await button.click({ timeout: perAttemptTimeout });
      return;
    } catch (error) {
      lastError = error;
      // Retry backoff: brief pause before re-attempting click on flaky re-rendered buttons
      await button.page().waitForTimeout(150 * attempt);
    }
  }

  await button.focus();
  try {
    await button.press('Enter', { timeout: perAttemptTimeout });
    return;
  } catch (error) {
    lastError = error;
  }

  throw lastError;
};
