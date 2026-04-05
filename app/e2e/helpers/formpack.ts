import { expect, type Locator, type Page } from '@playwright/test';
import { clickActionButton } from './actions';
import { getActiveRecordId } from './records';
import { openCollapsibleSectionById } from './sections';

const MANIFEST_ERROR_PATTERN = /unable to reach the formpack manifest/i;

const isReady = async (locator: Locator, timeout: number) =>
  locator.isVisible({ timeout }).catch(() => false);

/**
 * Retries opening a formpack route because WebKit occasionally lands on
 * a transient manifest-load error page.
 */
export const openFormpackWithRetry = async (
  page: Page,
  formpackId: string,
  readyLocator: Locator,
  options?: {
    attempts?: number;
    readyTimeoutMs?: number;
    retryDelayMs?: number;
  },
) => {
  const attempts = options?.attempts ?? 5;
  const readyTimeoutMs = options?.readyTimeoutMs ?? 15_000;
  const retryDelayMs = options?.retryDelayMs ?? 500;
  const manifestLoadError = page.getByText(MANIFEST_ERROR_PATTERN);
  const route = `/formpacks/${formpackId}`;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await page.goto(route);

    if (await isReady(readyLocator, readyTimeoutMs)) {
      return;
    }

    const hasManifestError = await manifestLoadError
      .isVisible({ timeout: 1_000 })
      .catch(() => false);

    if (!hasManifestError || attempt === attempts) {
      break;
    }

    await page.waitForTimeout(retryDelayMs * attempt);
  }

  await expect(
    readyLocator,
    `Failed to load formpack "${formpackId}" after ${attempts} attempts.`,
  ).toBeVisible({ timeout: readyTimeoutMs });
};

export const acceptFormpackIntroGate = async (
  page: Page,
  options?: {
    checkboxLabel?: string | RegExp;
    continueButtonLabel?: string | RegExp;
    timeoutMs?: number;
    formSelector?: string;
  },
) => {
  const timeoutMs = options?.timeoutMs ?? 20_000;
  const formSelector = options?.formSelector ?? '.formpack-form';
  const introGate = page.locator('.formpack-intro-gate');
  const readiness = await expect
    .poll(
      async () => {
        const hasIntroGate = await introGate.isVisible().catch(() => false);
        if (hasIntroGate) {
          return 'intro';
        }

        const hasForm = await page
          .locator(formSelector)
          .isVisible()
          .catch(() => false);
        return hasForm ? 'form' : 'pending';
      },
      {
        timeout: timeoutMs,
        message: `Timed out waiting for intro gate or form "${formSelector}" to become visible.`,
      },
    )
    .not.toBe('pending')
    .then(async () => {
      const hasIntroGate = await introGate.isVisible().catch(() => false);
      return hasIntroGate ? 'intro' : 'form';
    });

  if (readiness === 'form') {
    await expect(page.locator(formSelector)).toBeVisible({
      timeout: timeoutMs,
    });
    return;
  }

  const checkbox = page.getByLabel(
    options?.checkboxLabel ?? /ich habe verstanden|i understand/i,
  );
  const continueButton = page.getByRole('button', {
    name: options?.continueButtonLabel ?? /weiter|continue/i,
  });

  await checkbox.check();
  await clickActionButton(continueButton, timeoutMs);
  await expect(page.locator(formSelector)).toBeVisible({ timeout: timeoutMs });
};

export const ensureActiveRecord = async (
  page: Page,
  options?: {
    formSelector?: string;
    sectionId?: string;
    formpackId?: string;
    timeoutMs?: number;
  },
) => {
  const timeoutMs = options?.timeoutMs ?? 20_000;
  const formSelector = options?.formSelector ?? '.formpack-form';
  const sectionId = options?.sectionId ?? 'formpack-records';
  const form = page.locator(formSelector);
  const hasActiveRecord = options?.formpackId
    ? await getActiveRecordId(page, options.formpackId)
    : null;

  if (hasActiveRecord && (await form.isVisible().catch(() => false))) {
    return;
  }

  await openCollapsibleSectionById(page, sectionId);

  const newDraftButton = page.getByRole('button', {
    name: /new\s*draft|neuer\s*entwurf/i,
  });
  if (
    await newDraftButton
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await clickActionButton(newDraftButton.first(), timeoutMs);
  } else {
    await clickActionButton(
      page.locator('.formpack-records__actions .app__button').first(),
      timeoutMs,
    );
  }

  await expect(form).toBeVisible({ timeout: timeoutMs });

  if (options?.formpackId) {
    await expect
      .poll(() => getActiveRecordId(page, options.formpackId), {
        timeout: timeoutMs,
      })
      .not.toBeNull();
  }
};
