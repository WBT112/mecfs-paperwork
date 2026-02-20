import { expect, test, type Locator, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { expectNoSeriousA11yViolations } from './helpers/a11y';

const DB_NAME = 'mecfs-paperwork';
const FORMPACK_ID = 'doctor-letter';
const OFFLABEL_FORMPACK_ID = 'offlabel-antrag';
const POLL_TIMEOUT = 60_000;
const OFFLABEL_INTRO_CHECKBOX_LABEL =
  /Ich habe verstanden|Habe verstanden, Nutzung auf eigenes Risiko|I understand, use at my own risk/i;

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

const acceptOfflabelIntroGate = async (page: Page) => {
  const introHeading = page.getByRole('heading', { name: /hinweise/i });
  await expect(introHeading).toBeVisible({ timeout: POLL_TIMEOUT });

  await page
    .getByLabel(OFFLABEL_INTRO_CHECKBOX_LABEL)
    .check({ force: true });
  await page.getByRole('button', { name: /weiter/i }).click();
  await expect(page.locator('.formpack-form')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
};

test.describe('a11y baseline', () => {
  test('home route has no moderate/serious/critical violations', async ({
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

  test('formpacks route has no moderate/serious/critical violations', async ({
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

  test('doctor-letter route has no moderate/serious/critical violations', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'A11y baseline is gated on Chromium for stability.',
    );

    await deleteDatabase(page, DB_NAME);
    await page.goto(`/formpacks/${FORMPACK_ID}`);
    await expect(
      page.getByText(/seite wird geladen|page is loading/i),
    ).toHaveCount(0, {
      timeout: POLL_TIMEOUT,
    });
    await expect(
      page.locator('.formpack-form, .formpack-detail').first(),
    ).toBeVisible({
      timeout: POLL_TIMEOUT,
    });
    await expectNoSeriousA11yViolations(page, {
      routeLabel: `/formpacks/${FORMPACK_ID}`,
    });
  });

  test('offlabel intro gate has no moderate/serious/critical violations', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'A11y baseline is gated on Chromium for stability.',
    );

    await deleteDatabase(page, DB_NAME);
    await page.goto(`/formpacks/${OFFLABEL_FORMPACK_ID}`);
    await expect(page.getByRole('heading', { name: /hinweise/i })).toBeVisible({
      timeout: POLL_TIMEOUT,
    });
    await expectNoSeriousA11yViolations(page, {
      routeLabel: `/formpacks/${OFFLABEL_FORMPACK_ID}#intro`,
    });
  });

  test('offlabel form has no moderate/serious/critical violations after intro accept (light mode)', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'A11y baseline is gated on Chromium for stability.',
    );

    await deleteDatabase(page, DB_NAME);
    await page.goto(`/formpacks/${OFFLABEL_FORMPACK_ID}`);
    await acceptOfflabelIntroGate(page);

    const themeSelect = page.locator('#theme-select');
    await expect(themeSelect).toBeVisible({ timeout: POLL_TIMEOUT });
    await themeSelect.selectOption('light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await expectNoSeriousA11yViolations(page, {
      routeLabel: `/formpacks/${OFFLABEL_FORMPACK_ID}#form-light`,
    });
  });

  test('offlabel form has no moderate/serious/critical violations after intro accept (dark mode)', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'A11y baseline is gated on Chromium for stability.',
    );

    await deleteDatabase(page, DB_NAME);
    await page.goto(`/formpacks/${OFFLABEL_FORMPACK_ID}`);
    await acceptOfflabelIntroGate(page);

    const themeSelect = page.locator('#theme-select');
    await expect(themeSelect).toBeVisible({ timeout: POLL_TIMEOUT });
    await themeSelect.selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await expectNoSeriousA11yViolations(page, {
      routeLabel: `/formpacks/${OFFLABEL_FORMPACK_ID}#form-dark`,
    });
  });

  test('help route has no moderate/serious/critical violations', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'A11y baseline is gated on Chromium for stability.',
    );

    await deleteDatabase(page, DB_NAME);
    await page.goto('/help');
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: POLL_TIMEOUT,
    });
    await expectNoSeriousA11yViolations(page, { routeLabel: '/help' });
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
