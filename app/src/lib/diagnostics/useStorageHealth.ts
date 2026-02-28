import { useEffect, useState } from 'react';
import { checkStorageHealth } from './storageHealth';
import type { StorageHealthInfo } from './types';

const INITIAL_STATE: StorageHealthInfo = {
  indexedDbAvailable: true,
  storageEstimate: { supported: false },
  status: 'ok',
  message: '',
};

/**
 * React hook wrapper for storage-health diagnostics with manual refresh support.
 */
export const useStorageHealth = (): {
  health: StorageHealthInfo;
  loading: boolean;
  refresh: () => void;
} => {
  const [health, setHealth] = useState<StorageHealthInfo>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    checkStorageHealth()
      .then((result) => {
        if (!cancelled) {
          setHealth(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({
            indexedDbAvailable: false,
            storageEstimate: { supported: false },
            status: 'error',
            message: 'storageHealthGuidanceError',
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return { health, loading, refresh };
};
