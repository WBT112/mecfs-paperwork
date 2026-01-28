import { expect, test } from '@playwright/test';

test('footer help link navigates to the help page', async ({ page }) => {
  await page.goto('/');

  const footerNav = page.getByRole('navigation', {
    name: /footer navigation|fußzeilennavigation/i,
  });

  const helpLink = footerNav.getByRole('link', { name: /help|hilfe/i });
  await expect(helpLink).toBeVisible();
  await helpLink.click();

  await expect(
    page.getByRole('heading', { level: 1, name: /help|hilfe/i }),
  ).toBeVisible();
});

test('help page supports deep links and reloads', async ({ page }) => {
  await page.goto('/help');

  const helpHeading = page.getByRole('heading', {
    level: 1,
    name: /help|hilfe/i,
  });
  await expect(helpHeading).toBeVisible();

  await page.reload();
  await expect(helpHeading).toBeVisible();
});
