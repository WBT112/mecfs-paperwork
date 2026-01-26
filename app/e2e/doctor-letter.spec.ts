import { expect, test, type Page } from '@playwright/test';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import {
  POLL_TIMEOUT,
  getActiveRecordId,
  waitForRecordById,
  waitForRecordField,
} from './helpers/records';
import { switchLocale, type SupportedTestLocale } from './helpers/locale';

type DbOptions = {
  dbName: string;
  storeName: string;
};

const FORM_PACK_ID = 'doctor-letter';
const DB: DbOptions = {
  dbName: 'mecfs-paperwork',
  storeName: 'records',
};

const locales: SupportedTestLocale[] = ['de', 'en'];

const loadFormpackTranslations = async (locale: SupportedTestLocale) => {
  const filePath = path.resolve(
    process.cwd(),
    '..',
    'formpacks',
    FORM_PACK_ID,
    'i18n',
    `${locale}.json`,
  );
  const contents = await readFile(filePath, 'utf-8');
  return JSON.parse(contents) as Record<string, string>;
};

const openFreshDoctorLetter = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB.dbName);
  await page.goto(`/formpacks/${FORM_PACK_ID}`);
};

const openDecisionTree = async (page: Page) => {
  await expect(page.locator('#root_decision_q1')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
};

const answerDecisionTreeCase3 = async (page: Page) => {
  await page.locator('input[name="root_decision_q1"][value="yes"]').check();
  await page.locator('input[name="root_decision_q2"][value="yes"]').check();
  await page.locator('input[name="root_decision_q3"][value="yes"]').check();
  await page.locator('#root_decision_q4').selectOption('COVID-19');
};

const waitForResolvedText = async (page: Page, expected: string) => {
  const resolved = page.locator('#root_decision_resolvedCaseText');
  await expect(resolved).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect
    .poll(async () => resolved.inputValue(), { timeout: POLL_TIMEOUT })
    .toBe(expected);
};

const getActiveRecordIdStable = async (page: Page) => {
  await expect
    .poll(async () => getActiveRecordId(page, FORM_PACK_ID), {
      timeout: POLL_TIMEOUT,
    })
    .not.toBeNull();
  return (await getActiveRecordId(page, FORM_PACK_ID)) as string;
};

const waitForDocxExportReady = async (page: Page) => {
  const docxSection = page.locator('.formpack-docx-export');
  await expect(docxSection).toBeVisible({ timeout: POLL_TIMEOUT });
  const exportButton = docxSection.getByRole('button', {
    name: /export docx|docx exportieren/i,
  });
  await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  return { docxSection, exportButton };
};

const exportDocxAndExpectSuccess = async (
  docxSection: ReturnType<Page['locator']>,
  exportButton: ReturnType<Page['locator']>,
) => {
  const page = docxSection.page();
  const downloadPromise = page.waitForEvent('download');
  const successMessage = docxSection.locator('.formpack-docx-export__success');
  const errorMessage = docxSection.locator('.app__error');
  await clickActionButton(exportButton);
  const download = await downloadPromise;
  await expect(successMessage).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(errorMessage).toHaveCount(0);
  return download;
};

test.describe.configure({ mode: 'parallel' });

for (const locale of locales) {
  test.describe(locale, () => {
    test('doctor-letter decision tree resolves case and renders infobox', async ({
      page,
    }) => {
      const translations = await loadFormpackTranslations(locale);
      await openFreshDoctorLetter(page);
      await switchLocale(page, locale);
      await openDecisionTree(page);
      await answerDecisionTreeCase3(page);
      await waitForResolvedText(
        page,
        translations['doctor-letter.case.3.paragraph'],
      );

      await expect(page.locator('#root_decision_q1')).toBeVisible();
      await expect(page.locator('#root_decision_q2')).toBeVisible();
      await expect(page.locator('#root_decision_q3')).toBeVisible();
      await expect(page.locator('#root_decision_q4')).toBeVisible();
      await expect(page.locator('#root_decision_resolvedCaseText')).toBeVisible();

      await expect(page.locator('#root_decision_q5')).toHaveCount(0);
      await expect(page.locator('#root_decision_q6')).toHaveCount(0);
      await expect(page.locator('#root_decision_q7')).toHaveCount(0);
      await expect(page.locator('#root_decision_q8')).toHaveCount(0);

      const infoBox = page.locator('.info-box[role="note"]');
      await expect(infoBox).toBeVisible();
      await expect(infoBox).toContainText(
        translations['doctor-letter.infobox.q1'],
      );
    });

    test('doctor-letter docx export works online and offline', async ({
      page,
      context,
    }) => {
      await openFreshDoctorLetter(page);
      await switchLocale(page, locale);

      const { docxSection, exportButton } = await waitForDocxExportReady(page);
      const onlineDownload = await exportDocxAndExpectSuccess(
        docxSection,
        exportButton,
      );
      expect(onlineDownload.suggestedFilename()).toMatch(/\.docx$/i);
      const onlinePath = await onlineDownload.path();
      expect(onlinePath).not.toBeNull();
      const onlineStats = await stat(onlinePath as string);
      expect(onlineStats.size).toBeGreaterThan(5_000);

      await context.setOffline(true);
      const offlineDownload = await exportDocxAndExpectSuccess(
        docxSection,
        exportButton,
      );
      expect(offlineDownload.suggestedFilename()).toMatch(/\.docx$/i);
      const offlinePath = await offlineDownload.path();
      expect(offlinePath).not.toBeNull();
      const offlineStats = await stat(offlinePath as string);
      expect(offlineStats.size).toBeGreaterThan(5_000);
      await context.setOffline(false);
    });
  });
}

test('doctor-letter clears hidden fields when branch changes and JSON export stays clean', async ({
  page,
}) => {
  const translations = await loadFormpackTranslations('en');
  await openFreshDoctorLetter(page);
  await switchLocale(page, 'en');
  await openDecisionTree(page);
  await answerDecisionTreeCase3(page);
  await waitForResolvedText(
    page,
    translations['doctor-letter.case.3.paragraph'],
  );

  await page.locator('input[name="root_decision_q3"][value="no"]').check();
  await expect(page.locator('#root_decision_q4')).toHaveCount(0);
  await expect(page.locator('#root_decision_q5')).toBeVisible();
  await page.locator('#root_decision_q5').selectOption('Other cause');
  await waitForResolvedText(
    page,
    translations['doctor-letter.case.10.paragraph'],
  );

  const recordId = await getActiveRecordIdStable(page);
  await waitForRecordById(page, recordId);
  await waitForRecordField(
    page,
    recordId,
    (record) => record?.data?.decision?.q4 ?? null,
    null,
  );
  await waitForRecordField(
    page,
    recordId,
    (record) => record?.data?.decision?.q5 ?? null,
    'Other cause',
  );

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
  const contents = await readFile(filePath as string, 'utf-8');
  const payload = JSON.parse(contents) as {
    formpack?: { id?: string };
    record?: { locale?: string };
    locale?: string;
    data?: { decision?: Record<string, unknown> };
  };

  expect(payload.formpack?.id).toBe(FORM_PACK_ID);
  expect(payload.locale).toBe('en');
  expect(payload.record?.locale).toBe('en');
  expect(payload.data?.decision).not.toHaveProperty('q4');
  expect(payload.data?.decision?.q5).toBe('Other cause');
});
