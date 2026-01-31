import { expect, test, type Page } from '@playwright/test';

const waitForFormpack = async (page: Page) => {
  await expect(page.locator('.formpack-form')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.app__error')).toHaveCount(0);
};

test('formpack deep links load directly', async ({ page }) => {
  await page.goto('/formpacks/doctor-letter');
  await waitForFormpack(page);

  await page.goto('/formpacks/notfallpass');
  await waitForFormpack(page);
});
