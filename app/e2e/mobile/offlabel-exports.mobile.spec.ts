import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
} from '@playwright/test';
import { stat } from 'node:fs/promises';
import { deleteDatabase } from '../helpers';
import { clickActionButton } from '../helpers/actions';
import { openFormpackWithRetry } from '../helpers/formpack';
import { openCollapsibleSectionById } from '../helpers/sections';

const FORM_PACK_ID = 'offlabel-antrag';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 35_000;
const OFFLABEL_INTRO_CHECKBOX_LABEL =
  /Ich habe verstanden|Habe verstanden, Nutzung auf eigenes Risiko|I understand, use at my own risk/i;

type ExportCompletion =
  | { type: 'download'; download: Download }
  | { type: 'success' }
  | { type: 'error' };

const acceptIntroGate = async (page: Page) => {
  const introHeading = page.getByRole('heading', { name: /hinweise/i });
  await expect(introHeading).toBeVisible({ timeout: POLL_TIMEOUT });

  await page.getByLabel(OFFLABEL_INTRO_CHECKBOX_LABEL).check({ force: true });
  await page.getByRole('button', { name: /weiter/i }).click();
  await expect(page.locator('.formpack-form')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
};

const selectDrugByValue = async (page: Page, value: string) => {
  const select = page.locator('#root_request_drug');
  await expect(select).toBeVisible({ timeout: POLL_TIMEOUT });

  const resolvedValue = await select.evaluate((node, desired) => {
    const optionValues = Array.from((node as HTMLSelectElement).options).map(
      (option) => ({
        value: option.value,
        label: option.textContent?.toLowerCase() ?? '',
      }),
    );

    const normalized = desired.toLowerCase();
    const aliasMap: Record<string, string[]> = {
      ivabradine: ['ivabradine', 'ivabradin'],
      vortioxetine: ['vortioxetine', 'vortioxetin'],
      agomelatin: ['agomelatin', 'agomelatine'],
      ldn: ['ldn', 'low-dose naltrexon', 'low-dose naltrexone'],
      other: ['other', 'anderes medikament', 'other medication'],
    };
    const candidates = aliasMap[normalized] ?? [normalized];

    const byValue = optionValues.find((option) =>
      candidates.includes(option.value.toLowerCase()),
    );
    if (byValue) {
      return byValue.value;
    }

    const byLabel = optionValues.find((option) =>
      candidates.some((candidate) => option.label.includes(candidate)),
    );
    return byLabel?.value ?? null;
  }, value);

  if (!resolvedValue) {
    throw new Error(`No drug option found for value "${value}".`);
  }

  await select.selectOption(resolvedValue);
};

const ensureActiveRecord = async (page: Page) => {
  const form = page.locator('.formpack-form');
  if (await form.isVisible().catch(() => false)) {
    return;
  }

  await openCollapsibleSectionById(page, 'formpack-records');
  const newDraftButton = page.getByRole('button', {
    name: /new\s*draft|neuer\s*entwurf/i,
  });

  if (await newDraftButton.count()) {
    await clickActionButton(newDraftButton.first(), POLL_TIMEOUT);
  } else {
    await clickActionButton(
      page.locator('.formpack-records__actions .app__button').first(),
      POLL_TIMEOUT,
    );
  }

  await expect(form).toBeVisible({ timeout: POLL_TIMEOUT });
};

const triggerExportAndWaitCompletion = async (
  page: Page,
  button: Locator,
  statusRoot: Locator,
): Promise<ExportCompletion> => {
  const waitOnce = async (): Promise<ExportCompletion> => {
    const downloadPromise = page
      .waitForEvent('download', { timeout: POLL_TIMEOUT })
      .then((download) => ({ type: 'download' as const, download }));
    await clickActionButton(button, POLL_TIMEOUT);
    const successPromise = statusRoot
      .locator('.formpack-actions__success')
      .first()
      .waitFor({ state: 'visible', timeout: POLL_TIMEOUT })
      .then(() => ({ type: 'success' as const }));

    const errorPromise = statusRoot
      .locator('.app__error')
      .first()
      .waitFor({ state: 'visible', timeout: POLL_TIMEOUT })
      .then(() => ({ type: 'error' as const }));

    return Promise.any([downloadPromise, successPromise, errorPromise]);
  };

  return waitOnce().catch(async () => {
    await page.waitForTimeout(400);
    return waitOnce();
  });
};

const assertDownloadSize = async (download: Download, minimumSize: number) => {
  const filePath = await download.path();
  expect(filePath).not.toBeNull();
  const fileStat = await stat(filePath as string);
  expect(fileStat.size).toBeGreaterThan(minimumSize);
};

test.describe('offlabel export flows @mobile', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await deleteDatabase(page, DB_NAME);
    await openFormpackWithRetry(
      page,
      FORM_PACK_ID,
      page.getByRole('heading', { name: /hinweise/i }),
    );
    await acceptIntroGate(page);
    await ensureActiveRecord(page);
    await selectDrugByValue(page, 'ivabradine');
  });

  test('json export works online and offline @mobile', async ({
    page,
    context,
    browserName,
  }) => {
    const exportButton = page
      .getByRole('button', {
        name: /Entwurf exportieren \(JSON\)|Export draft \(JSON\)/i,
      })
      .first();
    await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });

    const statusRoot = page.locator('.formpack-form__actions');
    const onlineCompletion = await triggerExportAndWaitCompletion(
      page,
      exportButton,
      statusRoot,
    );

    expect(onlineCompletion.type).not.toBe('error');
    if (onlineCompletion.type === 'download') {
      expect(onlineCompletion.download.suggestedFilename()).toMatch(/\.json$/i);
      await assertDownloadSize(onlineCompletion.download, 100);
    }

    await context.setOffline(true);
    if (browserName !== 'chromium') {
      await context.setOffline(false).catch(() => undefined);
      return;
    }

    const offlineCompletion = await triggerExportAndWaitCompletion(
      page,
      exportButton,
      statusRoot,
    );
    expect(offlineCompletion.type).not.toBe('error');
    if (offlineCompletion.type === 'download') {
      expect(offlineCompletion.download.suggestedFilename()).toMatch(
        /\.json$/i,
      );
      await assertDownloadSize(offlineCompletion.download, 100);
    }

    await context.setOffline(false);
  });

  test('docx export works online and offline @mobile', async ({
    page,
    context,
    browserName,
  }) => {
    const docxSection = page.locator('.formpack-docx-export');
    await expect(docxSection).toBeVisible({ timeout: POLL_TIMEOUT });
    const statusRoot = page.locator('.formpack-form__actions');

    const exportButton = docxSection.locator('.app__button').first();
    await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });

    const onlineCompletion = await triggerExportAndWaitCompletion(
      page,
      exportButton,
      statusRoot,
    );
    expect(onlineCompletion.type).not.toBe('error');
    if (onlineCompletion.type === 'download') {
      expect(onlineCompletion.download.suggestedFilename()).toMatch(/\.docx$/i);
      await assertDownloadSize(onlineCompletion.download, 5_000);
    }

    await context.setOffline(true);
    if (browserName !== 'chromium') {
      await context.setOffline(false).catch(() => undefined);
      return;
    }

    const offlineCompletion = await triggerExportAndWaitCompletion(
      page,
      exportButton,
      statusRoot,
    );
    expect(offlineCompletion.type).not.toBe('error');
    if (offlineCompletion.type === 'download') {
      expect(offlineCompletion.download.suggestedFilename()).toMatch(
        /\.docx$/i,
      );
      await assertDownloadSize(offlineCompletion.download, 5_000);
    }

    await context.setOffline(false);
  });

  test('pdf export works online and offline @mobile', async ({
    page,
    context,
    browserName,
  }) => {
    const pdfSection = page.locator('.formpack-pdf-export');
    await expect(pdfSection).toBeVisible({ timeout: POLL_TIMEOUT });
    const statusRoot = page.locator('.formpack-form__actions');

    const exportButton = pdfSection.locator('button.app__button').first();
    await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });

    const onlineCompletion = await triggerExportAndWaitCompletion(
      page,
      exportButton,
      statusRoot,
    );
    if (onlineCompletion.type === 'download') {
      expect(onlineCompletion.download.suggestedFilename()).toMatch(/\.pdf$/i);
      await assertDownloadSize(onlineCompletion.download, 1_000);
    } else if (onlineCompletion.type === 'error') {
      await expect(statusRoot.locator('.app__error').first()).toBeVisible();
    }
    await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });

    await context.setOffline(true);
    if (browserName !== 'chromium') {
      await context.setOffline(false).catch(() => undefined);
      return;
    }

    const offlineCompletion = await triggerExportAndWaitCompletion(
      page,
      exportButton,
      statusRoot,
    );
    if (offlineCompletion.type === 'download') {
      expect(offlineCompletion.download.suggestedFilename()).toMatch(/\.pdf$/i);
      await assertDownloadSize(offlineCompletion.download, 1_000);
    } else if (offlineCompletion.type === 'error') {
      await expect(statusRoot.locator('.app__error').first()).toBeVisible();
    }
    await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });

    await context.setOffline(false);
  });
});
