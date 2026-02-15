import { expect, type Locator, type Page } from '@playwright/test';

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
