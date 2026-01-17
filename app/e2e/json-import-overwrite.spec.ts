import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { switchLocale, type SupportedTestLocale } from './helpers/locale';

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

const clickNewDraftIfNeeded = async (page: Page) => {
  const nameInput = page.locator('#root_person_name');
  const existingActiveId = await getActiveRecordId(page);
  if (existingActiveId) {
    await expect(nameInput).toBeVisible();
    return;
  }

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
      await switchLocale(page, locale);
      await clickNewDraftIfNeeded(page);

      const nameInput = page.locator('#root_person_name');
      await nameInput.fill('Record Alpha');
      await page.locator('#root_diagnoses_meCfs').check();

      const activeIdBeforeExport = await waitForActiveRecordId(page);

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

      await nameInput.fill('Record Beta');
      await expect(nameInput).toHaveValue('Record Beta');

      const overwriteRadio = page.getByRole('radio', {
        name: /overwrite|überschreiben/i,
      });
      await expect(overwriteRadio).toBeEnabled();
      await overwriteRadio.check();

      await page
        .locator('#formpack-import-file')
        .setInputFiles(filePath as string);
      const importButton = page
        .getByRole('button', { name: /JSON importieren|Import JSON/i })
        .first();
      await expect(importButton).toBeEnabled();

      page.once('dialog', (dialog) => dialog.accept());
      await importButton.click();

      const importSuccess = page.locator('.formpack-import__success');
      await expect(importSuccess).toHaveText(
        /Import abgeschlossen|Import complete/i,
      );

      await expect
        .poll(async () => getActiveRecordId(page), {
          timeout: 10_000,
          intervals: [250, 500, 1000],
        })
        .toBe(activeIdBeforeExport);
      await expect(nameInput).toHaveValue('Record Alpha');
      await expect(page.locator('#root_diagnoses_meCfs')).toBeChecked();
    });
  });
}
