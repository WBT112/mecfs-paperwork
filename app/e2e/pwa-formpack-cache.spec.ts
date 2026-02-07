import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const FORMPACK_ID = 'notfallpass';
const FORMPACK_ROUTE = `/formpacks/${FORMPACK_ID}`;
const FORMPACK_MANIFEST_PATH = `${FORMPACK_ROUTE}/manifest.json`;
const FORMPACK_MANIFEST_FS_PATH = path.join(
  process.cwd(),
  'public',
  'formpacks',
  FORMPACK_ID,
  'manifest.json',
);
const POLL_TIMEOUT = 20_000;
const UPDATE_PICKUP_TIMEOUT = 15_000;

test.describe.configure({ mode: 'serial' });

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

const writeManifestWithCacheProbe = async (
  manifestFsPath: string,
  cacheProbe: string,
) => {
  const manifestRaw = await readFile(manifestFsPath, 'utf8');
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
  manifest.cacheProbe = cacheProbe;
  await writeFile(
    manifestFsPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
};

const fetchManifestVersion = async (page: Page, manifestPath: string) =>
  page.evaluate(async (pathToManifest) => {
    const response = await fetch(pathToManifest);
    const payload = (await response.json()) as { cacheProbe?: string };
    return {
      ok: response.ok,
      status: response.status,
      cacheProbe: payload.cacheProbe ?? null,
    };
  }, manifestPath);

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
  await expect(page.locator('.formpack-detail__version-meta')).toContainText(
    /formpack:/i,
  );

  const onlineManifest = await fetchManifest(page);
  expect(onlineManifest).toEqual({ ok: true, status: 200, id: FORMPACK_ID });

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator('.formpack-form')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
  await expect(page.locator('.formpack-detail__version-meta')).toContainText(
    /formpack:/i,
  );
  const offlineManifest = await fetchManifest(page);
  expect(offlineManifest).toEqual({ ok: true, status: 200, id: FORMPACK_ID });

  await context.setOffline(false);
});

test('pwa revalidates changed formpack assets and serves the updated version', async ({
  page,
  context,
}) => {
  const originalManifestRaw = await readFile(FORMPACK_MANIFEST_FS_PATH, 'utf8');
  await writeManifestWithCacheProbe(FORMPACK_MANIFEST_FS_PATH, 'v1');

  try {
    await page.goto('/formpacks');
    await waitForServiceWorkerReady(page);

    const initialManifest = await fetchManifestVersion(
      page,
      FORMPACK_MANIFEST_PATH,
    );
    expect(initialManifest).toEqual({
      ok: true,
      status: 200,
      cacheProbe: 'v1',
    });

    await writeManifestWithCacheProbe(FORMPACK_MANIFEST_FS_PATH, 'v2');

    const firstReadAfterChange = await fetchManifestVersion(
      page,
      FORMPACK_MANIFEST_PATH,
    );
    expect(firstReadAfterChange.ok).toBe(true);
    expect(firstReadAfterChange.status).toBe(200);
    expect(['v1', 'v2']).toContain(firstReadAfterChange.cacheProbe);

    await expect
      .poll(
        async () =>
          (await fetchManifestVersion(page, FORMPACK_MANIFEST_PATH)).cacheProbe,
        { timeout: UPDATE_PICKUP_TIMEOUT },
      )
      .toBe('v2');

    await context.setOffline(true);
    const offlineManifest = await fetchManifestVersion(
      page,
      FORMPACK_MANIFEST_PATH,
    );
    expect(offlineManifest).toEqual({
      ok: true,
      status: 200,
      cacheProbe: 'v2',
    });
  } finally {
    await writeFile(FORMPACK_MANIFEST_FS_PATH, originalManifestRaw, 'utf8');
    try {
      await context.setOffline(false);
    } catch {
      // Context can be closed on timeout; restoring online mode is best-effort in cleanup.
    }
  }
});
