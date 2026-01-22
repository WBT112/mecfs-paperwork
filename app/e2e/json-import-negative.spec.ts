import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { deleteDatabase } from './helpers';
import { openCollapsibleSection } from './helpers/sections';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';

const baseExportPayload = {
  app: { id: 'mecfs-paperwork', version: '0.0.0' },
  formpack: { id: FORM_PACK_ID, version: '0.0.0' },
  record: {
    id: 'record-1',
    updatedAt: new Date('2024-01-01T12:00:00.000Z').toISOString(),
    locale: 'de',
  },
  locale: 'de',
  exportedAt: new Date('2024-01-01T12:00:00.000Z').toISOString(),
  data: {
    person: {
      name: 'Valid Example',
      birthDate: '1990-04-12',
    },
    contacts: [],
    diagnoses: {
      meCfs: true,
    },
    symptoms: '',
    medications: [],
    allergies: '',
    doctor: {
      name: 'Doctor Example',
      phone: '555-111-2222',
    },
  },
} as const;

const loadFormpack = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);
  await page.goto(`/formpacks/${FORM_PACK_ID}`);
  await openCollapsibleSection(page, /import/i);
};

const triggerImport = async (page: Page, filePath: string) => {
  await page.locator('#formpack-import-file').setInputFiles(filePath);
  const importButton = page
    .getByRole('button', { name: /JSON importieren|Import JSON/i })
    .first();
  await expect(importButton).toBeEnabled();
  await importButton.click();
};

test('shows an error for invalid JSON imports', async ({ page }, testInfo) => {
  await loadFormpack(page);

  const invalidJsonPath = testInfo.outputPath('invalid.json');
  await writeFile(invalidJsonPath, '{invalid-json', 'utf-8');

  await triggerImport(page, invalidJsonPath);

  const error = page.locator('.app__error');
  await expect(error).toHaveText(
    /Ungültiges JSON|Invalid JSON|importInvalidJsonWithDetails/i,
  );
  await expect(page.locator('.formpack-import__success')).toHaveCount(0);
});

test('shows an error when importing an unknown formpack', async ({
  page,
}, testInfo) => {
  await loadFormpack(page);

  const invalidFormpackPath = testInfo.outputPath('unknown-formpack.json');
  const payload = {
    ...baseExportPayload,
    formpack: { ...baseExportPayload.formpack, id: 'unknown' },
  };
  await writeFile(invalidFormpackPath, JSON.stringify(payload), 'utf-8');

  await triggerImport(page, invalidFormpackPath);

  const error = page.locator('.app__error');
  await expect(error).toHaveText(/Unbekanntes Formpack|Unknown formpack/i);
  await expect(page.locator('.formpack-import__success')).toHaveCount(0);
});

test('shows an error when schema validation fails', async ({
  page,
}, testInfo) => {
  await loadFormpack(page);

  const schemaMismatchPath = testInfo.outputPath('schema-mismatch.json');
  const payload = {
    ...baseExportPayload,
    data: {
      ...baseExportPayload.data,
      person: {},
    },
  };
  await writeFile(schemaMismatchPath, JSON.stringify(payload), 'utf-8');

  await triggerImport(page, schemaMismatchPath);

  const error = page.locator('.app__error');
  await expect(error).toHaveText(/Schema|schema|passen nicht/i);
  await expect(page.locator('.formpack-import__success')).toHaveCount(0);
});
