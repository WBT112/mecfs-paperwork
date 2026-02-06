import { expect, test, type Page } from '@playwright/test';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { splitParagraphs } from '../src/lib/text/paragraphs';
import {
  POLL_INTERVALS,
  POLL_TIMEOUT,
  getActiveRecordId,
  waitForRecordById,
  waitForRecordField,
} from './helpers/records';
import { switchLocale, type SupportedTestLocale } from './helpers/locale';
import { openCollapsibleSection } from './helpers/sections';

const FORM_PACK_ID = 'doctor-letter';
const DB = {
  dbName: 'mecfs-paperwork',
  storeName: 'records',
};

const locales: SupportedTestLocale[] = ['de', 'en'];

const stripMarkdown = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const getMarkdownLink = (value: string) => {
  const match = value.match(/\[(.*?)\]\((.*?)\)/);
  if (!match) {
    return null;
  }
  const [, label, href] = match;
  return { label, href };
};

const loadTranslations = async (locale: SupportedTestLocale) => {
  const [formpackContents, appContents] = await Promise.all([
    readFile(
      path.resolve(
        process.cwd(),
        '..',
        'formpacks',
        FORM_PACK_ID,
        'i18n',
        `${locale}.json`,
      ),
      'utf-8',
    ),
    readFile(
      path.resolve(process.cwd(), 'src', 'i18n', 'resources', `${locale}.json`),
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
  await deleteDatabase(page, DB.dbName);
  await page.goto(`/formpacks/${FORM_PACK_ID}`);
};

const waitForActiveRecordId = async (
  page: Page,
  timeoutMs = 10_000,
  allowNull = false,
) => {
  let activeId: string | null = null;
  try {
    await expect
      .poll(
        async () => {
          activeId = await getActiveRecordId(page, FORM_PACK_ID);
          return activeId;
        },
        { timeout: timeoutMs, intervals: POLL_INTERVALS },
      )
      .not.toBeNull();
  } catch (error) {
    if (allowNull) {
      return null;
    }
    throw error;
  }
  if (!activeId) {
    if (allowNull) {
      return null;
    }
    throw new Error('Active record id not available after polling.');
  }
  return activeId;
};

const waitForRecordListReady = async (page: Page, loadingLabel: string) => {
  await page.waitForFunction((label) => {
    const empty = document.querySelector('.formpack-records__empty');
    if (empty) {
      const text = empty.textContent?.toLowerCase() ?? '';
      return !text.includes(label.toLowerCase());
    }
    return true;
  }, loadingLabel);
};

const ensureActiveDraft = async (
  page: Page,
  appTranslations: Record<string, string>,
) => {
  const existingActiveId = await getActiveRecordId(page, FORM_PACK_ID);
  if (existingActiveId) {
    return;
  }

  await openCollapsibleSection(
    page,
    new RegExp(appTranslations.formpackRecordsHeading, 'i'),
  );
  await waitForRecordListReady(page, appTranslations.formpackRecordsLoading);

  let activeIdAfterLoad = await getActiveRecordId(page, FORM_PACK_ID);
  if (!activeIdAfterLoad) {
    activeIdAfterLoad = await waitForActiveRecordId(page, POLL_TIMEOUT, true);
  }

  if (activeIdAfterLoad) {
    return;
  }

  const newDraftButton = page.getByRole('button', {
    name: appTranslations.formpackRecordNew,
  });
  if (await newDraftButton.count()) {
    await newDraftButton.first().click();
  } else {
    await page
      .locator('.formpack-records__actions .app__button')
      .first()
      .click();
  }

  await expect(page.locator('.formpack-form')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
};

const openDecisionTree = async (
  page: Page,
  appTranslations: Record<string, string>,
) => {
  await ensureActiveDraft(page, appTranslations);
  await expect(page.locator('#root_decision_q1')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
};

const selectDecisionRadio = async (
  page: Page,
  fieldId: 'q1' | 'q2' | 'q3',
  label: string,
) => {
  const fieldset = page.locator(`#root_decision_${fieldId}`);
  await expect(fieldset).toBeVisible({ timeout: POLL_TIMEOUT });
  await fieldset.getByRole('radio', { name: label }).check();
};

const answerDecisionTreeCase3 = async (page: Page, yesLabel: string) => {
  await selectDecisionRadio(page, 'q1', yesLabel);
  await selectDecisionRadio(page, 'q2', yesLabel);
  await selectDecisionRadio(page, 'q3', yesLabel);
  await page.locator('#root_decision_q4').selectOption('COVID-19');
};

const answerDecisionTreeCase14 = async (
  page: Page,
  yesLabel: string,
  noLabel: string,
) => {
  await selectDecisionRadio(page, 'q1', yesLabel);
  await selectDecisionRadio(page, 'q2', yesLabel);
  await selectDecisionRadio(page, 'q3', noLabel);
  await page
    .locator('#root_decision_q5')
    .selectOption('Medication: Fluoroquinolones');
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

const waitForDocxExportReady = async (
  page: Page,
  appTranslations: Record<string, string>,
) => {
  const docxSection = page.locator('.formpack-docx-export');
  await expect(docxSection).toBeVisible({ timeout: POLL_TIMEOUT });
  const exportButton = docxSection.getByRole('button', {
    name: appTranslations.formpackRecordExportDocx,
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
  const statusMessage = page.locator('.formpack-actions__status');
  const successMessage = statusMessage.locator('.formpack-actions__success');
  const errorMessage = statusMessage.locator('.app__error');
  await clickActionButton(exportButton);
  const download = await downloadPromise;
  await expect(successMessage).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(errorMessage).toHaveCount(0);
  return download;
};

const extractDocxDocumentXml = async (docxPath: string) => {
  const buffer = await readFile(docxPath);
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) {
    throw new Error('DOCX document.xml was not found in the export.');
  }

  return documentXml;
};

const extractDocxTextFromXml = (documentXml: string) => {
  const textRuns = Array.from(
    documentXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g),
  ).map((match) => match[1]);

  return textRuns
    .join('')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
};

const normalizeDocxMatchText = (value: string) => value.replace(/\s+/g, '');

test.describe.configure({ mode: 'parallel' });

for (const locale of locales) {
  test.describe(locale, () => {
    test('doctor-letter decision tree resolves case and renders infobox', async ({
      page,
    }) => {
      const translations = await loadTranslations(locale);
      await openFreshDoctorLetter(page);
      await switchLocale(page, locale);
      await openDecisionTree(page, translations.app);
      await answerDecisionTreeCase3(
        page,
        translations.formpack['doctor-letter.common.yes'],
      );
      await waitForResolvedText(
        page,
        translations.formpack['doctor-letter.case.3.paragraph'],
      );

      await expect(page.locator('#root_decision_q1')).toBeVisible();
      await expect(page.locator('#root_decision_q2')).toBeVisible();
      await expect(page.locator('#root_decision_q3')).toBeVisible();
      await expect(page.locator('#root_decision_q4')).toBeVisible();
      await expect(
        page.locator('#root_decision_resolvedCaseText'),
      ).toBeVisible();

      await expect(page.locator('#root_decision_q5')).toHaveCount(0);
      await expect(page.locator('#root_decision_q6')).toHaveCount(0);
      await expect(page.locator('#root_decision_q7')).toHaveCount(0);
      await expect(page.locator('#root_decision_q8')).toHaveCount(0);

      const infoBox = page.locator('.info-box[role="note"]');
      await expect(infoBox).toBeVisible();
      const infoBoxMessage = translations.formpack['doctor-letter.infobox.q1'];
      await expect(infoBox).toContainText(stripMarkdown(infoBoxMessage));
      const link = getMarkdownLink(infoBoxMessage);
      if (link) {
        await expect(
          infoBox.getByRole('link', { name: link.label }),
        ).toHaveAttribute('href', link.href);
      }
    });

    test('doctor-letter preview renders case paragraphs', async ({ page }) => {
      const translations = await loadTranslations(locale);
      await openFreshDoctorLetter(page);
      await switchLocale(page, locale);
      await openDecisionTree(page, translations.app);
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
      const paragraphs = splitParagraphs(caseText);
      for (const paragraph of paragraphs) {
        await expect(preview.getByText(paragraph)).toBeVisible();
      }
      await expect(preview).not.toContainText('[[P]]');
    });

    test('doctor-letter docx export works online and offline', async ({
      page,
      context,
    }) => {
      const translations = await loadTranslations(locale);
      await openFreshDoctorLetter(page);
      await switchLocale(page, locale);
      await ensureActiveDraft(page, translations.app);

      const { docxSection, exportButton } = await waitForDocxExportReady(
        page,
        translations.app,
      );
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

test('doctor-letter resolves Case 14 and exports DOCX with case text', async ({
  page,
}) => {
  const translations = await loadTranslations('en');
  await openFreshDoctorLetter(page);
  await switchLocale(page, 'en');
  await openDecisionTree(page, translations.app);
  await answerDecisionTreeCase14(
    page,
    translations.formpack['doctor-letter.common.yes'],
    translations.formpack['doctor-letter.common.no'],
  );
  await waitForResolvedText(
    page,
    translations.formpack['doctor-letter.case.14.paragraph'],
  );

  const recordId = await waitForActiveRecordId(page, POLL_TIMEOUT);
  await waitForRecordById(page, recordId);
  await waitForRecordField(
    page,
    recordId,
    (record) => record?.data?.decision?.q5 ?? null,
    'Medication: Fluoroquinolones',
  );

  const { docxSection, exportButton } = await waitForDocxExportReady(
    page,
    translations.app,
  );
  const download = await exportDocxAndExpectSuccess(docxSection, exportButton);
  const filePath = await download.path();
  expect(filePath).not.toBeNull();
  const docxPath = filePath as string;
  const documentXml = await extractDocxDocumentXml(docxPath);
  const docxText = extractDocxTextFromXml(documentXml);
  const normalizedDocxText = normalizeDocxMatchText(docxText);
  expect(documentXml).not.toContain('[[P]]');
  expect(documentXml).not.toContain('[[BR]]');
  expect(documentXml).toContain('<w:br');
  const caseParagraphs = splitParagraphs(
    translations.formpack['doctor-letter.case.14.paragraph'],
  );
  for (const paragraph of caseParagraphs) {
    expect(normalizedDocxText).toContain(normalizeDocxMatchText(paragraph));
  }
});

test('doctor-letter clears hidden fields when branch changes and JSON export stays clean', async ({
  page,
}) => {
  const translations = await loadTranslations('en');
  await openFreshDoctorLetter(page);
  await switchLocale(page, 'en');
  await openDecisionTree(page, translations.app);
  await answerDecisionTreeCase3(
    page,
    translations.formpack['doctor-letter.common.yes'],
  );
  await waitForResolvedText(
    page,
    translations.formpack['doctor-letter.case.3.paragraph'],
  );

  await selectDecisionRadio(
    page,
    'q3',
    translations.formpack['doctor-letter.common.no'],
  );
  await expect(page.locator('#root_decision_q4')).toHaveCount(0);
  await expect(page.locator('#root_decision_q5')).toBeVisible();
  await page.locator('#root_decision_q5').selectOption('Other cause');
  await waitForResolvedText(
    page,
    translations.formpack['doctor-letter.case.10.paragraph'],
  );

  const recordId = await waitForActiveRecordId(page, POLL_TIMEOUT);
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
  const exportButton = page.getByRole('button', {
    name: translations.app.formpackRecordExportJson,
  });
  await expect(exportButton).toBeEnabled();
  await exportButton.click();

  const download = await downloadPromise;
  const filePath = await download.path();
  expect(filePath).not.toBeNull();
  const contents = await readFile(filePath as string, 'utf-8');
  const payload = JSON.parse(contents) as {
    formpack: { id: string };
    record: { locale: string };
    locale: string;
    data: { decision: Record<string, unknown> };
  };

  expect(payload.formpack?.id).toBe(FORM_PACK_ID);
  expect(payload.locale).toBe('en');
  expect(payload.record?.locale).toBe('en');
  expect(payload.data?.decision).not.toHaveProperty('q4');
  expect(payload.data?.decision?.q5).toBe('Other cause');
});
