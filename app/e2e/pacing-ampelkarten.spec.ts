import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
} from '@playwright/test';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { fillTextInputStable } from './helpers/form';
import {
  acceptFormpackIntroGate,
  ensureActiveRecord,
  openFormpackWithRetry,
} from './helpers/formpack';
import { getActiveRecordId, waitForRecordField } from './helpers/records';

const FORM_PACK_ID = 'pacing-ampelkarten';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 20_000;
const PACING_EDITOR_SELECTOR = '.pacing-editor';
const INTRO_CHECKBOX_LABEL =
  /Ich habe verstanden, wie die Karten bearbeitet, gedruckt und ausgeschnitten werden|I understand how to edit, print, and cut the cards/i;
const CHILD_CAN_DO_VALUE =
  'Heute ist ein guter Tag für kurze Gespräche oder eine kleine Sache zusammen.';
const CUSTOM_CHILD_HINT = 'Heute helfen nur ruhige Vorlese-Minuten.';
const ADULT_VARIANT_LABEL = /Für Erwachsene|For adults/i;
const CHILD_VARIANT_LABEL = /Kindermodus|Child mode/i;

type ExportCompletion =
  | { type: 'download'; download: Download }
  | { type: 'success' }
  | { type: 'error' };

const openPacingAmpelkarten = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);
  await openFormpackWithRetry(
    page,
    FORM_PACK_ID,
    page.getByRole('heading', { name: /hinweise|how to use/i }),
  );
};

const acceptIntroAndOpenForm = async (page: Page) => {
  await acceptFormpackIntroGate(page, {
    checkboxLabel: INTRO_CHECKBOX_LABEL,
    continueButtonLabel: /weiter|continue/i,
    formSelector: PACING_EDITOR_SELECTOR,
    timeoutMs: POLL_TIMEOUT,
  });
  await ensureActiveRecord(page, {
    formpackId: FORM_PACK_ID,
    formSelector: PACING_EDITOR_SELECTOR,
    timeoutMs: POLL_TIMEOUT,
  });
};

const getAdultVariantRadio = (page: Page) =>
  page.getByLabel(ADULT_VARIANT_LABEL);

const getChildVariantRadio = (page: Page) =>
  page.getByLabel(CHILD_VARIANT_LABEL);

const continueToNextStep = async (page: Page) => {
  await clickActionButton(
    page.getByRole('button', { name: /^(weiter|continue)$/i }),
    POLL_TIMEOUT,
  );
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

test.describe('pacing ampelkarten', () => {
  test.setTimeout(90_000);

  test('requires intro acceptance and swaps preset content when switching to child mode', async ({
    page,
  }) => {
    await openPacingAmpelkarten(page);

    const introHeading = page.getByRole('heading', { name: /hinweise/i });
    await expect(introHeading).toBeVisible({ timeout: POLL_TIMEOUT });
    await expect(page.locator('.formpack-form')).toHaveCount(0);

    await acceptIntroAndOpenForm(page);

    const reopenNotesButton = page.getByRole('button', {
      name: /hinweise anzeigen|show notes/i,
    });
    await expect(reopenNotesButton).toBeVisible({ timeout: POLL_TIMEOUT });

    const adultVariantRadio = getAdultVariantRadio(page);
    await expect(adultVariantRadio).toBeChecked();
    await expect(page.locator('.formpack-pdf-export')).toHaveCount(0);
    await expect(
      page.locator(
        '#formpack-document-preview-content .formpack-document-preview',
      ),
    ).toHaveCount(0);

    const childVariantRadio = getChildVariantRadio(page);
    await childVariantRadio.check();
    await expect(childVariantRadio).toBeChecked();

    await continueToNextStep(page);

    await expect(page.locator('#root_child_cards_green_canDo_0')).toHaveValue(
      CHILD_CAN_DO_VALUE,
    );
    await expect(page.locator('#root_child_cards_green_emoji')).toHaveCount(0);
    await expect(page.locator('.formpack-pdf-export')).toHaveCount(0);

    await continueToNextStep(page);
    await continueToNextStep(page);
    await continueToNextStep(page);

    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await expect(page.locator('.formpack-pdf-export')).toBeVisible({
      timeout: POLL_TIMEOUT,
    });
    await expect(preview).toContainText(CHILD_CAN_DO_VALUE);
  });

  test('exports PDF with customized child-mode content online and offline', async ({
    page,
    context,
    browserName,
  }) => {
    test.slow(
      browserName !== 'chromium',
      'non-chromium is slower/flakier here',
    );
    await openPacingAmpelkarten(page);
    await acceptIntroAndOpenForm(page);

    await getChildVariantRadio(page).check();
    await continueToNextStep(page);

    await fillTextInputStable(
      page,
      page.locator('#root_child_cards_green_hint'),
      CUSTOM_CHILD_HINT,
      POLL_TIMEOUT,
    );
    await continueToNextStep(page);
    await continueToNextStep(page);
    await continueToNextStep(page);

    const recordId = await getActiveRecordId(page, FORM_PACK_ID);
    expect(recordId).not.toBeNull();
    if (!recordId) {
      throw new Error('No active record id available for pacing PDF export.');
    }

    await waitForRecordField(
      page,
      recordId,
      (record) => record?.data?.meta?.variant,
      'child',
      { timeout: POLL_TIMEOUT },
    );
    await waitForRecordField(
      page,
      recordId,
      (record) => record?.data?.child?.cards?.green?.hint,
      CUSTOM_CHILD_HINT,
      { timeout: POLL_TIMEOUT },
    );

    const pdfSection = page.locator('.formpack-pdf-export');
    await expect(pdfSection).toBeVisible({ timeout: POLL_TIMEOUT });
    const statusRoot = page.locator('.pacing-editor__export-panel');

    const exportButton = pdfSection.getByRole('button', {
      name: /pdf exportieren|export pdf/i,
    });
    await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });

    const onlineCompletion = await triggerExportAndWaitCompletion(
      page,
      exportButton,
      statusRoot,
    );
    if (onlineCompletion.type === 'download') {
      expect(onlineCompletion.download.suggestedFilename()).toMatch(/\.pdf$/i);
    } else if (onlineCompletion.type === 'error') {
      await expect(statusRoot.locator('.app__error').first()).toBeVisible({
        timeout: POLL_TIMEOUT,
      });
    }
    await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });

    await context.setOffline(true);
    if (browserName !== 'chromium') {
      await page.waitForTimeout(300);
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
    } else if (offlineCompletion.type === 'error') {
      await expect(statusRoot.locator('.app__error').first()).toBeVisible({
        timeout: POLL_TIMEOUT,
      });
    }
    await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });
    await expect(
      page.locator(
        '#formpack-document-preview-content .formpack-document-preview',
      ),
    ).toContainText(CUSTOM_CHILD_HINT);
    await expect(page.locator('.formpack-form')).toContainText(
      CUSTOM_CHILD_HINT,
    );
    await context.setOffline(false);
  });
});
