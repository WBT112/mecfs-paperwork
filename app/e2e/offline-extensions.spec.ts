import { expect, test, type Locator, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { switchLocale } from './helpers/locale';

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
const POLL_TIMEOUT = 20_000;

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
      { timeout: POLL_TIMEOUT, intervals: [250, 500, 1000] },
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

const clickActionButton = async (button: Locator) => {
  await expect(button).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(button).toBeEnabled({ timeout: POLL_TIMEOUT });
  await button.scrollIntoViewIfNeeded();
  await button.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
};

const clickNewDraftIfNeeded = async (page: Page) => {
  const nameInput = page.locator('#root_person_name');
  if (await nameInput.isVisible()) {
    return;
  }

  await waitForRecordListReady(page);
  const newDraftButton = page.getByRole('button', {
    name: /new\s*draft|neuer\s*entwurf/i,
  });
  if (await newDraftButton.count()) {
    await clickActionButton(newDraftButton.first());
  } else {
    await clickActionButton(
      page.locator('.formpack-records__actions .app__button').first(),
    );
  }
  await waitForActiveRecordId(page);
  await expect(nameInput).toBeVisible();
};

const createSnapshot = async (page: Page) => {
  const createButton = page.getByRole('button', {
    name: /create\s*snapshot|snapshot\s*erstellen|momentaufnahme/i,
  });
  if (await createButton.count()) {
    await clickActionButton(createButton.first());
    return;
  }

  await clickActionButton(
    page.locator('.formpack-snapshots__actions .app__button').first(),
  );
};

const restoreFirstSnapshot = async (page: Page) => {
  const snapshotItem = page.locator('.formpack-snapshots__item').first();
  await expect(snapshotItem).toBeVisible({ timeout: POLL_TIMEOUT });
  const restoreButton = snapshotItem.getByRole('button', {
    name: /restore|wiederherstellen|laden/i,
  });
  if (await restoreButton.count()) {
    await clickActionButton(restoreButton.first());
    return;
  }

  const buttons = snapshotItem.locator('button');
  const btnCount = await buttons.count();
  if (btnCount === 0) {
    throw new Error('No action buttons found in snapshot item.');
  }
  await clickActionButton(buttons.nth(btnCount - 1));
};

test.describe('offline-first extensions', () => {
  test('json export still downloads offline', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await deleteDatabase(page, DB.dbName);

    await page.goto(`/formpacks/${FORM_PACK_ID}`);
    await clickNewDraftIfNeeded(page);
    await page.locator('#root_person_name').fill('Offline Export');
    await page.locator('#root_diagnoses_meCfs').check();

    await context.setOffline(true);
    const downloadPromise = page.waitForEvent('download');
    const exportButton = page
      .getByRole('button', {
        name: /Entwurf exportieren \(JSON\)|Export record \(JSON\)/i,
      })
      .first();
    await clickActionButton(exportButton);
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/i);
    await context.setOffline(false);
  });

  test('snapshots create and restore offline', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await deleteDatabase(page, DB.dbName);

    await page.goto(`/formpacks/${FORM_PACK_ID}`);
    await clickNewDraftIfNeeded(page);

    const nameInput = page.locator('#root_person_name');
    await nameInput.fill('Snapshot Offline');
    await expect(nameInput).toHaveValue('Snapshot Offline');

    await context.setOffline(true);
    await createSnapshot(page);
    await expect(page.locator('.formpack-snapshots__item')).toHaveCount(1, {
      timeout: POLL_TIMEOUT,
    });

    await nameInput.fill('Snapshot Changed');
    await expect(nameInput).toHaveValue('Snapshot Changed');
    await restoreFirstSnapshot(page);
    await expect(nameInput).toHaveValue('Snapshot Offline', {
      timeout: POLL_TIMEOUT,
    });
    await context.setOffline(false);
  });

  test('locale switching works offline', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await deleteDatabase(page, DB.dbName);

    await page.goto(`/formpacks/${FORM_PACK_ID}`);
    await context.setOffline(true);
    await switchLocale(page, 'en');
    await switchLocale(page, 'de');
    await context.setOffline(false);
  });
});
