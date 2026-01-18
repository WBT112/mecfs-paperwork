import { expect, Locator, Page } from '@playwright/test';

export type InputTarget = string | Locator;

// Some input types (notably <input type="date">) behave inconsistently across engines
// when values are entered via keyboard simulation. For these, prefer direct assignment.
const DIRECT_VALUE_TYPES = new Set(["date", "datetime-local", "time", "month", "week"]);

const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Some date widgets render as plain text inputs with locale-specific placeholders
 * (e.g. "TT.MM.JJJJ" or "DD/MM/YYYY"). Typing an ISO date into these can lead to
 * garbled values and the app rejecting the input. If we detect an ISO date and a
 * non-ISO placeholder, we type a locale-compatible representation.
 */
const formatIsoDateForPlaceholder = (isoDate: string, placeholder: string | null) => {
  if (!DATE_ISO_RE.test(isoDate)) return isoDate;

  const [yyyy, mm, dd] = isoDate.split('-');
  const p = (placeholder ?? '').trim().toUpperCase();

  const sep = p.includes('.') ? '.' : p.includes('/') ? '/' : p.includes('-') ? '-' : '.';
  const firstTokenMatch = p.match(/(TT|DD|MM|YYYY|JJJJ)/);
  const firstToken = firstTokenMatch?.[1] ?? '';

  if (firstToken === 'TT' || firstToken === 'DD') return `${dd}${sep}${mm}${sep}${yyyy}`;
  if (firstToken === 'MM') return `${mm}${sep}${dd}${sep}${yyyy}`;
  return isoDate;
};

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

  let inputType = '';
  try {
    inputType = (await input.getAttribute('type'))?.toLowerCase() ?? '';
  } catch {
    inputType = '';
  }

  if (DIRECT_VALUE_TYPES.has(inputType)) {
    await input.focus({ timeout });
    await input.evaluate(
      (el, v) => {
        const i = el as HTMLInputElement;
        i.value = v;
        i.dispatchEvent(new Event('input', { bubbles: true }));
        i.dispatchEvent(new Event('change', { bubbles: true }));
      },
      value,
    );

    await input.blur();

    // WebKit sometimes buffers input updates until a focus change.
    try {
      await input.press('Tab', { timeout: 2_000 });
    } catch {
      // ignore
    }

    return await input.inputValue();
  }

  // Some controlled inputs only commit changes after focus/blur.
  await input.click({ timeout, clickCount: 3 });

  if (useKeyboard) {
    await page.keyboard.press(selectAllShortcut());
    const placeholder = await input.getAttribute('placeholder');
    const valueToType = DATE_ISO_RE.test(value)
      ? formatIsoDateForPlaceholder(value, placeholder)
      : value;
    await page.keyboard.type(valueToType, { delay: 10 });
  } else {
    await input.fill(value, { timeout });
  }

  // Encourage frameworks to commit state.
  await input.evaluate((el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
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

      const placeholder = await input.getAttribute('placeholder');
      const expectedTyped = DATE_ISO_RE.test(value)
        ? formatIsoDateForPlaceholder(value, placeholder)
        : value;
      const acceptable = new Set([value, expectedTyped]);

      await expect
        .poll(async () => acceptable.has(await input.inputValue()), { timeout, intervals })
        .toBe(true);

      // One more change event after the stability check can help with some controlled widgets.
      await input.dispatchEvent('change');

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
