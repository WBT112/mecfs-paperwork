import { expect, test } from '@playwright/test';

test('games hub opens Spoon Manager and completes a seeded day', async ({
  page,
}) => {
  await page.goto('/games');

  await expect(
    page.getByRole('heading', { level: 2, name: /games/i }),
  ).toBeVisible();

  await expect(
    page.getByRole('link', { name: /löffel-manager|spoon manager/i }),
  ).toBeVisible();
  await page.goto('/games/spoon-manager?seed=e2e-seed');

  await expect(
    page.getByRole('heading', {
      level: 2,
      name: /löffel-manager|spoon manager/i,
    }),
  ).toBeVisible();

  await page.getByRole('button', { name: /tag starten|start day/i }).click();

  let eventSeen = false;
  for (let turn = 0; turn < 6; turn += 1) {
    const actionButtons = page.locator('.games-spoon__action-button');
    const count = await actionButtons.count();

    let selectedIndex = 0;
    for (let index = 0; index < count; index += 1) {
      const text = (await actionButtons.nth(index).textContent()) ?? '';
      if (/protective|schützend/i.test(text)) {
        selectedIndex = index;
        break;
      }
    }

    await actionButtons.nth(selectedIndex).click();

    const continueButton = page.getByRole('button', {
      name: /weiter|continue/i,
    });
    if (await continueButton.isVisible()) {
      await continueButton.click();
    }

    if (
      await page
        .getByRole('heading', { name: /zufallsereignis|phase event/i })
        .isVisible()
    ) {
      eventSeen = true;
    }

    if (await page.locator('.games-spoon__result-card').isVisible()) {
      break;
    }
  }

  expect(eventSeen).toBe(true);
  const resultCard = page.locator('.games-spoon__result-card');
  await expect(resultCard).toBeVisible();
  await expect(
    resultCard.getByText(/remaining spoons|restlöffel/i),
  ).toBeVisible();

  await page
    .getByRole('button', { name: /one more day|noch ein tag/i })
    .click();
  await expect(page.getByText('1/6')).toBeVisible();

  await page
    .getByRole('link', { name: /back to the games hub|zurück zum games-hub/i })
    .click();
  await expect(
    page.getByRole('heading', { level: 2, name: /games/i }),
  ).toBeVisible();
});
