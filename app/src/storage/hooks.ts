import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from 'react';
import type { SupportedLocale } from '../i18n/locale';
import { StorageUnavailableError } from './db';
import {
  createRecord as createRecordEntry,
  getRecord,
  listRecords,
  updateRecord as updateRecordEntry,
} from './records';
import {
  createSnapshot as createSnapshotEntry,
  getSnapshot,
  listSnapshots,
} from './snapshots';
import type { RecordEntry, SnapshotEntry } from './types';

export type StorageErrorCode = 'unavailable' | 'operation';

const getStorageErrorCode = (error: unknown): StorageErrorCode =>
  error instanceof StorageUnavailableError ? 'unavailable' : 'operation';

const upsertRecord = (
  records: RecordEntry[],
  record: RecordEntry,
): RecordEntry[] => {
  const next = records.filter((entry) => entry.id !== record.id);
  return [...next, record].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
};

/**
 * Loads and manages records for a formpack.
 */
export const useRecords = (formpackId: string | null) => {
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [activeRecord, setActiveRecord] = useState<RecordEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Tracks the initial records load to avoid actions before IndexedDB finishes.
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorCode, setErrorCode] = useState<StorageErrorCode | null>(null);
  const activeRecordRef = useRef<RecordEntry | null>(null);

  const setActiveRecordState = useCallback(
    (value: SetStateAction<RecordEntry | null>) => {
      setActiveRecord((current) => {
        const next = typeof value === 'function' ? value(current) : value;
        activeRecordRef.current = next;
        return next;
      });
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!formpackId) {
      setRecords([]);
      setActiveRecordState(null);
      setHasLoaded(false);
      return;
    }

    setIsLoading(true);
    setErrorCode(null);

    try {
      const nextRecords = await listRecords(formpackId);
      const active = activeRecordRef.current;
      const mergedRecords =
        active &&
        active.formpackId === formpackId &&
        !nextRecords.some((record) => record.id === active.id)
          ? upsertRecord(nextRecords, active)
          : nextRecords;

      // Avoid dropping a newly created active record if the initial list returns late.
      setRecords(mergedRecords);
      setActiveRecordState((current) => {
        if (!current) {
          return null;
        }
        if (current.formpackId !== formpackId) {
          return null;
        }
        return mergedRecords.some((record) => record.id === current.id)
          ? current
          : null;
      });
    } catch (error) {
      setErrorCode(getStorageErrorCode(error));
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [formpackId, setActiveRecordState]);

  useEffect(() => {
    setHasLoaded(false);
    void refresh();
  }, [refresh]);

  const createRecord = useCallback(
    async (
      locale: SupportedLocale,
      data: Record<string, unknown>,
      title?: string,
    ) => {
      if (!formpackId) {
        return null;
      }

      setErrorCode(null);

      try {
        const record = await createRecordEntry(formpackId, locale, data, title);
        setActiveRecordState(record);
        setRecords((prev) => upsertRecord(prev, record));
        return record;
      } catch (error) {
        setErrorCode(getStorageErrorCode(error));
        return null;
      }
    },
    [formpackId, setActiveRecordState],
  );

  const loadRecord = useCallback(
    async (recordId: string) => {
      setErrorCode(null);

      try {
        const record = await getRecord(recordId);
        if (!record) {
          return null;
        }
        setActiveRecordState(record);
        setRecords((prev) => upsertRecord(prev, record));
        return record;
      } catch (error) {
        setErrorCode(getStorageErrorCode(error));
        return null;
      }
    },
    [setActiveRecordState],
  );

  const updateActiveRecord = useCallback(
    async (
      recordId: string,
      updates: {
        data?: Record<string, unknown>;
        title?: string;
        locale?: SupportedLocale;
      },
    ) => {
      setErrorCode(null);

      try {
        const updated = await updateRecordEntry(recordId, updates);
        if (!updated) {
          return null;
        }
        setActiveRecordState(updated);
        setRecords((prev) => upsertRecord(prev, updated));
        return updated;
      } catch (error) {
        setErrorCode(getStorageErrorCode(error));
        return null;
      }
    },
    [setActiveRecordState],
  );

  const applyRecordUpdate = useCallback(
    (record: RecordEntry) => {
      setActiveRecordState(record);
      setRecords((prev) => upsertRecord(prev, record));
    },
    [setActiveRecordState],
  );

  return {
    records,
    activeRecord,
    isLoading,
    errorCode,
    refresh,
    createRecord,
    loadRecord,
    updateActiveRecord,
    applyRecordUpdate,
    setActiveRecord: setActiveRecordState,
    hasLoaded,
  };
};

