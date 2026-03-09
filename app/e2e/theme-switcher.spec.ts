import { expect, test } from '@playwright/test';

const themeStorageKey = 'mecfs-paperwork.theme';

test('defaults to system and persists theme selection', async ({ page }) => {
  await page.addInitScript((key) => {
    const initFlag = 'theme-test-init';
    if (!sessionStorage.getItem(initFlag)) {
      localStorage.removeItem(key);
      sessionStorage.setItem(initFlag, 'true');
    }
  }, themeStorageKey);

  await page.goto('/formpacks');

  const themeSelect = page.locator('#theme-select');
  await expect(themeSelect).toHaveValue('system');
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    /dark|light/,
  );

  const storedDefaultTheme = await page.evaluate(
    (key) => localStorage.getItem(key),
    themeStorageKey,
  );
  expect(storedDefaultTheme).toBe('system');

  await themeSelect.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  const storedTheme = await page.evaluate(
    (key) => localStorage.getItem(key),
    themeStorageKey,
  );
  expect(storedTheme).toBe('light');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  const themeSelectAfterReload = page.locator('#theme-select');
  await themeSelectAfterReload.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  const storedThemeAfterReload = await page.evaluate(
    (key) => localStorage.getItem(key),
    themeStorageKey,
  );
  expect(storedThemeAfterReload).toBe('dark');
});
