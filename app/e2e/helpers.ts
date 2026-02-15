// Shared E2E test helpers

import { type Page } from '@playwright/test';

/**
 * A robust utility to delete an IndexedDB database.
 * Unlike the default Playwright behavior or a naive implementation, this function
 * ensures that the test fails if the database deletion is blocked or fails,
 * preventing test flakiness from leftover state.
 *
 * @param page The Playwright page object.
 * @param dbName The name of the IndexedDB database to delete.
 */
export const deleteDatabase = async (page: Page, dbName: string) => {
  // Navigate to a script-free same-origin page so app/runtime DB handles are closed
  // before deletion. This is especially important on Firefox/WebKit.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto('/e2e-reset.html', { waitUntil: 'domcontentloaded' });
      break;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
      await page.waitForTimeout(250 * attempt);
    }
  }

  const maxAttempts = 4;
  let lastFailureReason = 'Unknown error';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await page.evaluate(
      async ({ name, timeoutMs }) => {
        localStorage.clear();
        sessionStorage.clear();

        return await new Promise<{ ok: boolean; reason?: string }>(
          (resolve) => {
            const req = indexedDB.deleteDatabase(name);
            let settled = false;

            const finish = (payload: { ok: boolean; reason?: string }) => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              resolve(payload);
            };

            const timeoutId = window.setTimeout(() => {
              finish({
                ok: false,
                reason: 'Timed out while deleting IndexedDB.',
              });
            }, timeoutMs);

            req.onsuccess = () => finish({ ok: true });
            req.onerror = () =>
              finish({
                ok: false,
                reason: req.error?.message ?? 'IndexedDB deletion failed.',
              });
            // `onblocked` is transient in practice. Keep waiting for success/error
            // until timeout, then retry from the outer loop.
            req.onblocked = () => {
              // no-op
            };
          },
        );
      },
      { name: dbName, timeoutMs: 3_000 },
    );

    if (result.ok) {
      return;
    }

    lastFailureReason = result.reason ?? lastFailureReason;
    await page.waitForTimeout(200 * attempt);
  }

  throw new Error(`Failed to delete IndexedDB: ${lastFailureReason}`);
};
