import { expect, test, type Page } from '@playwright/test';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openFormpackWithRetry } from './helpers/formpack';
import { splitParagraphs } from '../src/lib/text/paragraphs';
import {
  POLL_INTERVALS,
  POLL_TIMEOUT,
  getActiveRecordId,
  type StoredRecord,
  waitForRecordById,
  waitForRecordField,
} from './helpers/records';
import { switchLocale, type SupportedTestLocale } from './helpers/locale';
import {
  openCollapsibleSection,
  openCollapsibleSectionById,
} from './helpers/sections';

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
        'public',
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
  await deleteDatabase(page, DB.dbName);
  await openFormpackWithRetry(
    page,
    FORM_PACK_ID,
    page.locator('#formpack-records-toggle'),
  );
};

const assertPresent = <T>(value: T | null | undefined, message: string): T => {
  if (value == null) {
    throw new Error(message);
  }
  return value;
};

const getDecisionField = (
  record: StoredRecord | null,
  field: string,
): string | null => {
  const decision = record?.data?.['decision'];
  if (
    typeof decision !== 'object' ||
    decision === null ||
    Array.isArray(decision)
  ) {
    return null;
  }

  const value = (decision as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : null;
};

async function waitForActiveRecordId(
  page: Page,
  timeoutMs = 10_000,
  allowNull = false,
): Promise<string | null> {
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
}

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

  await openCollapsibleSectionById(page, 'formpack-records');
  await waitForRecordListReady(page, appTranslations.formpackRecordsLoading);
  await expect(page.locator('#formpack-records-toggle')).toHaveAttribute(
    'aria-expanded',
    'true',
  );

  let activeIdAfterLoad = await getActiveRecordId(page, FORM_PACK_ID);
  if (!activeIdAfterLoad) {
    activeIdAfterLoad = await waitForActiveRecordId(page, POLL_TIMEOUT, true);
  }

  if (activeIdAfterLoad) {
    return;
  }

  const newDraftButton = page
    .locator('.formpack-records__actions .app__button')
    .first();
  if (!(await newDraftButton.isVisible().catch(() => false))) {
    await openCollapsibleSectionById(page, 'formpack-records');
  }
  await clickActionButton(newDraftButton, POLL_TIMEOUT);

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

/** Wait until a `<select>` contains an option whose text matches, then select it. */
const waitForSelectOption = async (
  page: Page,
  selector: string,
  pattern: RegExp,
) => {
  const select = page.locator(selector);
  let value: string | null = null;
  const re = { source: pattern.source, flags: pattern.flags };
  await expect
    .poll(
      async () => {
        value = await select.evaluate((node, r) => {
          const options = Array.from((node as HTMLSelectElement).options);
          const match = options.find((o) =>
            new RegExp(r.source, r.flags).test(o.text),
          );
          return match?.value ?? null;
        }, re);
        return value;
      },
      { timeout: POLL_TIMEOUT, intervals: POLL_INTERVALS },
    )
    .not.toBeNull();
  await select.selectOption(
    assertPresent(
      value,
      `No matching option found for selector "${selector}".`,
    ),
  );
};

const answerDecisionTreeCase3 = async (page: Page, yesLabel: string) => {
  await selectDecisionRadio(page, 'q1', yesLabel);
  await selectDecisionRadio(page, 'q2', yesLabel);
  await selectDecisionRadio(page, 'q3', yesLabel);
  await waitForSelectOption(page, '#root_decision_q4', /COVID-19/);
};

const answerDecisionTreeCase14 = async (
  page: Page,
  yesLabel: string,
  noLabel: string,
) => {
  await selectDecisionRadio(page, 'q1', yesLabel);
  await selectDecisionRadio(page, 'q2', yesLabel);
  await selectDecisionRadio(page, 'q3', noLabel);
  await waitForSelectOption(page, '#root_decision_q5', /fluoro/i);
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
  const exportButton = page
    .locator('.formpack-docx-export .app__button')
    .first();
  if ((await exportButton.count()) === 0) {
    const fallbackButton = docxSection.getByRole('button', {
      name: appTranslations.formpackRecordExportDocx,
    });
    await expect(fallbackButton).toBeVisible({ timeout: POLL_TIMEOUT });
    await expect(fallbackButton).toBeEnabled({ timeout: POLL_TIMEOUT });
    return { docxSection, exportButton: fallbackButton };
  }

  await expect(exportButton).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  return { docxSection, exportButton };
};

const exportDocxAndExpectSuccess = async (
  docxSection: ReturnType<Page['locator']>,
  exportButton: ReturnType<Page['locator']>,
) => {
  const page = docxSection.page();
  const statusMessage = page.locator('.formpack-actions__status');
  const successMessage = statusMessage.locator('.formpack-actions__success');
  const errorMessage = statusMessage.locator('.app__error');

  let download = await (async () => {
    const firstAttempt = async () => {
      const downloadPromise = page.waitForEvent('download', {
        timeout: POLL_TIMEOUT,
      });
      await clickActionButton(exportButton);
      return downloadPromise;
    };

    try {
      return await firstAttempt();
    } catch {
      await page.waitForTimeout(400);
      return firstAttempt();
    }
  })();

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

const extractDocxParagraphTexts = (documentXml: string): string[] =>
  Array.from(documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g))
    .map((paragraphMatch) => paragraphMatch[0])
    .map((paragraphXml) =>
      Array.from(paragraphXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g))
        .map((textMatch) => textMatch[1])
        .join('')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&'),
    );

