import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from 'react';
import { StorageLockedError } from './atRestEncryption';
import type { SupportedLocale } from '../i18n/locale';
import { StorageUnavailableError } from './db';
import {
  createRecord as createRecordEntry,
  deleteRecord as deleteRecordEntry,
  getRecord,
  listRecords,
  updateRecord as updateRecordEntry,
} from './records';
import {
  createSnapshot as createSnapshotEntry,
  clearSnapshots as clearSnapshotsEntry,
  getSnapshot,
  listSnapshots,
} from './snapshots';
import type { RecordEntry, SnapshotEntry } from './types';

export type StorageErrorCode = 'unavailable' | 'locked' | 'operation';

const getStorageErrorCode = (error: unknown): StorageErrorCode => {
  if (error instanceof StorageUnavailableError) {
    return 'unavailable';
  }

  if (error instanceof StorageLockedError) {
    return 'locked';
  }

  return 'operation';
};

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
        active?.formpackId === formpackId &&
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
        return current;
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
    refresh().catch(Promise.reject.bind(Promise));
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

  const deleteRecord = useCallback(
    async (recordId: string) => {
      if (activeRecordRef.current?.id === recordId) {
        return false;
      }

      setErrorCode(null);

      try {
        const deleted = await deleteRecordEntry(recordId);
        if (deleted) {
          setRecords((prev) => prev.filter((record) => record.id !== recordId));
        }
        return deleted;
      } catch (error) {
        setErrorCode(getStorageErrorCode(error));
        return false;
      }
    },
    [setErrorCode, setRecords],
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
    deleteRecord,
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
  }, [recordId, setErrorCode, setSnapshots]);

  useEffect(() => {
    refresh().catch(Promise.reject.bind(Promise));
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

  const clearSnapshots = useCallback(async () => {
    if (!recordId) {
      return 0;
    }

    setErrorCode(null);

    try {
      const cleared = await clearSnapshotsEntry(recordId);
      setSnapshots([]);
      return cleared;
    } catch (error) {
      setErrorCode(getStorageErrorCode(error));
      return 0;
    }
  }, [recordId]);

  return {
    snapshots,
    isLoading,
    errorCode,
    refresh,
    createSnapshot,
    loadSnapshot,
    clearSnapshots,
  };
};

/**
 * Autosaves record data changes after a debounce delay and attempts a final
 * best-effort persist on `beforeunload`.
 *
 * @remarks
 * The `beforeunload` persist path does not notify `onSaved` or `onError`
 * because the browser may terminate execution while the request is still in
 * flight.
 *
 * @param recordId - Current record identifier, or `null` when no record is active.
 * @param formData - Latest in-memory form data to be persisted.
 * @param locale - Locale that is stored with the record payload.
 * @param baselineData - Last known persisted record data used to initialize autosave state.
 * @param options - Optional autosave configuration such as debounce delay and callbacks.
 * @returns Helpers for syncing the autosave baseline after programmatic updates.
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
  const latestRecordIdRef = useRef<string | null>(recordId);
  const latestFormDataRef = useRef<Record<string, unknown>>(formData);
  const latestLocaleRef = useRef<SupportedLocale>(locale);
  const onSavedRef = useRef<typeof onSaved>(onSaved);
  const onErrorRef = useRef<typeof onError>(onError);

  useEffect(() => {
    latestRecordIdRef.current = recordId;
    latestFormDataRef.current = formData;
    latestLocaleRef.current = locale;
  }, [recordId, formData, locale]);

  useEffect(() => {
    onSavedRef.current = onSaved;
    onErrorRef.current = onError;
  }, [onSaved, onError]);

  useEffect(() => {
    if (!recordId) {
      lastSavedRef.current = null;
      lastRecordIdRef.current = null;
      return;
    }

    if (lastRecordIdRef.current !== recordId) {
      lastRecordIdRef.current = recordId;
      lastSavedRef.current = baselineData ? JSON.stringify(baselineData) : null;
      return;
    }

    if (baselineData) {
      lastSavedRef.current = JSON.stringify(baselineData);
    }
  }, [recordId, baselineData]);

  /**
   * Syncs autosave's baseline to already persisted data.
   */
  const markAsSaved = useCallback((nextData: Record<string, unknown>) => {
    lastSavedRef.current = JSON.stringify(nextData);
  }, []);

  const persistPendingChanges = useCallback(
    async (notifyCallbacks: boolean) => {
      const currentRecordId = latestRecordIdRef.current;
      if (!currentRecordId) {
        return;
      }

      const currentFormData = latestFormDataRef.current;
      const serializedData = JSON.stringify(currentFormData);
      if (lastSavedRef.current === serializedData) {
        return;
      }

      try {
        const record = await updateRecordEntry(currentRecordId, {
          data: currentFormData,
          locale: latestLocaleRef.current,
        });

        if (record && notifyCallbacks && onSavedRef.current) {
          onSavedRef.current(record);
        }
        lastSavedRef.current = serializedData;
      } catch (error: unknown) {
        if (notifyCallbacks && onErrorRef.current) {
          onErrorRef.current(getStorageErrorCode(error));
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!recordId) {
      return;
    }

    const nextSerialized = JSON.stringify(formData);
    if (lastSavedRef.current === nextSerialized) {
      return;
    }

    const timeout = globalThis.setTimeout(() => {
      persistPendingChanges(true).catch(Promise.reject.bind(Promise));
    }, delay);

    return () => {
      globalThis.clearTimeout(timeout);
    };
  }, [recordId, formData, delay, persistPendingChanges]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      persistPendingChanges(false).catch(Promise.reject.bind(Promise));
    };

    globalThis.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      globalThis.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [persistPendingChanges]);

  return { markAsSaved };
};
