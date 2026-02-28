import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { openFormpackWithRetry } from './helpers/formpack';
import { switchLocale } from './helpers/locale';
import { openCollapsibleSectionById } from './helpers/sections';

const DB_NAME = 'mecfs-paperwork';
const FORM_PACK_ID = 'offlabel-antrag';
const OFFLABEL_INTRO_CHECKBOX_LABEL =
  /Ich habe verstanden|Habe verstanden, Nutzung auf eigenes Risiko|I understand, use at my own risk/i;

const acceptIntroGate = async (page: Page) => {
  const introHeading = page.getByRole('heading', { name: /hinweise/i });
  await expect(introHeading).toBeVisible({ timeout: 20_000 });

  const acceptanceCheckbox = page.getByLabel(OFFLABEL_INTRO_CHECKBOX_LABEL);
  await acceptanceCheckbox.check();
  await page.getByRole('button', { name: /weiter/i }).click();

  await expect(page.locator('.formpack-form')).toBeVisible({ timeout: 20_000 });
};

const selectDrugByLabelText = async (page: Page, labelSnippet: string) => {
  const select = page.locator('#root_request_drug');
  await expect(select).toBeVisible({ timeout: 20_000 });

  const value = await select.evaluate((node, snippet) => {
    const options = Array.from((node as HTMLSelectElement).options);
    const loweredSnippet = snippet.toLowerCase();
    const match = options.find((option) =>
      option.textContent?.toLowerCase().includes(loweredSnippet),
    );
    return match?.value ?? null;
  }, labelSnippet);

  if (!value) {
    throw new Error(
      `No drug option found for label snippet "${labelSnippet}".`,
    );
  }

  await select.selectOption(value);
};

const selectIndicationByLabelText = async (
  page: Page,
  labelSnippet: string,
) => {
  const select = page.locator('#root_request_selectedIndicationKey');
  await expect(select).toBeVisible({ timeout: 20_000 });

  const value = await select.evaluate((node, snippet) => {
    const options = Array.from((node as HTMLSelectElement).options);
    const loweredSnippet = snippet.toLowerCase();
    const match = options.find((option) =>
      option.textContent?.toLowerCase().includes(loweredSnippet),
    );
    return match?.value ?? null;
  }, labelSnippet);

  if (!value) {
    throw new Error(
      `No indication option found for label snippet "${labelSnippet}".`,
    );
  }

  await select.selectOption(value);
};

