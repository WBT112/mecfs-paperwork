import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from '../helpers';
import { openFormpackWithRetry } from '../helpers/formpack';
import { switchLocale } from '../helpers/locale';
import { openCollapsibleSectionById } from '../helpers/sections';

const DB_NAME = 'mecfs-paperwork';
const FORM_PACK_ID = 'offlabel-antrag';
const OFFLABEL_INTRO_CHECKBOX_LABEL =
  /Ich habe verstanden|Habe verstanden, Nutzung auf eigenes Risiko|I understand, use at my own risk/i;

const acceptIntroGate = async (page: Page) => {
  const introHeading = page.getByRole('heading', { name: /hinweise/i });
  await expect(introHeading).toBeVisible({ timeout: 20_000 });

  await page.getByLabel(OFFLABEL_INTRO_CHECKBOX_LABEL).check({ force: true });
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

const setTheme = async (page: Page, theme: 'dark' | 'light') => {
  const themeSelect = page.locator('#theme-select');
  await expect(themeSelect).toBeVisible({ timeout: 20_000 });
  await themeSelect.selectOption(theme);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
};

const openPart1Preview = async (page: Page) => {
  await openCollapsibleSectionById(page, 'formpack-document-preview');
  await page.getByRole('tab', { name: /part 1/i }).click();
};

test.describe('offlabel workflow preview regressions @mobile', () => {
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

  test('adds point 7 for standard medication when §2 checkbox is enabled @mobile', async ({
    page,
  }) => {
    await selectDrugByLabelText(page, 'Ivabradin');
    await page
      .getByLabel(
        /Hilfsweise gleichzeitig Antrag nach § 2 Abs\. 1a SGB V stellen/i,
      )
      .check({ force: true });

    await openPart1Preview(page);
    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(/Punkt 7:/i);
    await expect(preview).toContainText(/§ 2 Abs\. 1a SGB V/i);
    await expect(preview).toContainText(/Punkt 10:/i);
  });

  test('other path (en + light) uses direct §2 wording on mobile @mobile', async ({
    page,
  }) => {
    await switchLocale(page, 'en');
    await setTheme(page, 'light');
    await selectDrugByValue(page, 'other');
    await page.locator('#root_request_otherDrugName').fill('Midodrine');
    await page
      .locator('#root_request_otherIndication')
      .fill('Orthostatic intolerance');
    await page
      .locator('#root_request_otherTreatmentGoal')
      .fill('Improved orthostatic stability');
    await page.locator('#root_request_otherDose').fill('2.5 mg morning');
    await page.locator('#root_request_otherDuration').fill('12 weeks');
    await page
      .locator('#root_request_otherMonitoring')
      .fill('Heart rate and blood pressure checks');

    await openPart1Preview(page);
    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(/Punkt 7:/i);
    await expect(preview).toContainText(
      /Punkt 7: Ich beantrage eine Genehmigung nach § 2 Abs\. 1a SGB V\./i,
    );
    await expect(preview).toContainText(/Punkt 9:/i);
    await expect(preview).not.toContainText(/Punkt 10:/i);
  });

  test('multi-indication medications use the selected indication on mobile @mobile', async ({
    page,
  }) => {
    await switchLocale(page, 'en');
    await selectDrugByValue(page, 'vortioxetine');
    await selectIndicationByLabelText(page, 'depressive symptoms');
    await openPart1Preview(page);

    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(
      /Long\/Post-COVID mit depressiven Symptomen/i,
    );
    await expect(preview).not.toContainText(/und\/oder/i);
  });

  test('clears other-only standard-of-care text from preview after switching back to standard medication @mobile', async ({
    page,
  }) => {
    const otherOnlyText = 'E2E-OTHER-STANDARD-CARE-TEXT-MOBILE';

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
      .locator('#root_request_standardOfCareTriedFreeText')
      .fill(otherOnlyText);

    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await openPart1Preview(page);
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(otherOnlyText);
    await expect(preview).toContainText(/Punkt 9:/i);

    await selectDrugByLabelText(page, 'Ivabradin');

    await expect(preview).not.toContainText(otherOnlyText);
    await expect(preview).not.toContainText(/Punkt 9:/i);
    await expect(preview).toContainText(/Punkt 10:/i);
  });
});
