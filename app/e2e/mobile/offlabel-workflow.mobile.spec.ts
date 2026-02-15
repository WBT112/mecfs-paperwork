import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from '../helpers';
import { openFormpackWithRetry } from '../helpers/formpack';
import { openCollapsibleSectionById } from '../helpers/sections';

const DB_NAME = 'mecfs-paperwork';
const FORM_PACK_ID = 'offlabel-antrag';

const acceptIntroGate = async (page: Page) => {
  const introHeading = page.getByRole('heading', { name: /hinweise/i });
  await expect(introHeading).toBeVisible({ timeout: 20_000 });

  const introBody = page.locator('.formpack-intro-gate__content');
  await introBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await page
    .getByLabel(/Habe verstanden, Nutzung auf eigenes Risiko/i)
    .check({ force: true });
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

    await page.getByRole('tab', { name: /part 1/i }).click();
    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(/Punkt 7:/i);
    await expect(preview).toContainText(/§ 2 Abs\. 1a SGB V/i);
    await expect(preview).toContainText(/Punkt 10:/i);
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
    await page.getByRole('tab', { name: /part 1/i }).click();
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(otherOnlyText);
    await expect(preview).toContainText(/Punkt 9:/i);

    await selectDrugByLabelText(page, 'Ivabradin');

    await expect(preview).not.toContainText(otherOnlyText);
    await expect(preview).not.toContainText(/Punkt 9:/i);
    await expect(preview).toContainText(/Punkt 10:/i);
  });
});
