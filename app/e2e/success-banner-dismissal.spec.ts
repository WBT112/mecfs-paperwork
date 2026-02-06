import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deleteDatabase } from './helpers';
import { openCollapsibleSection } from './helpers/sections';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 20_000;

const createNewDraft = async (page: Page) => {
  await openCollapsibleSection(page, /entwürfe|drafts/i);
  const newDraftButton = page.getByRole('button', {
    name: /new\s*draft|neuer\s*entwurf/i,
  });
  await expect(newDraftButton).toBeVisible({ timeout: POLL_TIMEOUT });
  await newDraftButton.click();
  await expect(page.locator('#root_person_name')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
};

const loadExamplePayload = async () => {
  const examplePath = path.resolve(
    process.cwd(),
    '../formpacks/notfallpass/examples/example.json',
  );
  const manifestPath = path.resolve(
    process.cwd(),
    '../formpacks/notfallpass/manifest.json',
  );
  const [exampleRaw, manifestRaw] = await Promise.all([
    readFile(examplePath, 'utf-8'),
    readFile(manifestPath, 'utf-8'),
  ]);
  const exampleData = JSON.parse(exampleRaw) as Record<string, unknown>;
  const manifest = JSON.parse(manifestRaw) as { version?: string };
  const timestamp = new Date().toISOString();

  return {
    app: { id: 'mecfs-paperwork' },
    formpack: {
      id: FORM_PACK_ID,
      ...(manifest.version ? { version: manifest.version } : {}),
    },
    record: {
      id: `e2e-${Date.now()}`,
      title: 'Notfallpass',
      updatedAt: timestamp,
    },
    locale: 'de',
    exportedAt: timestamp,
    data: exampleData,
  };
};

test('dismisses success messages when other action buttons are clicked', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);
  await createNewDraft(page);
  await page.locator('#root_person_name').fill('Test User');

  const docxSection = page.locator('.formpack-docx-export');
  const docxExportButton = docxSection.locator('[data-action="docx-export"]');
  const statusMessage = page.locator('.formpack-actions__status');
  const docxSuccess = statusMessage.locator('.formpack-actions__success');
  await expect(docxExportButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  await docxExportButton.click();
  await expect(docxSuccess).toBeVisible({ timeout: POLL_TIMEOUT });

  const resetButton = page.getByRole('button', {
    name: /Formular zurücksetzen|Reset form/i,
  });
  await expect(resetButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  await resetButton.click();
  await expect(docxSuccess).toBeHidden({ timeout: POLL_TIMEOUT });

  const payload = await loadExamplePayload();
  const importPath = testInfo.outputPath('import.json');
  await writeFile(importPath, JSON.stringify(payload, null, 2), 'utf-8');
  await openCollapsibleSection(page, /import/i);
  await page.locator('#formpack-import-file').setInputFiles(importPath);
  const importButton = page
    .getByRole('button', { name: /JSON importieren|Import JSON/i })
    .first();
  await expect(importButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  await importButton.click();

  const importSuccess = page.locator('.formpack-import__success');
  await expect(importSuccess).toBeVisible({ timeout: POLL_TIMEOUT });

  await docxExportButton.click();
  await expect(importSuccess).toBeHidden({ timeout: POLL_TIMEOUT });
});
