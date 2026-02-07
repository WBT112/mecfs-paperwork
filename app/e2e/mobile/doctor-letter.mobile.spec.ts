import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { deleteDatabase } from '../helpers';
import { clickActionButton } from '../helpers/actions';
import { switchLocale } from '../helpers/locale';
import { POLL_TIMEOUT } from '../helpers/records';
import { openCollapsibleSection } from '../helpers/sections';

const FORM_PACK_ID = 'doctor-letter';
const DB_NAME = 'mecfs-paperwork';

const loadTranslations = async () => {
  const [formpackContents, appContents] = await Promise.all([
    readFile(
      path.resolve(
        process.cwd(),
        'public',
        'formpacks',
        FORM_PACK_ID,
        'i18n',
        'en.json',
      ),
      'utf-8',
    ),
    readFile(
      path.resolve(process.cwd(), 'src', 'i18n', 'resources', 'en.json'),
      'utf-8',
    ),
  ]);

  return {
    formpack: JSON.parse(formpackContents) as Record<string, string>,
    app: JSON.parse(appContents) as Record<string, string>,
  };
};

const openFreshDoctorLetter = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);
  await page.goto(`/formpacks/${FORM_PACK_ID}`);
};

const answerDecisionTreeCase3 = async (page: Page, yesLabel: string) => {
  const q1 = page.locator('#root_decision_q1');
  await expect(q1).toBeVisible({ timeout: POLL_TIMEOUT });
  await q1.getByRole('radio', { name: yesLabel }).check();
  await page
    .locator('#root_decision_q2')
    .getByRole('radio', { name: yesLabel })
    .check();
  await page
    .locator('#root_decision_q3')
    .getByRole('radio', { name: yesLabel })
    .check();
  const select = page.locator('#root_decision_q4');
  let covidOptionValue: string | null = null;
  await expect
    .poll(
      async () => {
        covidOptionValue = await select.evaluate((node) => {
          const options = Array.from((node as HTMLSelectElement).options);
          const covidOption = options.find((option) =>
            /covid/i.test(option.textContent ?? ''),
          );
          return covidOption?.value ?? null;
        });
        return covidOptionValue;
      },
      { timeout: POLL_TIMEOUT },
    )
    .not.toBeNull();
  await select.selectOption(covidOptionValue as string);
};

const waitForResolvedText = async (page: Page) => {
  const resolved = page.locator('#root_decision_resolvedCaseText');
  await expect(resolved).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect
    .poll(async () => (await resolved.inputValue()).trim(), {
      timeout: POLL_TIMEOUT,
    })
    .not.toBe('');
};

test('doctor-letter critical path @mobile', async ({ page }) => {
  test.setTimeout(60_000);
  const translations = await loadTranslations();

  await openFreshDoctorLetter(page);
  await switchLocale(page, 'en');

  await expect(page.locator('.formpack-form')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
  await answerDecisionTreeCase3(
    page,
    translations.formpack['doctor-letter.common.yes'],
  );

  await waitForResolvedText(page);

  await openCollapsibleSection(
    page,
    new RegExp(translations.app.formpackDocumentPreviewHeading, 'i'),
  );

  const preview = page.locator('.formpack-document-preview');
  await expect(preview).toBeVisible();
  const previewBox = await preview.boundingBox();
  expect(previewBox?.height ?? 0).toBeGreaterThan(0);
  expect(previewBox?.width ?? 0).toBeGreaterThan(0);

  await expect(preview).toContainText(
    /doctor-letter\.case\.3\.paragraph|G93\.30/i,
  );

  const docxSection = page.locator('.formpack-docx-export');
  await expect(docxSection).toBeVisible();
  const exportButton = docxSection.getByRole('button', {
    name: translations.app.formpackRecordExportDocx,
  });
  await expect(exportButton).toBeEnabled();

  const downloadPromise = page.waitForEvent('download');
  await clickActionButton(exportButton);
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.docx$/i);
});
