import { expect, Locator, Page } from '@playwright/test';

export type InputTarget = string | Locator;

export type FillTextInputStableOptions =
  | {
      /** Overall timeout (ms) for the fill operation. */
      timeout?: number;
      /** Polling intervals used by expect.poll (ms). */
      intervals?: number[];
      /** Number of retry attempts when the input value is overwritten. */
      retries?: number;
      /**
       * Prefer keyboard typing instead of locator.fill. This tends to be more
       * reliable on WebKit for controlled inputs.
       */
      useKeyboard?: boolean;
    }
  | number;

const DEFAULT_TIMEOUT = 20_000;
const DEFAULT_INTERVALS = [50, 100, 200, 500];
const DEFAULT_RETRIES = 3;

const normalizeOptions = (
  options?: FillTextInputStableOptions,
): Required<Exclude<FillTextInputStableOptions, number>> => {
  if (typeof options === 'number') {
    return {
      timeout: options,
      intervals: DEFAULT_INTERVALS,
      retries: DEFAULT_RETRIES,
      useKeyboard: true,
    };
  }

  return {
    timeout: options?.timeout ?? DEFAULT_TIMEOUT,
    intervals: options?.intervals ?? DEFAULT_INTERVALS,
    retries: options?.retries ?? DEFAULT_RETRIES,
    useKeyboard: options?.useKeyboard ?? true,
  };
};

const resolveTarget = (page: Page, target: InputTarget): Locator =>
  typeof target === 'string' ? page.locator(target) : target;

const selectAllShortcut = () =>
  process.platform === 'darwin' ? 'Meta+A' : 'Control+A';

const trySetValue = async (
  page: Page,
  input: Locator,
  value: string,
  timeout: number,
  useKeyboard: boolean,
) => {
  await input.scrollIntoViewIfNeeded();
  await expect(input).toBeVisible({ timeout });
  await expect(input).toBeEnabled({ timeout });

  // Some controlled inputs only commit changes after focus/blur.
  await input.click({ timeout, clickCount: 3 });

  if (useKeyboard) {
    await page.keyboard.press(selectAllShortcut());
    await page.keyboard.type(value, { delay: 10 });
  } else {
    await input.fill(value, { timeout });
  }

  // Encourage frameworks to commit state.
  await input.dispatchEvent('input');
  await input.dispatchEvent('change');
  await input.evaluate((el) => (el as HTMLElement).blur());

  // Tab is a reliable blur in WebKit; ignore failures if element disappears.
  try {
    await page.keyboard.press('Tab');
  } catch {
    // no-op
  }
};

export const fillTextInputStable = async (
  page: Page,
  target: InputTarget,
  value: string,
  options?: FillTextInputStableOptions,
) => {
  const { timeout, intervals, retries, useKeyboard } = normalizeOptions(options);
  const input = resolveTarget(page, target);

  let lastSeen = '';
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      await trySetValue(page, input, value, timeout, useKeyboard);

      await expect
        .poll(async () => input.inputValue(), { timeout, intervals })
        .toBe(value);

      return;
    } catch (err) {
      lastError = err;
      try {
        lastSeen = await input.inputValue();
      } catch {
        lastSeen = '';
      }

      // Give the app a brief chance to settle before retrying.
      await page.waitForTimeout(150);
    }
  }

  throw new Error(
    `fillTextInputStable: failed to set value after ${retries} attempts. ` +
      `Expected "${value}", last seen "${lastSeen}". ` +
      (lastError instanceof Error ? `Last error: ${lastError.message}` : ''),
  );
};
