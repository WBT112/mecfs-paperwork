import { expect, test, type Page } from '@playwright/test';
import { waitForDownload } from './helpers/download';
import { deleteDatabase } from './helpers';

const DB_NAME = 'mecfs-paperwork';
const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;

const FORBIDDEN_MARKERS = [
  'patient',
  'diagnosis',
  'medication',
  'symptom',
  'treatment',
];

test.describe('diagnostics bundle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await deleteDatabase(page, DB_NAME);
    await page.goto('/help');
  });

  test('download button creates a valid JSON bundle', async ({ page }) => {
    const downloadButton = page.getByTestId('diagnostics-download');
    await expect(downloadButton).toBeVisible();

    const download = await waitForDownload(page, () => downloadButton.click());

    expect(download.suggestedFilename()).toBe('mecfs-support-bundle.json');

    const path = await download.path();
    expect(path).toBeTruthy();

    const fs = await import('fs');
    const content = fs.readFileSync(path!, 'utf-8');
    const bundle = JSON.parse(content);

    // Verify bundle structure
    expect(bundle.generatedAt).toBeDefined();
    expect(bundle.app).toBeDefined();
    expect(bundle.app.version).toBeDefined();
    expect(bundle.browser).toBeDefined();
    expect(bundle.browser.userAgent).toBeDefined();
    expect(bundle.serviceWorker).toBeDefined();
    expect(bundle.indexedDb).toBeDefined();
    expect(bundle.storageHealth).toBeDefined();
    expect(bundle.errors).toBeDefined();

    // Verify no forbidden markers are present in the serialized bundle
    const json = content.toLowerCase();
    for (const marker of FORBIDDEN_MARKERS) {
      // Check as JSON keys (quoted) — the bundle should not contain
      // these as keys holding user data. Allow them only if they appear
      // inside known safe contexts (e.g. error messages describing the
      // system, not user content).
      const asKey = `"${marker}":`;
      expect(json).not.toContain(asKey);
    }
  });

  test('storage health section is visible on help page', async ({ page }) => {
    const healthSection = page.getByTestId('storage-health');
    await expect(healthSection).toBeVisible();

    const idbStatus = page.getByTestId('storage-health-idb');
    await expect(idbStatus).toBeVisible();

    const statusElement = page.getByTestId('storage-health-status');
    await expect(statusElement).toBeVisible();
  });

  test('copy button copies bundle JSON to clipboard', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const copyButton = page.getByTestId('diagnostics-copy');
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    await expect(copyButton).toHaveText(/copied|kopiert/i, { timeout: 5000 });

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    const bundle = JSON.parse(clipboardText);
    expect(bundle.generatedAt).toBeDefined();
    expect(bundle.app).toBeDefined();
    expect(bundle.browser).toBeDefined();
  });
});

test.describe('reset all local data', () => {
  const seedDraft = async (page: Page) => {
    // Navigate to a formpack to create a draft via the app
    await page.goto(`/${FORM_PACK_ID}`);

    // Wait for the app to create an active record in localStorage
    await expect
      .poll(
        async () => {
          return page.evaluate(
            (key) => localStorage.getItem(key),
            ACTIVE_RECORD_KEY,
          );
        },
        { timeout: 15_000, intervals: [200, 400, 800] },
      )
      .not.toBeNull();

    // Verify the IndexedDB database exists
    const dbExists = await page.evaluate(async (dbName) => {
      if (!indexedDB.databases) return true;
      const dbs = await indexedDB.databases();
      return dbs.some((db) => db.name === dbName);
    }, DB_NAME);
    expect(dbExists).toBe(true);
  };

  test('reset button clears IndexedDB and reloads the app', async ({
    page,
  }) => {
    await page.goto('/');
    await deleteDatabase(page, DB_NAME);

    // 1. Seed data
    await seedDraft(page);

    // 2. Navigate to help page and click reset
    await page.goto('/help');
    const resetButton = page.getByTestId('reset-all-data');
    await expect(resetButton).toBeVisible();

    // Accept the confirmation dialog
    page.on('dialog', (dialog) => dialog.accept());
    await resetButton.click();

    // 3. Wait for the page to reload (the app reloads after reset)
    await page.waitForLoadState('domcontentloaded');

    // 4. Verify IndexedDB database no longer exists
    const dbExists = await page.evaluate(async (dbName) => {
      if (!indexedDB.databases) return false;
      const dbs = await indexedDB.databases();
      return dbs.some((db) => db.name === dbName);
    }, DB_NAME);
    expect(dbExists).toBe(false);

    // 5. Verify localStorage is cleared
    const activeRecordId = await page.evaluate(
      (key) => localStorage.getItem(key),
      ACTIVE_RECORD_KEY,
    );
    expect(activeRecordId).toBeNull();
  });

  test('reset is cancelled when user dismisses the confirm dialog', async ({
    page,
  }) => {
    await page.goto('/');
    await deleteDatabase(page, DB_NAME);
    await seedDraft(page);

    await page.goto('/help');
    const resetButton = page.getByTestId('reset-all-data');
    await expect(resetButton).toBeVisible();

    // Dismiss the confirmation dialog
    page.on('dialog', (dialog) => dialog.dismiss());
    await resetButton.click();

    // Button should still be enabled and not in progress state
    await expect(resetButton).toBeEnabled();

    // Data should still exist
    const activeRecordId = await page.evaluate(
      (key) => localStorage.getItem(key),
      ACTIVE_RECORD_KEY,
    );
    expect(activeRecordId).not.toBeNull();
  });
});
