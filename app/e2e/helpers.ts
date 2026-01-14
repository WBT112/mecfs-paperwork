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
  await page.evaluate(async (name) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      // Rejecting on error or blocked is critical for test stability.
      req.onerror = () =>
        reject(
          new Error(
            `Failed to delete IndexedDB: ${req.error?.message ?? 'Unknown error'}`,
          ),
        );
      req.onblocked = () =>
        reject(new Error('Failed to delete IndexedDB: operation blocked.'));
    });
  }, dbName);
};