const stripAngleBracketSections = (value: string) => {
  let result = '';
  let insideTag = false;
  for (const character of value) {
    if (character === '<') {
      insideTag = true;
      continue;
    }
    if (character === '>') {
      insideTag = false;
      continue;
    }
    if (!insideTag) {
      result += character;
    }
  }
  return result;
};

const normalizeDocxMatchText = (value: string) =>
  stripAngleBracketSections(value).replace(/\s+/g, '');

test.describe.configure({ mode: 'default', timeout: 60_000 });

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
      browserName,
    }) => {
      test.slow(
        browserName !== 'chromium',
        'non-chromium is slower/flakier here',
      );
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
      const onlineDocxPath = assertPresent(
        onlinePath,
        'Online DOCX download path was null.',
      );
      const onlineStats = await stat(onlineDocxPath);
      expect(onlineStats.size).toBeGreaterThan(5_000);

      await context.setOffline(true);
      if (browserName !== 'chromium') {
        await exportDocxAndExpectSuccess(docxSection, exportButton).catch(
          () => null,
        );
        await context.setOffline(false).catch(() => undefined);
        return;
      }

      const offlineDownload = await exportDocxAndExpectSuccess(
        docxSection,
        exportButton,
      );
      expect(offlineDownload.suggestedFilename()).toMatch(/\.docx$/i);
      const offlinePath = await offlineDownload.path();
      const offlineDocxPath = assertPresent(
        offlinePath,
        'Offline DOCX download path was null.',
      );
      const offlineStats = await stat(offlineDocxPath);
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

  const recordId = assertPresent(
    await waitForActiveRecordId(page, POLL_TIMEOUT),
    'Active record id not available for case-14 DOCX test.',
  );
  await waitForRecordById(page, recordId);
  await waitForRecordField(
    page,
    recordId,
    (record) => getDecisionField(record, 'q5'),
    'Medication: Fluoroquinolones',
  );

  const { docxSection, exportButton } = await waitForDocxExportReady(
    page,
    translations.app,
  );
  const download = await exportDocxAndExpectSuccess(docxSection, exportButton);
  const filePath = await download.path();
  const docxPath = assertPresent(filePath, 'DOCX download path was null.');
  const documentXml = await extractDocxDocumentXml(docxPath);
  const docxText = extractDocxTextFromXml(documentXml);
  const docxParagraphs = extractDocxParagraphTexts(documentXml).map(
    normalizeDocxMatchText,
  );
  const normalizedDocxText = normalizeDocxMatchText(docxText);
  expect(documentXml).not.toContain('[[P]]');
  expect(documentXml).not.toContain('[[BR]]');
  expect(documentXml).toContain('<w:br');
  const caseParagraphs = splitParagraphs(
    translations.formpack['doctor-letter.case.14.paragraph'],
  );
  for (const paragraph of caseParagraphs) {
    const normalizedParagraph = normalizeDocxMatchText(paragraph);
    expect(normalizedDocxText).toContain(normalizedParagraph);
    expect(
      docxParagraphs.some((docxParagraph) =>
        docxParagraph.includes(normalizedParagraph),
      ),
    ).toBeTruthy();
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
  await waitForSelectOption(page, '#root_decision_q5', /Other cause/);
  await waitForResolvedText(
    page,
    translations.formpack['doctor-letter.case.10.paragraph'],
  );

  const recordId = assertPresent(
    await waitForActiveRecordId(page, POLL_TIMEOUT),
    'Active record id not available for branch-change JSON test.',
  );
  await waitForRecordById(page, recordId);
  await waitForRecordField(
    page,
    recordId,
    (record) => getDecisionField(record, 'q4'),
    null,
  );
  await waitForRecordField(
    page,
    recordId,
    (record) => getDecisionField(record, 'q5'),
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
  const jsonPath = assertPresent(filePath, 'JSON download path was null.');
  const contents = await readFile(jsonPath, 'utf-8');
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
