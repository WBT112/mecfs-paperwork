import { expect, test } from '@playwright/test';

test('me bingo keeps board, progress, and stats stacked on mobile @mobile', async ({
  page,
}) => {
  await page.goto('/games/me-bingo');

  await page.getByRole('button', { name: /spiel starten|start game/i }).click();

  const layout = page.locator('.games-bingo__layout');
  const boardPanel = page.locator('.games-bingo__board-panel');
  const progressPanel = page.locator('.games-bingo__panel--progress');
  const statsPanel = page.locator('.games-bingo__panel--stats');
  const sidebar = page.locator('.games-bingo__sidebar');

  await expect(layout).toBeVisible();
  await expect(boardPanel).toBeVisible();
  await expect(progressPanel).toBeVisible();
  await expect(statsPanel).toBeVisible();

  const [layoutDisplay, boardBox, sidebarBox, progressBox, statsBox] =
    await Promise.all([
      layout.evaluate((element) => getComputedStyle(element).display),
      boardPanel.boundingBox(),
      sidebar.boundingBox(),
      progressPanel.boundingBox(),
      statsPanel.boundingBox(),
    ]);

  expect(layoutDisplay).toBe('flex');
  expect(boardBox).not.toBeNull();
  expect(sidebarBox).not.toBeNull();
  expect(progressBox).not.toBeNull();
  expect(statsBox).not.toBeNull();

  expect(sidebarBox!.y).toBeGreaterThanOrEqual(
    boardBox!.y + boardBox!.height - 1,
  );
  expect(progressBox!.y).toBeGreaterThanOrEqual(sidebarBox!.y);
  expect(statsBox!.y).toBeGreaterThan(progressBox!.y);
});
