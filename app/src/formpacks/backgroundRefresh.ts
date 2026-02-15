import { clearFormpackI18nCache } from '../i18n/formpack';
import type { FormpackManifestPayload } from './types';
import { clearFormpackCaches, parseManifest } from './loader';
import { FORMPACK_IDS } from './registry';
import { deriveFormpackRevisionSignature } from './metadata';
import { getFormpackMeta, upsertFormpackMeta } from '../storage/formpackMeta';

export type FormpackRefreshResult = {
  checkedAt: string;
  updatedIds: string[];
  skippedOffline: boolean;
};

export type FormpackRefreshOptions = {
  onUpdated?: (formpackIds: string[]) => void;
  intervalMs?: number;
};

export const FORMPACKS_UPDATED_EVENT = 'formpacks:updated';

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const REFRESH_REQUEST_HEADER = 'x-formpack-refresh';
const INITIAL_IDLE_TIMEOUT_MS = 3_000;
const INITIAL_TIMEOUT_MS = 1_500;

type IdleCallback = (deadline: {
  didTimeout: boolean;
  timeRemaining: () => number;
}) => void;

type IdleScheduler = {
  requestIdleCallback?: (
    callback: IdleCallback,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

const getRefreshHeaders = (): HeadersInit => ({
  Accept: 'application/json',
  [REFRESH_REQUEST_HEADER]: '1',
});

const fetchJson = async (path: string): Promise<unknown> => {
  const response = await fetch(path, {
    headers: getRefreshHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch ${path}: HTTP ${response.status}`);
  }

  return (await response.json()) as unknown;
};

const fetchResource = async (path: string): Promise<void> => {
  const response = await fetch(path, {
    headers: {
      [REFRESH_REQUEST_HEADER]: '1',
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch ${path}: HTTP ${response.status}`);
  }

  await response.arrayBuffer();
};

const buildManifestPath = (formpackId: string): string =>
  `/formpacks/${formpackId}/manifest.json`;

const buildSchemaPath = (formpackId: string): string =>
  `/formpacks/${formpackId}/schema.json`;

const buildUiSchemaPath = (formpackId: string): string =>
  `/formpacks/${formpackId}/ui.schema.json`;

const buildI18nPath = (formpackId: string, locale: string): string =>
  `/formpacks/${formpackId}/i18n/${locale}.json`;

const buildDocxPath = (formpackId: string, file: string): string =>
  `/formpacks/${formpackId}/${file}`;

const refreshSingleFormpack = async (formpackId: string): Promise<boolean> => {
  const manifestPath = buildManifestPath(formpackId);
  const manifestPayload = (await fetchJson(
    manifestPath,
  )) as FormpackManifestPayload;
  const manifest = parseManifest(manifestPayload, formpackId);
  const signature = await deriveFormpackRevisionSignature(manifestPayload);
  const existing = await getFormpackMeta(formpackId);

  if (existing?.hash === signature.hash) {
    return false;
  }

  const resourcePaths = [
    manifestPath,
    buildSchemaPath(formpackId),
    buildUiSchemaPath(formpackId),
    ...manifest.locales.map((locale) => buildI18nPath(formpackId, locale)),
  ];

  if (manifest.docx) {
    const walletTemplate = manifest.docx.templates.wallet;
    resourcePaths.push(
      buildDocxPath(formpackId, manifest.docx.mapping),
      buildDocxPath(formpackId, manifest.docx.templates.a4),
      ...(walletTemplate ? [buildDocxPath(formpackId, walletTemplate)] : []),
    );
  }

  await Promise.all(resourcePaths.map((path) => fetchResource(path)));

  await upsertFormpackMeta({
    id: formpackId,
    versionOrHash: signature.versionOrHash,
    version: signature.version,
    hash: signature.hash,
  });

  // NOTE: First-time metadata bootstrap should not invalidate runtime caches.
  // The active page load already fetched current assets for this revision.
  return existing !== null;
};

let activeRefreshRun: Promise<FormpackRefreshResult> | null = null;

export const runFormpackBackgroundRefresh =
  async (): Promise<FormpackRefreshResult> => {
    if (activeRefreshRun) {
      return activeRefreshRun;
    }

    activeRefreshRun = (async () => {
      const checkedAt = new Date().toISOString();

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return {
          checkedAt,
          updatedIds: [],
          skippedOffline: true,
        };
      }

      const updatedIds: string[] = [];

      for (const formpackId of FORMPACK_IDS) {
        try {
          const hasChanges = await refreshSingleFormpack(formpackId);
          if (hasChanges) {
            updatedIds.push(formpackId);
          }
        } catch {
          // NOTE: Keep refresh best-effort and offline-safe.
        }
      }

      if (updatedIds.length > 0) {
        clearFormpackCaches();
        updatedIds.forEach((formpackId) => {
          clearFormpackI18nCache(formpackId);
        });
      }

      return {
        checkedAt,
        updatedIds,
        skippedOffline: false,
      };
    })();

    try {
      return await activeRefreshRun;
    } finally {
      activeRefreshRun = null;
    }
  };

const runSafely = async (onUpdated?: (formpackIds: string[]) => void) => {
  try {
    const result = await runFormpackBackgroundRefresh();
    if (result.updatedIds.length > 0) {
      onUpdated?.(result.updatedIds);
      globalThis.dispatchEvent(
        new CustomEvent(FORMPACKS_UPDATED_EVENT, {
          detail: { formpackIds: result.updatedIds },
        }),
      );
    }
  } catch {
    // NOTE: Refresh errors must never break app startup.
  }
};

export const startFormpackBackgroundRefresh = (
  options: FormpackRefreshOptions = {},
): (() => void) => {
  const intervalMs = options.intervalMs ?? REFRESH_INTERVAL_MS;
  let stopped = false;
  let idleHandle: number | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const scheduleInitialRun = () => {
    if (stopped) {
      return;
    }

    const scheduler = globalThis as unknown as IdleScheduler;

    if (typeof scheduler.requestIdleCallback === 'function') {
      idleHandle = scheduler.requestIdleCallback(
        () => {
          if (stopped) {
            return;
          }
          runSafely(options.onUpdated).catch(() => undefined);
        },
        { timeout: INITIAL_IDLE_TIMEOUT_MS },
      );
      return;
    }

    timeoutHandle = setTimeout(() => {
      if (stopped) {
        return;
      }
      runSafely(options.onUpdated).catch(() => undefined);
    }, INITIAL_TIMEOUT_MS);
  };

  scheduleInitialRun();

  const intervalHandle = setInterval(() => {
    if (stopped) {
      return;
    }
    runSafely(options.onUpdated).catch(() => undefined);
  }, intervalMs);

  const handleOnline = () => {
    if (stopped) {
      return;
    }
    runSafely(options.onUpdated).catch(() => undefined);
  };

  globalThis.addEventListener('online', handleOnline);

  return () => {
    stopped = true;
    clearInterval(intervalHandle);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    if (idleHandle !== null) {
      const scheduler = globalThis as unknown as IdleScheduler;
      scheduler.cancelIdleCallback?.(idleHandle);
    }

    globalThis.removeEventListener('online', handleOnline);
  };
};
