import { expect, type Page } from '@playwright/test';
import { clickActionButton } from './actions';

export const openCollapsibleSection = async (page: Page, heading: RegExp) => {
  const toggle = page.locator('.collapsible-section__toggle', {
    hasText: heading,
  });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await expect(toggle).toBeVisible();
    const expanded = await toggle.getAttribute('aria-expanded');
    if (expanded === 'true') {
      return;
    }

    await clickActionButton(toggle);
    if ((await toggle.getAttribute('aria-expanded')) === 'true') {
      return;
    }

    await page.waitForTimeout(100 * attempt);
  }

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
};
