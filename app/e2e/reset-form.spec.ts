import { expect, test, type Page } from '@playwright/test';

type DbOptions = {
  dbName: string;
  storeName: string;
};

const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;
const POLL_TIMEOUT = 20_000;
const POLL_INTERVALS = [250, 500, 1000];
const AUTOSAVE_WAIT_MS = 1500;

const DB: DbOptions = {
  dbName: 'mecfs-paperwork',
  storeName: 'records',
};

const deleteDatabase = async (page: Page, dbName: string) => {
  await page.evaluate(async (name) => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }, dbName);
};

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
      { timeout: POLL_TIMEOUT, intervals: POLL_INTERVALS },
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
    await page
      .locator('.formpack-records__actions .app__button')
      .first()
      .click();
  }

  await waitForActiveRecordId(page);
  await expect(nameInput).toBeVisible();
};

test.describe('reset form', () => {
  test('clears the draft and persists after reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await deleteDatabase(page, DB.dbName);
    await page.goto(`/formpacks/${FORM_PACK_ID}`);

    await clickNewDraftIfNeeded(page);

    const nameInput = page.locator('#root_person_name');
    await waitForActiveRecordId(page);
    await nameInput.fill('Test Person');
    await expect(nameInput).toHaveValue('Test Person');
    // Wait for autosave debounce before asserting persistence via reload.
    await page.waitForTimeout(AUTOSAVE_WAIT_MS);
    await page.reload();
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue('Test Person');

    await page
      .getByRole('button', {
        name: /form.*zurücksetzen|reset\s*form/i,
      })
      .click();

    await expect(nameInput).toHaveValue('');
    await page.waitForTimeout(AUTOSAVE_WAIT_MS);
    await page.reload();
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue('');
  });
});
