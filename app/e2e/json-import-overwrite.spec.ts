import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { fillTextInputStable } from './helpers/form';
import {
  expectLocaleLabel,
  switchLocale,
  type SupportedTestLocale,
} from './helpers/locale';
import { openCollapsibleSection } from './helpers/sections';

const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;
const DB_NAME = 'mecfs-paperwork';

const getActiveRecordId = async (page: Page) => {
  return page.evaluate(
    (key) => window.localStorage.getItem(key),
    ACTIVE_RECORD_KEY,
  );
};

const waitForActiveRecordId = async (page: Page) => {
  let activeId = '';
  await expect
    .poll(
      async () => {
        activeId = (await getActiveRecordId(page)) ?? '';
        return activeId;
      },
      { timeout: 10_000, intervals: [250, 500, 1000] },
    )
    .not.toBe('');
  return activeId;
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

  const activeIdAfterLoad = await getActiveRecordId(page);
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
    test('imports JSON overwrite into active draft', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
      await deleteDatabase(page, DB_NAME);

      await page.goto(`/formpacks/${FORM_PACK_ID}`);
      await openDraftsSection(page);
      await switchLocale(page, locale);
      await clickNewDraftIfNeeded(page);

      const nameInput = page.locator('#root_person_name');
      await fillTextInputStable(page, nameInput, 'Record Alpha', 20_000);
      await page.locator('#root_diagnoses_meCfs').check();

      const activeIdBeforeExport = await waitForActiveRecordId(page);

      const downloadPromise = page.waitForEvent('download');
      const exportButton = page
        .getByRole('button', {
          name: /Entwurf exportieren \(JSON\)|Export draft \(JSON\)/i,
        })
        .first();
      await expect(exportButton).toBeEnabled();
      await exportButton.click();
      const download = await downloadPromise;
      const filePath = await download.path();
      expect(filePath).not.toBeNull();

      await fillTextInputStable(page, nameInput, 'Record Beta', 20_000);

      const oppositeLocale = locale === 'de' ? 'en' : 'de';
      await switchLocale(page, oppositeLocale);
      await expectLocaleLabel(page, oppositeLocale);

      await openImportSection(page);
      const overwriteRadio = page.getByRole('radio', {
        name: /overwrite|überschreiben/i,
      });
      await expect(overwriteRadio).toBeEnabled();
      await overwriteRadio.check();

      await page
        .locator('#formpack-import-file')
        .setInputFiles(filePath as string);
      const importButton = page.locator(
        '.formpack-import__actions .app__button',
      );
      await expect(importButton).toBeEnabled();

      // Overwrite mode uses a native confirm dialog. Stubbing it makes the E2E
      // test deterministic and avoids timing issues with dialog handling.
      await page.evaluate(() => {
        window.confirm = () => true;
      });

      await importButton.click();

      // Note: after a successful import the app clears the file input and the
      // JSON payload, so the import button becomes disabled again.
      await expect(importButton).toBeDisabled({ timeout: 30_000 });
      await expect(importButton).toHaveText(/JSON importieren|Import JSON/i, {
        timeout: 30_000,
      });

      // Import also restores the locale stored in the exported payload.
      await expect
        .poll(async () => page.locator('#locale-select').inputValue(), {
          timeout: 30_000,
          intervals: [250, 500, 1000],
        })
        .toBe(locale);

      const expectedLocaleLabel = locale === 'de' ? 'Sprache' : 'Language';
      await expect
        .poll(
          async () =>
            (await page.locator('label[for="locale-select"]').textContent()) ??
            '',
          { timeout: 30_000, intervals: [250, 500, 1000] },
        )
        .toBe(expectedLocaleLabel);
      await expect
        .poll(async () => getActiveRecordId(page), {
          timeout: 30_000,
          intervals: [250, 500, 1000],
        })
        .toBe(activeIdBeforeExport);
      await expect(nameInput).toHaveValue('Record Alpha', { timeout: 30_000 });
      await expect(page.locator('#root_diagnoses_meCfs')).toBeChecked({
        timeout: 30_000,
      });
    });
  });
}
