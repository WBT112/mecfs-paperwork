import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { waitForDownload } from './helpers/download';
import { openFormpackWithRetry } from './helpers/formpack';
import { openCollapsibleSectionById } from './helpers/sections';

const DB_NAME = 'mecfs-paperwork';
const FORM_PACK_ID = 'doctor-letter';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;

const USER_TIMINGS = {
  appBoot: 'mecfs.app.boot.total',
  formpackLoad: 'mecfs.formpack.load.total',
  exportJson: 'mecfs.export.json.total',
  exportDocx: 'mecfs.export.docx.total',
  exportPdf: 'mecfs.export.pdf.total',
} as const;

const getMeasureCount = async (
  page: Page,
  metric: (typeof USER_TIMINGS)[keyof typeof USER_TIMINGS],
) =>
  page.evaluate(
    (name) => performance.getEntriesByName(name, 'measure').length,
    metric,
  );

const expectMeasureIncrease = async (
  page: Page,
  metric: (typeof USER_TIMINGS)[keyof typeof USER_TIMINGS],
  previousCount: number,
) => {
  await expect
    .poll(async () => (await getMeasureCount(page, metric)) > previousCount, {
      timeout: 30_000,
      intervals: [200, 400, 800],
    })
    .toBe(true);

  const latest = await page.evaluate((name) => {
    const entries = performance.getEntriesByName(name, 'measure');
    const last = entries[entries.length - 1];
    if (!last) {
      return null;
    }
    return { duration: last.duration, startTime: last.startTime };
  }, metric);

  expect(latest).not.toBeNull();
  expect(Number.isFinite(latest?.duration ?? Number.NaN)).toBe(true);
  expect((latest?.duration ?? -1) >= 0).toBe(true);
  expect(Number.isFinite(latest?.startTime ?? Number.NaN)).toBe(true);
  expect((latest?.startTime ?? -1) >= 0).toBe(true);
};

const ensureActiveDraft = async (page: Page) => {
  await openCollapsibleSectionById(page, 'formpack-records');
  await expect(page.locator('#formpack-records-toggle')).toHaveAttribute(
    'aria-expanded',
    'true',
  );

  const activeRecordId = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    ACTIVE_RECORD_KEY,
  );
  if (activeRecordId) {
    await expect(page.locator('.formpack-form')).toBeVisible();
    return;
  }

  const newDraftButton = page
    .locator('.formpack-records__actions .app__button')
    .first();
  await expect(newDraftButton).toBeVisible({ timeout: 15_000 });
  await newDraftButton.click();

  await expect
    .poll(
      async () =>
        page.evaluate(
          (key) => globalThis.localStorage.getItem(key),
          ACTIVE_RECORD_KEY,
        ),
      { timeout: 15_000, intervals: [200, 400, 800] },
    )
    .not.toBeNull();
  await expect(page.locator('.formpack-form')).toBeVisible();
};

test.describe('user timing instrumentation', () => {
  test.beforeEach(async ({ page }) => {
    await deleteDatabase(page, DB_NAME);
    await page.goto('/');
  });

  test('records boot and formpack-load timings', async ({ page }) => {
    await expect
      .poll(async () => await getMeasureCount(page, USER_TIMINGS.appBoot), {
        timeout: 15_000,
        intervals: [200, 400, 800],
      })
      .toBeGreaterThan(0);

    const beforeLoad = await getMeasureCount(page, USER_TIMINGS.formpackLoad);
    await openFormpackWithRetry(
      page,
      FORM_PACK_ID,
      page.locator('#formpack-records-toggle'),
    );
    await expectMeasureIncrease(page, USER_TIMINGS.formpackLoad, beforeLoad);
  });

  test('records export timings for JSON, DOCX and PDF', async ({ page }) => {
    await openFormpackWithRetry(
      page,
      FORM_PACK_ID,
      page.locator('#formpack-records-toggle'),
    );
    await ensureActiveDraft(page);

    const jsonBefore = await getMeasureCount(page, USER_TIMINGS.exportJson);
    const jsonButton = page.getByRole('button', {
      name: /Entwurf exportieren \(JSON\)|Export draft \(JSON\)/i,
    });
    await waitForDownload(page, () => jsonButton.click());
    await expectMeasureIncrease(page, USER_TIMINGS.exportJson, jsonBefore);

    const docxBefore = await getMeasureCount(page, USER_TIMINGS.exportDocx);
    const docxButton = page.getByRole('button', {
      name: /DOCX \(Word\) exportieren|Export document/i,
    });
    await waitForDownload(page, () => docxButton.click());
    await expectMeasureIncrease(page, USER_TIMINGS.exportDocx, docxBefore);

    const pdfBefore = await getMeasureCount(page, USER_TIMINGS.exportPdf);
    const pdfButton = page.getByRole('button', {
      name: /PDF exportieren|Export PDF/i,
    });
    await pdfButton.click();
    await expectMeasureIncrease(page, USER_TIMINGS.exportPdf, pdfBefore);
  });
});