const selectDrugByValue = async (page: Page, value: string) => {
  const select = page.locator('#root_request_drug');
  await expect(select).toBeVisible({ timeout: 20_000 });

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

const selectDrugNoEntry = async (page: Page) => {
  const select = page.locator('#root_request_drug');
  await expect(select).toBeVisible({ timeout: 20_000 });

  const hasEmptyOption = await select.evaluate((node) => {
    const options = Array.from((node as HTMLSelectElement).options);
    return options.some((option) => {
      const label = option.textContent?.toLowerCase() ?? '';
      return (
        option.value === '' ||
        label.includes('[medikament wählen]') ||
        label.includes('[select medication]') ||
        label.includes('[keine angabe]') ||
        label.includes('[no entry]')
      );
    });
  });

  if (!hasEmptyOption) {
    throw new Error('No empty medication option found.');
  }

  await select.selectOption('');
};

const selectIndicationConfirmation = async (
  page: Page,
  value: 'yes' | 'no',
) => {
  const confirmationIndex = value === 'yes' ? 0 : 1;
  const confirmationInput = page
    .locator('input[name="root_request_indicationFullyMetOrDoctorConfirms"]')
    .nth(confirmationIndex);
  await expect(confirmationInput).toBeVisible();
  await confirmationInput.check();
};

const expectSelectedDrugLabelContains = async (
  page: Page,
  labelSnippet: string,
) => {
  const select = page.locator('#root_request_drug');
  await expect(select).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(async () =>
      select.evaluate((node) => {
        const selected = (node as HTMLSelectElement).selectedOptions.item(0);
        return selected?.textContent?.toLowerCase() ?? '';
      }),
    )
    .toContain(labelSnippet.toLowerCase());
};

const setTheme = async (page: Page, theme: 'dark' | 'light') => {
  const themeSelect = page.locator('#theme-select');
  await expect(themeSelect).toBeVisible({ timeout: 20_000 });
  await themeSelect.selectOption(theme);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
};

const openPart1Preview = async (page: Page) => {
  await openCollapsibleSectionById(page, 'formpack-document-preview');
  await page.getByRole('tab', { name: /(teil|part)\s*1/i }).click();
};

test.describe('offlabel workflow preview regressions', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await deleteDatabase(page, DB_NAME);
    await openFormpackWithRetry(
      page,
      FORM_PACK_ID,
      page.getByRole('heading', { name: /hinweise/i }),
    );
    await acceptIntroGate(page);
    await openCollapsibleSectionById(page, 'formpack-document-preview');
  });

  test('shows flow status and moves focus to the next relevant field on medication switch', async ({
    page,
  }) => {
    await selectDrugByValue(page, 'ivabradine');
    await expect(
      page.getByText(/Antragsweg: Regulärer Off-Label-Antrag/i),
    ).toBeVisible();

    await selectIndicationConfirmation(page, 'yes');

    await page
      .getByLabel(
        /Hilfsweise gleichzeitig Antrag nach § 2 Abs\. 1a SGB V stellen/i,
      )
      .check();
    await expect(
      page.getByText(
        /Antragsweg: Regulärer Off-Label-Antrag mit hilfsweisem Antrag nach § 2 Abs\. 1a SGB V/i,
      ),
    ).toBeVisible();

    await selectDrugByValue(page, 'other');
    await expect(
      page.getByText(/Antragsweg: Direkter Antrag nach § 2 Abs\. 1a SGB V/i),
    ).toBeVisible();
    await expect(page.locator('#root_request_otherDrugName')).toBeFocused();

    await selectDrugByValue(page, 'agomelatin');
    await expect(
      page.locator('#root_request_selectedIndicationKey'),
    ).toBeFocused();

    await selectDrugByValue(page, 'ivabradine');
    const indicationConfirmationInput = page
      .locator('input[name="root_request_indicationFullyMetOrDoctorConfirms"]')
      .first();
    await expect(indicationConfirmationInput).toBeVisible();
    await expect(indicationConfirmationInput).toBeFocused();
  });

  test('keeps medication empty when selecting [keine Angabe] after standard medication flows', async ({
    page,
  }) => {
    const select = page.locator('#root_request_drug');

    await selectDrugByValue(page, 'vortioxetine');
    await selectIndicationByLabelText(page, 'depressiven Symptomen');
    await expectSelectedDrugLabelContains(page, 'vortiox');

    await selectDrugNoEntry(page);
    await expect(select).toHaveValue('');

    await selectDrugByValue(page, 'agomelatin');
    await selectIndicationByLabelText(page, 'Long-/Post-COVID mit Fatigue');
    await expectSelectedDrugLabelContains(page, 'agomelat');

    await selectDrugNoEntry(page);
    await expect(select).toHaveValue('');
  });

  test('adds §2 wording for standard medication when checkbox is enabled', async ({
    page,
  }) => {
    await selectDrugByLabelText(page, 'Ivabradin');
    await selectIndicationConfirmation(page, 'yes');
    await page
      .getByLabel(
        /Hilfsweise gleichzeitig Antrag nach § 2 Abs\. 1a SGB V stellen/i,
      )
      .check();

    await page.getByRole('tab', { name: /(teil|part)\s*1/i }).click();
    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(/§ 2 Abs\. 1a SGB V/i);
    await expect(preview).toContainText(
      /Hilfsweise beantrage ich Leistungen nach § 2 Abs\. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung\./i,
    );
    await expect(preview).toContainText(
      /Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen/i,
    );
  });

  test('standard path (dark/de) keeps evidence block and excludes §2-only wording', async ({
    page,
  }) => {
    await setTheme(page, 'dark');
    await selectDrugByValue(page, 'ivabradine');
    await openPart1Preview(page);
    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(
      /Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen/i,
    );
    await expect(preview).not.toContainText(
      /Ich beantrage (hilfsweise )?Leistungen nach § 2 Abs\. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung\./i,
    );
    await expect(preview).not.toContainText(
      /Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild/i,
    );
  });

  test('multi-indication medications use the selected indication in preview (de)', async ({
    page,
  }) => {
    await selectDrugByValue(page, 'agomelatin');
    await selectIndicationByLabelText(page, 'Long-/Post-COVID mit Fatigue');
    await openPart1Preview(page);

    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(
      /zur Behandlung von Long-\/Post-COVID mit Fatigue/i,
    );
    await expect(preview).toContainText(
      /Die Diagnose Long-\/Post-COVID ist gesichert \(siehe Befunde\)\. Fatigue ist als Leitsymptom dokumentiert\./i,
    );
    await expect(preview).not.toContainText(/und\/oder/i);
  });

  test('standard path (en + light) adds auxiliary §2 wording and keeps evidence block', async ({
    page,
  }) => {
    await switchLocale(page, 'en');
    await setTheme(page, 'light');
    await selectDrugByValue(page, 'ivabradine');
    await selectIndicationConfirmation(page, 'yes');
    await page.locator('#root_request_applySection2Abs1a').check();

    await openPart1Preview(page);
    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(
      /Hilfsweise stelle ich.*§ 2 Abs\. 1a SGB V/i,
    );
    await expect(preview).toContainText(
      /Hilfsweise beantrage ich Leistungen nach § 2 Abs\. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung\./i,
    );
    await expect(preview).toContainText(
      /Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen/i,
    );
  });

  test('other path (dark/de) uses direct §2 wording and the individual-case evidence block only', async ({
    page,
  }) => {
    await setTheme(page, 'dark');
    await selectDrugByValue(page, 'other');
    await page.locator('#root_request_otherDrugName').fill('Midodrin');
    await page
      .locator('#root_request_otherIndication')
      .fill('Orthostatische Intoleranz');
    await page
      .locator('#root_request_otherTreatmentGoal')
      .fill('Verbesserung Kreislaufstabilität');
    await page.locator('#root_request_otherDose').fill('2,5 mg morgens');
    await page.locator('#root_request_otherDuration').fill('12 Wochen');
    await page
      .locator('#root_request_otherMonitoring')
      .fill('Puls und Blutdruck');
    await page
      .locator('#root_request_otherEvidenceReference')
      .fill('Musterstudie 2024, doi:10.1000/example');

    await openPart1Preview(page);
    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(
      /Ich beantrage Leistungen nach § 2 Abs\. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung\./i,
    );
    await expect(preview).not.toContainText(
      /Hilfsweise beantrage ich Leistungen nach § 2 Abs\. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung\./i,
    );
    await expect(preview).toContainText(
      /Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild/i,
    );
    await expect(preview).not.toContainText(
      /Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen/i,
    );
  });

  test('clears other-only standard-of-care text from preview after switching back to standard medication', async ({
    page,
  }) => {
    const otherOnlyText = 'E2E-OTHER-STANDARD-CARE-TEXT';

    await selectDrugByLabelText(page, 'anderes Medikament');
    await page.locator('#root_request_otherDrugName').fill('Testwirkstoff');
    await page.locator('#root_request_otherIndication').fill('Testindikation');
    await page
      .locator('#root_request_otherTreatmentGoal')
      .fill('Symptomlinderung und Stabilisierung');
    await page.locator('#root_request_otherDose').fill('10 mg täglich');
    await page
      .locator('#root_request_otherDuration')
      .fill('12 Wochen Therapieversuch');
    await page
      .locator('#root_request_otherMonitoring')
      .fill('Kontrollen alle 2 Wochen');
    await page
      .locator('#root_request_otherEvidenceReference')
      .fill('Musterstudie 2024, doi:10.1000/example');
    await page
      .locator('#root_request_standardOfCareTriedFreeText')
      .fill(otherOnlyText);

    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await page.getByRole('tab', { name: /(teil|part)\s*1/i }).click();
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(otherOnlyText);
    await expect(preview).toContainText(
      /Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild/i,
    );

    await selectDrugByLabelText(page, 'Ivabradin');

    await expect(preview).not.toContainText(otherOnlyText);
    await expect(preview).not.toContainText(
      /Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild/i,
    );
    await expect(preview).toContainText(
      /Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen/i,
    );
  });
});
