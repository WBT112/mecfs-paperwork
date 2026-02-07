import type { Page } from '@playwright/test';

type ServiceWorkerState = {
  active: boolean;
  controlled: boolean;
};

type WaitForServiceWorkerOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
  allowSingleReload?: boolean;
};

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_POLL_INTERVAL_MS = 500;

const getServiceWorkerState = async (
  page: Page,
): Promise<ServiceWorkerState | null> => {
  try {
    return await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { active: false, controlled: false };
      }

      const registration = await navigator.serviceWorker.getRegistration();
      return {
        active: Boolean(registration?.active),
        controlled: navigator.serviceWorker.controller != null,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('Execution context was destroyed') ||
      message.includes('Cannot find context with specified id')
    ) {
      return null;
    }
    throw error;
  }
};

export const waitForServiceWorkerReady = async (
  page: Page,
  options: WaitForServiceWorkerOptions = {},
): Promise<boolean> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const allowSingleReload = options.allowSingleReload ?? true;
  const startedAt = Date.now();
  let didReload = false;

  while (Date.now() - startedAt < timeoutMs) {
    const state = await getServiceWorkerState(page);
    if (state == null) {
      await page.waitForTimeout(pollIntervalMs);
      continue;
    }

    if (state.active && state.controlled) {
      return true;
    }

    if (allowSingleReload && !didReload && state.active && !state.controlled) {
      didReload = true;
      await page.reload({ waitUntil: 'domcontentloaded' });
      continue;
    }

    await page.waitForTimeout(pollIntervalMs);
  }

  return false;
};
