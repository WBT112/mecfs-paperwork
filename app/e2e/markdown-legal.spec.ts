import { expect, test } from '@playwright/test';

test('legal markdown renders headings and internal links', async ({ page }) => {
  await page.goto('/imprint');

  await expect(
    page.getByRole('heading', { level: 1, name: /imprint|impressum/i }),
  ).toBeVisible();

  const privacyLink = page.locator('a[href="/privacy"]');
  await expect(privacyLink).toBeVisible();
  await privacyLink.click();

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /privacy policy|datenschutzerklärung|datenschutz/i,
    }),
  ).toBeVisible();
});

test('legal pages support deep links and reloads', async ({ page }) => {
  await page.goto('/privacy');

  const privacyHeading = page.getByRole('heading', {
    level: 1,
    name: /privacy policy|datenschutzerklärung|datenschutz/i,
  });
  await expect(privacyHeading).toBeVisible();

  await page.reload();
  await expect(privacyHeading).toBeVisible();
});
