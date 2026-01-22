import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { deleteDatabase } from './helpers';
import { fillTextInputStable } from './helpers/form';
import {
  POLL_INTERVALS,
  POLL_TIMEOUT,
  waitForRecordById,
  waitForRecordField,
} from './helpers/records';
import { switchLocale, type SupportedTestLocale } from './helpers/locale';
import { openCollapsibleSection } from './helpers/sections';

type DbOptions = {
  dbName: string;
  storeName: string;
};

const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;
const DB: DbOptions = {
  dbName: 'mecfs-paperwork',
  storeName: 'records',
};

const attachPrivacyConsoleGuard = (page: Page, values: string[]) => {
  page.on('console', (message) => {
    const text = message.text();
    for (const value of values) {
      if (text.includes(value)) {
        throw new Error(`Console output leaked private test data: ${value}`);
      }
    }
  });
};

const getActiveRecordId = async (page: Page) => {
  return page.evaluate(
    (key) => window.localStorage.getItem(key),
    ACTIVE_RECORD_KEY,
  );
};

const waitForActiveRecordId = async (page: Page, timeoutMs = 10_000) => {
  let activeId = '';
  await expect
    .poll(
      async () => {
        activeId = (await getActiveRecordId(page)) ?? '';
        return activeId;
      },
      { timeout: timeoutMs, intervals: POLL_INTERVALS },
    )
    .not.toBe('');
  return activeId;
};

/**
 * Ensures the activeRecordId is not only present, but stable (does not change)
 * across multiple reads. This avoids flakiness when the app replaces the
 * active draft shortly after bootstrap (timing-sensitive in Chromium under CI load).
 */
const waitForStableActiveRecordId = async (page: Page, timeoutMs = 10_000) => {
  let last = '';
  let stableCount = 0;

  await expect
    .poll(
      async () => {
        const current = (await getActiveRecordId(page)) ?? '';
        if (!current) {
          last = '';
          stableCount = 0;
          return false;
        }

        if (current === last) {
          stableCount += 1;
        } else {
          last = current;
          stableCount = 0;
        }

        // Require the same id for 3 consecutive reads.
        return stableCount >= 2;
      },
      { timeout: timeoutMs, intervals: POLL_INTERVALS },
    )
    .toBe(true);

  return last;
};

const waitForRecordListReady = async (page: Page) => {
  await page.waitForFunction(() => {
    const empty = document.querySelector('.formpack-records__empty');
    if (empty) {
      const text = empty.textContent?.toLowerCase() ?? '';
      return !text.includes('loading') && !text.includes('geladen');
    }
    return true;
  });
};

const openDraftsSection = async (page: Page) => {
  await openCollapsibleSection(page, /entwürfe|drafts/i);
};

const openImportSection = async (page: Page) => {
  await openCollapsibleSection(page, /import/i);
};

const clickNewDraftIfNeeded = async (page: Page) => {
  const nameInput = page.locator('#root_person_name');

  const existingActiveId = await getActiveRecordId(page);
  if (existingActiveId) {
    await expect(nameInput).toBeVisible();
    return;
  }

  await openDraftsSection(page);
  await waitForRecordListReady(page);

  // Prefer waiting for the app-created initial draft to avoid creating duplicates
  // (which can cause an activeRecordId swap mid-test).
  let activeIdAfterLoad = await getActiveRecordId(page);
  if (!activeIdAfterLoad) {
    try {
      activeIdAfterLoad = await waitForActiveRecordId(page, 8_000);
    } catch {
      // ignore and fall back to manual draft creation below
    }
  }

  if (activeIdAfterLoad) {
    await expect(nameInput).toBeVisible();
    return;
  }

  const newDraftButton = page.getByRole('button', {
    name: /new\s*draft|neuer\s*entwurf/i,
  });
  if (await newDraftButton.count()) {
    await newDraftButton.first().click();
  } else {
    // Fallback: click the first action button in the drafts area.
    await page
      .locator('.formpack-records__actions .app__button')
      .first()
      .click();
  }

  await waitForActiveRecordId(page);
  await expect(nameInput).toBeVisible();
};

test.describe.configure({ mode: 'parallel' });

const locales: SupportedTestLocale[] = ['de', 'en'];

