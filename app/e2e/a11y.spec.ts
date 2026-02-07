import { expect, test, type Locator, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { expectNoSeriousA11yViolations } from './helpers/a11y';

const DB_NAME = 'mecfs-paperwork';
const FORMPACK_ID = 'doctor-letter';
const POLL_TIMEOUT = 20_000;
const DOCTOR_LETTER_A11Y_EXCLUSIONS = [
  '#root_doctor_title',
  '#root_doctor_gender',
  '.info-box a[href*="praxisleitfaden.mecfs.de"]',
  '.info-box a[href$="/icc"]',
];

const tabUntilFocused = async (
  page: Page,
  locator: Locator,
  maxTabs: number = 20,
) => {
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press('Tab');
    const isFocused = await locator.evaluate(
      (element) => element === document.activeElement,
    );
    if (isFocused) {
      return;
    }
  }

  throw new Error('Unable to focus target element via keyboard tabbing.');
};

const expectFocusVisible = async (locator: Locator) => {
  await expect
    .poll(() =>
      locator.evaluate((element) => element.matches(':focus-visible')),
    )
    .toBe(true);
};

test.describe('a11y baseline', () => {
  test('home route has no serious/critical violations', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'A11y baseline is gated on Chromium for stability.',
    );

    await deleteDatabase(page, DB_NAME);
    await page.goto('/');
    await expectNoSeriousA11yViolations(page, { routeLabel: '/' });
  });

  test('formpacks route has no serious/critical violations', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'A11y baseline is gated on Chromium for stability.',
    );

    await deleteDatabase(page, DB_NAME);
    await page.goto('/formpacks');
    await expectNoSeriousA11yViolations(page, { routeLabel: '/formpacks' });
  });

  test('doctor-letter route has no serious/critical violations', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'A11y baseline is gated on Chromium for stability.',
    );

    await deleteDatabase(page, DB_NAME);
    await page.goto(`/formpacks/${FORMPACK_ID}`);
    await expect(page.locator('.formpack-detail')).toBeVisible({
      timeout: POLL_TIMEOUT,
    });
    await expectNoSeriousA11yViolations(page, {
      routeLabel: `/formpacks/${FORMPACK_ID}`,
      // NOTE: These are known legacy issues in upstream/embedded rendering.
      // Keep exclusions as narrow selectors so new regressions still fail CI.
      exclude: DOCTOR_LETTER_A11Y_EXCLUSIONS,
    });
  });

  test('keyboard smoke reaches primary actions with visible focus', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Keyboard smoke is gated on Chromium for stability.',
    );

    await deleteDatabase(page, DB_NAME);
    await page.goto('/');

    const feedbackLink = page.getByRole('link', {
      name: /feedback|rückmeldung|rueckmeldung/i,
    });
    const localeSelect = page.locator('#locale-select');
    const themeSelect = page.locator('#theme-select');

    await expect(feedbackLink).toBeVisible();
    await expect(localeSelect).toBeVisible();
    await expect(themeSelect).toBeVisible();

    await tabUntilFocused(page, feedbackLink);
    await expectFocusVisible(feedbackLink);

    await tabUntilFocused(page, localeSelect);
    await expectFocusVisible(localeSelect);

    await tabUntilFocused(page, themeSelect);
    await expectFocusVisible(themeSelect);
  });
});
