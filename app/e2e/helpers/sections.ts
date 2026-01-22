import { expect, type Page } from '@playwright/test';

export const openCollapsibleSection = async (page: Page, heading: RegExp) => {
  const toggle = page.locator('.collapsible-section__toggle', {
    hasText: heading,
  });
  await expect(toggle).toBeVisible();
  const expanded = await toggle.getAttribute('aria-expanded');
  if (expanded !== 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
};
