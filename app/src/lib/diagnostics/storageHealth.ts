import type { StorageHealthInfo, StorageHealthStatus } from './types';

const QUOTA_WARNING_THRESHOLD = 0.85;

const checkIndexedDbAvailable = (): boolean => typeof indexedDB !== 'undefined';

const getStorageEstimate = async (): Promise<
  StorageHealthInfo['storageEstimate']
> => {
  if (!navigator.storage?.estimate) {
    return { supported: false };
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      supported: true,
      usage: estimate.usage,
      quota: estimate.quota,
    };
  } catch {
    return { supported: false };
  }
};

const resolveStatus = (
  idbAvailable: boolean,
  estimate: StorageHealthInfo['storageEstimate'],
): { status: StorageHealthStatus; message: string } => {
  if (!idbAvailable) {
    return {
      status: 'error',
      message:
        'IndexedDB is not available. Data cannot be saved. ' +
        'This may happen in private/incognito mode or on some iOS browsers.',
    };
  }

  if (
    estimate.supported &&
    estimate.usage !== undefined &&
    estimate.quota !== undefined &&
    estimate.quota > 0
  ) {
    const ratio = estimate.usage / estimate.quota;
    if (ratio >= 1) {
      return {
        status: 'error',
        message:
          'Storage quota exceeded. Free up space or clear unused data to continue.',
      };
    }
    if (ratio >= QUOTA_WARNING_THRESHOLD) {
      return {
        status: 'warning',
        message: `Storage usage is high (${Math.round(ratio * 100)}%). Consider exporting and removing old drafts.`,
      };
    }
  }

  return {
    status: 'ok',
    message: 'Storage is available and working normally.',
  };
};

export const checkStorageHealth = async (): Promise<StorageHealthInfo> => {
  const idbAvailable = checkIndexedDbAvailable();
  const storageEstimate = await getStorageEstimate();
  const { status, message } = resolveStatus(idbAvailable, storageEstimate);

  return {
    indexedDbAvailable: idbAvailable,
    storageEstimate,
    status,
    message,
  };
};
