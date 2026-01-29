import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { deleteDatabase } from '../helpers';
import { clickActionButton } from '../helpers/actions';
import { switchLocale } from '../helpers/locale';
import { POLL_TIMEOUT } from '../helpers/records';
import { openCollapsibleSection } from '../helpers/sections';
import { splitParagraphs } from '../../src/lib/text/paragraphs';

const FORM_PACK_ID = 'doctor-letter';
const DB_NAME = 'mecfs-paperwork';

const loadTranslations = async () => {
  const [formpackContents, appContents] = await Promise.all([
    readFile(
      path.resolve(
        process.cwd(),
        '..',
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
  await page.locator('#root_decision_q4').selectOption('COVID-19');
};

const normalizeCaseText = (input: string) =>
  splitParagraphs(input).join('\n\n');

const waitForResolvedText = async (page: Page, expected: string) => {
  const resolved = page.locator('#root_decision_resolvedCaseText');
  await expect(resolved).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect
    .poll(async () => resolved.inputValue(), { timeout: POLL_TIMEOUT })
    .toBe(normalizeCaseText(expected));
};

test('doctor-letter critical path @mobile', async ({ page }) => {
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

  const caseText = translations.formpack['doctor-letter.case.3.paragraph'];
  await waitForResolvedText(page, caseText);

  await openCollapsibleSection(
    page,
    new RegExp(translations.app.formpackDocumentPreviewHeading, 'i'),
  );

  const preview = page.locator('.formpack-document-preview');
  await expect(preview).toBeVisible();
  const previewBox = await preview.boundingBox();
  expect(previewBox?.height ?? 0).toBeGreaterThan(0);
  expect(previewBox?.width ?? 0).toBeGreaterThan(0);

  const paragraphs = splitParagraphs(caseText);
  for (const paragraph of paragraphs) {
    await expect(preview.getByText(paragraph)).toBeVisible();
  }

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
