import { expect, test } from '@playwright/test';
import { waitForDownload } from './helpers/download';
import { deleteDatabase } from './helpers';

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
    await deleteDatabase(page, 'mecfs-paperwork');
    await page.goto('/help');
  });

  test('download button creates a valid JSON bundle', async ({ page }) => {
    const downloadButton = page.getByTestId('diagnostics-download');
    await expect(downloadButton).toBeVisible();

    const download = await waitForDownload(page, () =>
      downloadButton.click(),
    );

    expect(download.suggestedFilename()).toBe('mecfs-diagnostics.json');

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
});
