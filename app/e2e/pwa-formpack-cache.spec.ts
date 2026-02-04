import { expect, test, type Page } from '@playwright/test';

const FORMPACK_ID = 'notfallpass';
const FORMPACK_ROUTE = `/formpacks/${FORMPACK_ID}`;
const FORMPACK_MANIFEST_PATH = `${FORMPACK_ROUTE}/manifest.json`;
const POLL_TIMEOUT = 20_000;

const waitForServiceWorkerReady = async (page: Page) => {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    await navigator.serviceWorker.ready;
    return true;
  });
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null);
};

const fetchManifest = async (page: Page) =>
  page.evaluate(async (manifestPath) => {
    const response = await fetch(manifestPath);
    const payload = (await response.json()) as { id?: string };
    return { ok: response.ok, status: response.status, id: payload.id ?? null };
  }, FORMPACK_MANIFEST_PATH);

test('pwa keeps formpack assets available after going offline', async ({
  page,
  context,
}) => {
  await page.goto('/formpacks');
  await waitForServiceWorkerReady(page);

  await page.goto(FORMPACK_ROUTE);
  await expect(page.locator('.formpack-form')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });

  const onlineManifest = await fetchManifest(page);
  expect(onlineManifest).toEqual({ ok: true, status: 200, id: FORMPACK_ID });

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator('.formpack-form')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
  const offlineManifest = await fetchManifest(page);
  expect(offlineManifest).toEqual({ ok: true, status: 200, id: FORMPACK_ID });

  await context.setOffline(false);
});
