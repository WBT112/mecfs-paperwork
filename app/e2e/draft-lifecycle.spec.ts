import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { fillTextInputStable } from './helpers/form';
import {
  POLL_INTERVALS,
  POLL_TIMEOUT,
  waitForRecordById,
  waitForRecordField,
} from './helpers/records';

const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;
const DB_NAME = 'mecfs-paperwork';

const getActiveRecordId = async (page: Page) => {
  return page.evaluate(
    (key) => window.localStorage.getItem(key),
    ACTIVE_RECORD_KEY,
  );
};

const waitForActiveRecordId = async (page: Page, timeoutMs = POLL_TIMEOUT) => {
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

const waitForActiveRecordIdChange = async (page: Page, previousId: string) => {
  await expect
    .poll(async () => getActiveRecordId(page), {
      timeout: POLL_TIMEOUT,
      intervals: POLL_INTERVALS,
    })
    .not.toBe(previousId);
  return (await getActiveRecordId(page)) ?? '';
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

const waitForNamePersisted = async (
  page: Page,
  recordId: string,
  expectedName: string,
) => {
  // Persisted state is stored in IndexedDB; the UI can temporarily show a value
  // that hasn't been flushed yet.
  await waitForRecordField(
    page,
    recordId,
    (record) => record?.data?.person?.name ?? '',
    expectedName,
    { timeout: POLL_TIMEOUT },
  );
};

const clickNewDraft = async (page: Page) => {
  await waitForRecordListReady(page);
  const newDraftButton = page
    .locator('.formpack-records__actions .app__button')
    .first();
  await clickActionButton(newDraftButton);
  await expect(page.locator('.formpack-records__item--active')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
};

test('draft lifecycle supports switching between multiple drafts', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);

  // On an empty DB, the app creates the first draft automatically after
  // records have loaded. Avoid clicking "new draft" too early, as that can
  // race the initial restore path across browsers.
  await waitForRecordListReady(page);
  const firstActiveId = await waitForActiveRecordId(page);
  await waitForRecordById(page, firstActiveId, { timeout: POLL_TIMEOUT });
  await fillTextInputStable(page, '#root_person_name', 'Draft One');
  await waitForNamePersisted(page, firstActiveId, 'Draft One');

  await clickNewDraft(page);
  const secondActiveId = await waitForActiveRecordIdChange(page, firstActiveId);
  await waitForRecordById(page, secondActiveId, { timeout: POLL_TIMEOUT });
  await fillTextInputStable(page, '#root_person_name', 'Draft Two');
  await waitForNamePersisted(page, secondActiveId, 'Draft Two');
  expect(secondActiveId).not.toBe(firstActiveId);

  const records = page.locator('.formpack-records__item');
  await expect
    .poll(async () => records.count(), {
      timeout: POLL_TIMEOUT,
      intervals: POLL_INTERVALS,
    })
    .toBeGreaterThanOrEqual(2);

  const loadNonActiveDraft = async () => {
    const nonActiveItem = page
      .locator('.formpack-records__item:not(.formpack-records__item--active)')
      .first();
    await expect(nonActiveItem).toBeVisible({ timeout: POLL_TIMEOUT });
    const loadButton = nonActiveItem.getByRole('button', {
      name: /load\s*draft|entwurf\s*laden/i,
    });
    await clickActionButton(loadButton);
  };

  await loadNonActiveDraft();
  await expect
    .poll(async () => getActiveRecordId(page), {
      timeout: POLL_TIMEOUT,
      intervals: POLL_INTERVALS,
    })
    .toBe(firstActiveId);
  await expect(page.locator('#root_person_name')).toHaveValue('Draft One', {
    timeout: POLL_TIMEOUT,
  });

  const activeBadge = page.locator(
    '.formpack-records__item--active .formpack-records__badge',
  );
  await expect(activeBadge).toHaveText(/active|aktiv/i);

  await loadNonActiveDraft();
  await expect
    .poll(async () => getActiveRecordId(page), {
      timeout: POLL_TIMEOUT,
      intervals: POLL_INTERVALS,
    })
    .toBe(secondActiveId);
  await expect(page.locator('#root_person_name')).toHaveValue('Draft Two', {
    timeout: POLL_TIMEOUT,
  });

  await expect(activeBadge).toHaveText(/active|aktiv/i);

  await page.reload();
  await expect
    .poll(async () => getActiveRecordId(page), {
      timeout: POLL_TIMEOUT,
      intervals: POLL_INTERVALS,
    })
    .toBe(secondActiveId);
  await expect(page.locator('#root_person_name')).toHaveValue('Draft Two', {
    timeout: POLL_TIMEOUT,
  });
});
