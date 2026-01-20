import { expect, test } from '@playwright/test';

test('topbar feedback and share actions are available and share a link-only URL', async ({
  page,
}) => {
  await page.goto('/formpacks');

  const feedbackLink = page.getByRole('link', { name: /feedback/i });
  await expect(feedbackLink).toBeVisible();

  const href = await feedbackLink.getAttribute('href');
  expect(href).toBeTruthy();
  expect(href).toMatch(/^mailto:/);
  expect(href).toContain('subject=');
  expect(href).toContain('body=');

  const shareButton = page.getByRole('button', { name: /share|teilen/i });
  await expect(shareButton).toBeVisible();
  await shareButton.click();

  const shareUrlInput = page.getByLabel(/share url|teilen-link/i);
  await expect(shareUrlInput).toBeVisible();
  await expect(shareUrlInput).toHaveValue('http://127.0.0.1:5173/formpacks');
});