for (const locale of locales) {
  test.describe(locale, () => {
    // Verifies JSON export downloads a file with expected metadata and form data for the active draft.
    test('exports JSON with record metadata and form data', async ({
      page,
    }) => {
      const fakeName = 'Test User';
      const fakeBirthDate = '1990-04-12';
      const fakePhone = '555-000-0000';
      attachPrivacyConsoleGuard(page, [fakeName, fakeBirthDate, fakePhone]);

      await page.goto('/');
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
      await deleteDatabase(page, DB.dbName);

      await page.goto(`/formpacks/${FORM_PACK_ID}`);
      await openDraftsSection(page);
      await switchLocale(page, locale);
      await clickNewDraftIfNeeded(page);

      // Use a stable activeRecordId to avoid races where the app swaps drafts after bootstrap.
      let recordId = await waitForStableActiveRecordId(page);
      await waitForRecordById(page, recordId, { timeout: POLL_TIMEOUT });

      await fillTextInputStable(page, '#root_person_name', fakeName);
      await fillTextInputStable(page, '#root_person_birthDate', fakeBirthDate);
      await fillTextInputStable(page, '#root_doctor_phone', fakePhone);

      const diagnosisCheckbox = page.locator('#root_diagnoses_meCfs');
      await diagnosisCheckbox.scrollIntoViewIfNeeded();
      await diagnosisCheckbox.check({ timeout: 60_000 });

      // Refresh recordId in case the app swapped the active draft during/after input handling.
      recordId = await waitForStableActiveRecordId(page);
      await waitForRecordById(page, recordId, { timeout: POLL_TIMEOUT });

      // Ensure autosave has persisted the changes before exporting.
      await waitForRecordField(
        page,
        recordId,
        (record) => record?.data?.person?.name ?? '',
        fakeName,
      );
      await waitForRecordField(
        page,
        recordId,
        (record) => record?.data?.person?.birthDate ?? '',
        fakeBirthDate,
      );
      await waitForRecordField(
        page,
        recordId,
        (record) => record?.data?.doctor?.phone ?? '',
        fakePhone,
      );
      await waitForRecordField(
        page,
        recordId,
        (record) => record?.data?.diagnoses?.meCfs ?? false,
        true,
      );

      const activeIdBeforeImport = recordId;

      // Trigger the JSON export for the active draft.
      const downloadPromise = page.waitForEvent('download');
      const exportButton = page
        .getByRole('button', {
          name: /Entwurf exportieren \(JSON\)|Export record \(JSON\)/i,
        })
        .first();
      await expect(exportButton).toBeEnabled();
      await exportButton.click();

      const download = await downloadPromise;
      const filePath = await download.path();
      expect(filePath).not.toBeNull();
      await expect(download.suggestedFilename()).toMatch(
        new RegExp(
          `^${FORM_PACK_ID}_.+_\\d{4}-\\d{2}-\\d{2}_${locale}\\.json$`,
        ),
      );

      // The payload must include metadata and the form data we entered.
      const contents = await readFile(filePath as string, 'utf-8');
      const payload = JSON.parse(contents) as {
        app: { id: string; version: string };
        formpack: { id: string; version: string };
        record: {
          id: string;
          name?: string;
          updatedAt: string;
          locale: string;
        };
        locale: string;
        exportedAt: string;
        data: Record<string, unknown>;
        revisions?: unknown[];
      };

      expect(payload.app.id).toBe('mecfs-paperwork');
      expect(payload.formpack.id).toBe(FORM_PACK_ID);
      expect(payload.record.id).toBeTruthy();
      expect(payload.record.updatedAt).toBeTruthy();
      expect(payload.locale).toBe(locale);
      expect(payload.record.locale).toBe(locale);
      expect(payload.data).toMatchObject({
        person: {
          name: fakeName,
          birthDate: fakeBirthDate,
        },
        doctor: {
          phone: fakePhone,
        },
        diagnoses: {
          meCfs: true,
        },
      });
      expect(new Date(payload.exportedAt).toISOString()).toBe(
        payload.exportedAt,
      );
      expect(payload.revisions).toBeUndefined();

      // Import the exported payload to verify the round-trip flow stays functional.
      await openImportSection(page);
      await page
        .locator('#formpack-import-file')
        .setInputFiles(filePath as string);

      const importButton = page
        .getByRole('button', { name: /JSON importieren|Import JSON/i })
        .first();
      await expect(importButton).toBeEnabled();
      await importButton.click();

      const importSuccess = page.locator('.formpack-import__success');
      await expect(importSuccess).toHaveText(
        /Import abgeschlossen|Import complete/i,
      );

      await expect
        .poll(async () => getActiveRecordId(page), {
          timeout: 10_000,
          intervals: POLL_INTERVALS,
        })
        .not.toBe(activeIdBeforeImport);

      await expect(page.locator('#root_person_name')).toHaveValue(fakeName);
      await expect(page.locator('#root_person_birthDate')).toHaveValue(
        fakeBirthDate,
      );
      await expect(page.locator('#root_doctor_phone')).toHaveValue(fakePhone);
      await expect(page.locator('#root_diagnoses_meCfs')).toBeChecked();
    });
  });
}
