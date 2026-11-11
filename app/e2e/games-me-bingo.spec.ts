import { expect, test } from '@playwright/test';

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`games respect the ${reducedMotion} motion preference`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/games');
    const card = page.locator('.games-hub__card').first();
    const duration = reducedMotion === 'reduce' ? '0s' : '0.2s, 0.2s, 0.2s';
    await expect(card).toHaveCSS('transition-duration', duration);
    await page.getByRole('link', { name: /me bingo/i }).click();
    await page
      .getByRole('button', { name: /spiel starten|start game/i })
      .click();
    await expect(page.locator('.games-bingo__cell-button').first()).toHaveCSS(
      'transition-duration',
      duration,
    );
  });
}

test('games hub opens ME Bingo and reaches a shareable result view', async ({
  page,
}) => {
  await page.goto('/games');

  await expect(
    page.getByRole('heading', { level: 2, name: /games/i }),
  ).toBeVisible();

  await page.getByRole('link', { name: /me bingo/i }).click();

  await expect(
    page.getByRole('heading', { level: 2, name: /me bingo/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /spiel starten|start game/i }).click();

  const playableCells = page.locator(
    '.games-bingo__board button[data-free-field="false"]',
  );
  const count = await playableCells.count();

  for (let index = 0; index < count; index += 1) {
    await playableCells.nth(index).click();
  }

  const resultCard = page.locator('.games-bingo__result-card');
  await expect(resultCard).toBeVisible();
  await expect(
    resultCard.getByText(/full card geschafft|full card complete/i).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: /neue karte|new card/i }).click();
  await expect(page.getByText('1/25')).toBeVisible();

  await page
    .getByRole('link', { name: /zurück zum games-hub|back to the games hub/i })
    .click();
  await expect(
    page.getByRole('heading', { level: 2, name: /games/i }),
  ).toBeVisible();
});
