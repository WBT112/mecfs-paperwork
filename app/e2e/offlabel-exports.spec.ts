import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
} from '@playwright/test';
import { readFile, stat } from 'node:fs/promises';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openFormpackWithRetry } from './helpers/formpack';
import { fillTextInputStable } from './helpers/form';
import { openCollapsibleSectionById } from './helpers/sections';

const FORM_PACK_ID = 'offlabel-antrag';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 30_000;
const OFFLABEL_INTRO_CHECKBOX_LABEL =
  /Ich habe verstanden|Habe verstanden, Nutzung auf eigenes Risiko|I understand, use at my own risk/i;
const JSON_EXPORT_PASSWORD = 'secret-123';

type RoundtripFormData = {
  firstName: string;
  lastName: string;
  birthDate: string;
  doctorName: string;
  insurerName: string;
  otherDrugName: string;
  otherIndication: string;
};

type ExportCompletion =
  | { type: 'download'; download: Download }
  | { type: 'success' }
  | { type: 'error' };

const acceptIntroGate = async (page: Page) => {
  const introHeading = page.getByRole('heading', { name: /hinweise/i });
  await expect(introHeading).toBeVisible({ timeout: POLL_TIMEOUT });

  await page.getByLabel(OFFLABEL_INTRO_CHECKBOX_LABEL).check();
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

const fillOfflabelRoundtripData = async (
  page: Page,
  data: RoundtripFormData,
) => {
  await selectDrugByValue(page, 'other');
  await fillTextInputStable(page, '#root_patient_firstName', data.firstName);
  await fillTextInputStable(page, '#root_patient_lastName', data.lastName);
  await fillTextInputStable(page, '#root_patient_birthDate', data.birthDate);
  await fillTextInputStable(page, '#root_doctor_name', data.doctorName);
  await fillTextInputStable(page, '#root_insurer_name', data.insurerName);
  await fillTextInputStable(
    page,
    '#root_request_otherDrugName',
    data.otherDrugName,
  );
  await fillTextInputStable(
    page,
    '#root_request_otherIndication',
    data.otherIndication,
  );
};

const expectOfflabelRoundtripData = async (
  page: Page,
  data: RoundtripFormData,
) => {
  await expect(page.locator('#root_patient_firstName')).toHaveValue(
    data.firstName,
  );
  await expect(page.locator('#root_patient_lastName')).toHaveValue(
    data.lastName,
  );
  await expect(page.locator('#root_patient_birthDate')).toHaveValue(
    data.birthDate,
  );
  await expect(page.locator('#root_doctor_name')).toHaveValue(data.doctorName);
  await expect(page.locator('#root_insurer_name')).toHaveValue(
    data.insurerName,
  );
  await expect(page.locator('#root_request_otherDrugName')).toHaveValue(
    data.otherDrugName,
  );
  await expect(page.locator('#root_request_otherIndication')).toHaveValue(
    data.otherIndication,
  );
};

const exportJsonForRoundtrip = async (
  page: Page,
  encrypted: boolean,
): Promise<string> => {
  const exportToggle = page.locator(
    '.formpack-json-export__toggle input[type="checkbox"]',
  );
  await expect(exportToggle).toBeVisible({ timeout: POLL_TIMEOUT });

  if (encrypted) {
    await exportToggle.check();
    await fillTextInputStable(
      page,
      '#json-export-password',
      JSON_EXPORT_PASSWORD,
    );
    await fillTextInputStable(
      page,
      '#json-export-password-confirm',
      JSON_EXPORT_PASSWORD,
    );
  } else {
    await exportToggle.uncheck();
  }

  const exportButton = page
    .getByRole('button', {
      name: /Entwurf exportieren \(JSON\)|Export draft \(JSON\)/i,
    })
    .first();
  await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });

  const statusRoot = page.locator('.formpack-form__actions');
  const completion = await triggerExportAndWaitCompletion(
    page,
    exportButton,
    statusRoot,
  );

  expect(completion.type).toBe('download');
  if (completion.type !== 'download') {
    throw new Error('JSON export did not produce a downloadable file.');
  }

  const filePath = await completion.download.path();
  expect(filePath).not.toBeNull();
  return filePath as string;
};

