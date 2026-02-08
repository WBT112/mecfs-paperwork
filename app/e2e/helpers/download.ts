import type { Download, Page } from '@playwright/test';

/**
 * Waits for a download to start by listening for the 'download' event,
 * then triggers the action that initiates it.
 *
 * Returns the Playwright Download object for further assertions.
 */
export const waitForDownload = async (
  page: Page,
  triggerAction: () => Promise<void>,
): Promise<Download> => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    triggerAction(),
  ]);
  return download;
};