/**
 * Loads snapshots for the active record.
 */
export const useSnapshots = (recordId: string | null) => {
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<StorageErrorCode | null>(null);

  const refresh = useCallback(async () => {
    if (!recordId) {
      setSnapshots([]);
      return;
    }

    setIsLoading(true);
    setErrorCode(null);

    try {
      const nextSnapshots = await listSnapshots(recordId);
      setSnapshots(nextSnapshots);
    } catch (error) {
      setErrorCode(getStorageErrorCode(error));
    } finally {
      setIsLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createSnapshot = useCallback(
    async (data: Record<string, unknown>, label?: string) => {
      if (!recordId) {
        return null;
      }

      setErrorCode(null);

      try {
        const snapshot = await createSnapshotEntry(recordId, data, label);
        setSnapshots((prev) => [snapshot, ...prev]);
        return snapshot;
      } catch (error) {
        setErrorCode(getStorageErrorCode(error));
        return null;
      }
    },
    [recordId],
  );

  const loadSnapshot = useCallback(async (snapshotId: string) => {
    setErrorCode(null);

    try {
      return await getSnapshot(snapshotId);
    } catch (error) {
      setErrorCode(getStorageErrorCode(error));
      return null;
    }
  }, []);

  return {
    snapshots,
    isLoading,
    errorCode,
    refresh,
    createSnapshot,
    loadSnapshot,
  };
};

/**
 * Autosaves record data changes after a debounce delay.
 *
 * Returns helpers for syncing the autosave baseline after programmatic updates.
 */
export const useAutosaveRecord = (
  recordId: string | null,
  formData: Record<string, unknown>,
  locale: SupportedLocale,
  baselineData: Record<string, unknown> | null,
  options?: {
    delay?: number;
    onSaved?: (record: RecordEntry) => void;
    onError?: (code: StorageErrorCode) => void;
  },
) => {
  const delay = options?.delay ?? 1200;
  const onSaved = options?.onSaved;
  const onError = options?.onError;
  const lastSavedRef = useRef<string | null>(null);
  const lastRecordIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!recordId) {
      lastSavedRef.current = null;
      lastRecordIdRef.current = null;
      return;
    }

    if (lastRecordIdRef.current !== recordId) {
      lastRecordIdRef.current = recordId;
      lastSavedRef.current = baselineData ? JSON.stringify(baselineData) : null;
    }
  }, [recordId, baselineData]);

  useEffect(() => {
    if (!recordId || !baselineData) {
      return;
    }

    if (lastRecordIdRef.current === recordId) {
      lastSavedRef.current = JSON.stringify(baselineData);
    }
  }, [recordId, baselineData]);

  /**
   * Syncs autosave's baseline to already persisted data.
   */
  const markAsSaved = useCallback((nextData: Record<string, unknown>) => {
    lastSavedRef.current = JSON.stringify(nextData);
  }, []);

  useEffect(() => {
    if (!recordId) {
      return;
    }

    const nextSerialized = JSON.stringify(formData);
    if (lastSavedRef.current === nextSerialized) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (lastSavedRef.current === nextSerialized) {
        return;
      }

      void updateRecordEntry(recordId, {
        data: formData,
        locale,
      })
        .then((record) => {
          if (record && onSaved) {
            onSaved(record);
          }
          lastSavedRef.current = nextSerialized;
        })
        .catch((error: unknown) => {
          if (onError) {
            onError(getStorageErrorCode(error));
          }
        });
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [recordId, formData, locale, delay, onSaved, onError]);

  return { markAsSaved };
};