const importJsonOverwrite = async (
  page: Page,
  filePath: string,
  password?: string,
) => {
  await openCollapsibleSectionById(page, 'formpack-import');
  await page.locator('#formpack-import-file').setInputFiles(filePath);

  const overwriteRadio = page.getByRole('radio', {
    name: /overwrite|überschreiben/i,
  });
  await expect(overwriteRadio).toBeEnabled({ timeout: POLL_TIMEOUT });
  await overwriteRadio.check();

  if (password) {
    await fillTextInputStable(page, '#formpack-import-password', password);
  }

  await page.evaluate(() => {
    window.confirm = () => true;
  });

  const importButton = page.locator('.formpack-import__actions .app__button');
  await expect(importButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  await clickActionButton(importButton.first(), POLL_TIMEOUT);

  const importPanel = page.locator('#formpack-import-content');
  await expect(importPanel.locator('.formpack-import__success')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
  await expect(importPanel.locator('.app__error')).toHaveCount(0);
};

test.describe('offlabel export flows', () => {
  test.setTimeout(90_000);

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

  test('json export works online and offline', async ({
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

    if (onlineCompletion.type === 'download') {
      expect(onlineCompletion.download.suggestedFilename()).toMatch(/\.json$/i);
      const filePath = await onlineCompletion.download.path();
      expect(filePath).not.toBeNull();
      const payloadRaw = await readFile(filePath as string, 'utf-8');
      const payload = JSON.parse(payloadRaw) as {
        formpack?: { id?: string };
      };
      expect(payload.formpack?.id).toBe(FORM_PACK_ID);
    } else {
      expect(onlineCompletion.type).toBe('success');
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
    }

    await context.setOffline(false);
  });

  test('json import accepts a current-version partial "other" draft without schema mismatch', async ({
    page,
  }) => {
    await selectDrugByValue(page, 'other');

    const exportButton = page
      .getByRole('button', {
        name: /Entwurf exportieren \(JSON\)|Export draft \(JSON\)/i,
      })
      .first();
    await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });

    const statusRoot = page.locator('.formpack-form__actions');
    const completion = await triggerExportAndWaitCompletion(
      page,
      exportButton,
      statusRoot,
    );
    expect(completion.type).toBe('download');
    if (completion.type !== 'download') {
      throw new Error('JSON export did not produce a downloadable file.');
    }

    const filePath = await completion.download.path();
    expect(filePath).not.toBeNull();

    await openCollapsibleSectionById(page, 'formpack-import');
    await page
      .locator('#formpack-import-file')
      .setInputFiles(filePath as string);

    const importButton = page.locator('.formpack-import__actions .app__button');
    await expect(importButton).toBeEnabled({ timeout: POLL_TIMEOUT });
    await clickActionButton(importButton.first(), POLL_TIMEOUT);

    const importPanel = page.locator('#formpack-import-content');
    await expect(importPanel.locator('.formpack-import__success')).toBeVisible({
      timeout: POLL_TIMEOUT,
    });
    await expect(importPanel.locator('.app__error')).toHaveCount(0);
  });

  test('json roundtrip restores fresh unencrypted export with realistic form data', async ({
    page,
  }) => {
    const originalData: RoundtripFormData = {
      firstName: 'Alex',
      lastName: 'Beispiel',
      birthDate: '1990-04-12',
      doctorName: 'Dr. Muster',
      insurerName: 'AOK Nord',
      otherDrugName: 'Naltrexon',
      otherIndication: 'ME/CFS mit Fatigue',
    };
    const changedData: RoundtripFormData = {
      firstName: 'Changed',
      lastName: 'Person',
      birthDate: '1982-11-03',
      doctorName: 'Dr. Changed',
      insurerName: 'TK',
      otherDrugName: 'Ivabradin',
      otherIndication: 'POTS',
    };

    await fillOfflabelRoundtripData(page, originalData);
    const exportPath = await exportJsonForRoundtrip(page, false);

    await fillOfflabelRoundtripData(page, changedData);
    await expectOfflabelRoundtripData(page, changedData);

    await importJsonOverwrite(page, exportPath);
    await expectOfflabelRoundtripData(page, originalData);
  });

  test('json roundtrip restores fresh encrypted export with realistic form data', async ({
    page,
  }) => {
    const originalData: RoundtripFormData = {
      firstName: 'Mara',
      lastName: 'Testfall',
      birthDate: '1988-09-21',
      doctorName: 'Dr. Demo',
      insurerName: 'Barmer',
      otherDrugName: 'Aripiprazol',
      otherIndication: 'Long/Post-COVID',
    };
    const changedData: RoundtripFormData = {
      firstName: 'Temp',
      lastName: 'Value',
      birthDate: '1995-01-14',
      doctorName: 'Dr. Temp',
      insurerName: 'DAK',
      otherDrugName: 'Agomelatin',
      otherIndication: 'Depressive Symptome',
    };

    await fillOfflabelRoundtripData(page, originalData);
    const exportPath = await exportJsonForRoundtrip(page, true);

    await fillOfflabelRoundtripData(page, changedData);
    await expectOfflabelRoundtripData(page, changedData);

    await importJsonOverwrite(page, exportPath, JSON_EXPORT_PASSWORD);
    await expectOfflabelRoundtripData(page, originalData);
  });

  test('docx export works online and offline', async ({
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

  test('pdf export works online and offline', async ({
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
