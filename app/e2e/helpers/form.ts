import { expect, type Locator, type Page } from '@playwright/test';

const DEFAULT_TIMEOUT = 20_000;
const POLL_INTERVALS = [200, 400, 800, 1200];

/**
 * Robust input fill that retries until the value sticks.
 */
export const fillTextInputStable = async (
  page: Page,
  input: Locator,
  value: string,
  timeout: number = DEFAULT_TIMEOUT,
) => {
  await expect(input).toBeVisible({ timeout });
  await expect(input).toBeEditable({ timeout });

  await expect
    .poll(
      async () => {
        try {
          await input.fill(value, { timeout: Math.min(5_000, timeout) });

          // Best-effort blur to trigger validation / controlled-state commits.
          try {
            await input.press('Tab', { timeout: 1000 });
          } catch {
            // ignore
          }
        } catch {
          // ignore: input might be temporarily detached/replaced
        }

        await page.waitForTimeout(50);

        try {
          return await input.inputValue();
        } catch {
          return '';
        }
      },
      { timeout, intervals: POLL_INTERVALS },
    )
    .toBe(value);

  // Ensure it survives a small re-render tick.
  await page.waitForTimeout(150);
  await expect(input).toHaveValue(value, { timeout: 2_000 });
};
