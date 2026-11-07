import { expect, test } from '@playwright/test';

for (const width of [320, 420]) {
  test(`help offers remain usable at ${width}px @mobile`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');

    const status = page.locator('.formpack-list__status');
    const search = page.getByRole('searchbox');
    const firstCategory = page.locator('.formpack-list__category').first();
    const firstCard = firstCategory.locator('.formpack-card').first();

    await expect(status).toBeVisible();
    await expect(search).toBeVisible();
    await expect(firstCategory).toBeVisible();
    await expect(firstCard).toBeVisible();

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);

    const [categoryBackground, cardBackground] = await Promise.all([
      firstCategory.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
      firstCard.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    ]);
    expect(cardBackground).not.toBe(categoryBackground);

    await search.fill('Mailings');
    await expect(status).toContainText('1');
    await expect(
      page.getByRole('link', {
        name: /e-mail an abgeordnete|open email to representatives/i,
      }),
    ).toBeVisible();
    await expect(page.locator('.formpack-list__category')).toHaveCount(1);
  });
}
