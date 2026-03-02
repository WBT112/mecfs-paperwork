import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestRouter } from '../setup/testRouter';
import FormpackDetailPage from '../../src/pages/FormpackDetailPage';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { FormpackManifest } from '../../src/formpacks/types';
import type { RecordEntry, SnapshotEntry } from '../../src/storage/types';

const FORMPACK_ROUTE = '/formpacks/notfallpass';
const SNAPSHOT_ID = 'snapshot-1';

const formpackState = vi.hoisted(
  (): {
    manifest: FormpackManifest;
    schema: RJSFSchema | null;
    uiSchema: UiSchema | null;
  } => ({
    manifest: {
      id: 'notfallpass',
      version: '1.0.0',
      titleKey: 'formpackTitle',
      descriptionKey: 'formpackDescription',
      defaultLocale: 'de',
      locales: ['de', 'en'],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: {
          a4: 'template-a4.docx',
        },
        mapping: 'mapping.json',
      },
    } as FormpackManifest,
    schema: {
      type: 'object',
      properties: {},
    } as RJSFSchema,
    uiSchema: {} as UiSchema,
  }),
);

const storageState = vi.hoisted(
  (): {
    record: RecordEntry;
    records: RecordEntry[];
    activeRecord: RecordEntry | null;
    hasLoaded: boolean;
    isRecordsLoading: boolean;
    recordsError: string | null;
    snapshots: SnapshotEntry[];
    isSnapshotsLoading: boolean;
    snapshotsError: string | null;
    createRecord: ReturnType<typeof vi.fn>;
    loadRecord: ReturnType<typeof vi.fn>;
    updateActiveRecord: ReturnType<typeof vi.fn>;
    applyRecordUpdate: ReturnType<typeof vi.fn>;
    deleteRecord: ReturnType<typeof vi.fn>;
    setActiveRecord: ReturnType<typeof vi.fn>;
    createSnapshot: ReturnType<typeof vi.fn>;
    loadSnapshot: ReturnType<typeof vi.fn>;
    clearSnapshots: ReturnType<typeof vi.fn>;
    refreshSnapshots: ReturnType<typeof vi.fn>;
    markAsSaved: ReturnType<typeof vi.fn>;
    setLocale: ReturnType<typeof vi.fn>;
  } => {
    const record: RecordEntry = {
      id: 'record-1',
      formpackId: 'notfallpass',
      title: 'Draft',
      locale: 'de',
      data: { field: 'value' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      record,
      records: [record],
      activeRecord: record,
      hasLoaded: true,
      isRecordsLoading: false,
      recordsError: null,
      snapshots: [],
      isSnapshotsLoading: false,
      snapshotsError: null,
      createRecord: vi.fn(),
      loadRecord: vi.fn(),
      updateActiveRecord: vi.fn(),
      applyRecordUpdate: vi.fn(),
      deleteRecord: vi.fn(),
      setActiveRecord: vi.fn(),
      createSnapshot: vi.fn(),
      loadSnapshot: vi.fn(),
      clearSnapshots: vi.fn(),
      refreshSnapshots: vi.fn(),
      markAsSaved: vi.fn(),
      setLocale: vi.fn(),
    };
  },
);

const importState = vi.hoisted(() => ({
  validateJsonImport: vi.fn(),
}));

const storageImportState = vi.hoisted(() => ({
  importRecordWithSnapshots: vi.fn(),
}));

const mockTranslate = (key: string) => key;

vi.mock('../../src/i18n/formpack', () => ({
  loadFormpackI18n: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/i18n/useLocale', () => ({
  useLocale: () => ({
    locale: 'de',
    setLocale: storageState.setLocale,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockTranslate,
    i18n: { language: 'de' },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => undefined,
  },
}));

vi.mock('@rjsf/core', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div className="formpack-form">{children}</div>
  ),
}));

vi.mock('../../src/export/docxLazy', () => ({
  buildDocxExportFilename: vi.fn().mockResolvedValue('docx-export'),
  downloadDocxExport: vi.fn().mockResolvedValue(undefined),
  exportDocx: vi.fn().mockResolvedValue(new Blob(['docx'])),
  getDocxErrorKey: vi.fn().mockResolvedValue('formpackDocxExportError'),
  preloadDocxAssets: vi.fn().mockResolvedValue(undefined),
  scheduleDocxPreload: vi.fn((task: () => Promise<void>) => {
    task().catch(() => undefined);
    return () => undefined;
  }),
}));

vi.mock('../../src/export/json', () => ({
  buildJsonExportPayload: vi.fn(),
  buildJsonExportFilename: vi.fn(),
  downloadJsonExport: vi.fn(),
}));

vi.mock('../../src/import/json', () => ({
  validateJsonImport: importState.validateJsonImport,
}));

vi.mock('../../src/storage/importRecord', () => ({
  importRecordWithSnapshots: storageImportState.importRecordWithSnapshots,
}));

vi.mock('../../src/storage/formpackMeta', () => ({
  getFormpackMeta: vi.fn().mockResolvedValue(null),
  upsertFormpackMeta: vi.fn().mockResolvedValue({
    id: 'notfallpass',
    versionOrHash: '1.0.0',
    version: '1.0.0',
    hash: 'abc',
    updatedAt: '2026-02-28T00:00:00.000Z',
  }),
}));

vi.mock('../../src/storage/profiles', () => ({
  getProfile: vi.fn().mockResolvedValue(null),
  upsertProfile: vi.fn().mockResolvedValue({ data: {} }),
  deleteProfile: vi.fn().mockResolvedValue(undefined),
  hasUsableProfileData: vi.fn().mockReturnValue(false),
}));

vi.mock('../../src/formpacks/documentModel', () => ({
  buildDocumentModel: () => ({
    person: { name: null, birthDate: null },
  }),
}));

vi.mock('../../src/formpacks/loader', () => ({
  FormpackLoaderError: class extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'FormpackLoaderError';
    }
  },
  loadFormpackManifest: vi
    .fn()
    .mockImplementation(async () => formpackState.manifest),
  loadFormpackSchema: vi
    .fn()
    .mockImplementation(async () => formpackState.schema),
  loadFormpackUiSchema: vi
    .fn()
    .mockImplementation(async () => formpackState.uiSchema),
}));

vi.mock('../../src/storage/hooks', () => ({
  useRecords: () => ({
    records: storageState.records,
    activeRecord: storageState.activeRecord,
    isLoading: storageState.isRecordsLoading,
    hasLoaded: storageState.hasLoaded,
    errorCode: storageState.recordsError,
    createRecord: storageState.createRecord,
    loadRecord: storageState.loadRecord,
    updateActiveRecord: storageState.updateActiveRecord,
    applyRecordUpdate: storageState.applyRecordUpdate,
    deleteRecord: storageState.deleteRecord,
    setActiveRecord: storageState.setActiveRecord,
  }),
  useSnapshots: () => ({
    snapshots: storageState.snapshots,
    isLoading: storageState.isSnapshotsLoading,
    errorCode: storageState.snapshotsError,
    createSnapshot: storageState.createSnapshot,
    loadSnapshot: storageState.loadSnapshot,
    clearSnapshots: storageState.clearSnapshots,
    refresh: storageState.refreshSnapshots,
  }),
  useAutosaveRecord: () => ({
    markAsSaved: storageState.markAsSaved,
  }),
}));

vi.mock('../../src/pages/formpack-detail', () => ({
  DevMetadataPanel: () => <div />,
  DocumentPreviewPanel: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FormContentSection: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FormpackDetailHeader: () => <div />,
  QuotaBanner: () => null,
  RecordsPanel: ({
    records,
    activeRecordId,
    onCreateRecord,
    onDeleteRecord,
  }: {
    records: RecordEntry[];
    activeRecordId: string | null;
    onCreateRecord: () => void | Promise<void>;
    onDeleteRecord: (record: RecordEntry) => void | Promise<void>;
  }) => {
    const activeRecord =
      records.find((entry) => entry.id === activeRecordId) ?? records[0];

    return (
      <div>
        <button type="button" onClick={() => onCreateRecord()}>
          trigger-create-record
        </button>
        <button type="button" onClick={() => onDeleteRecord(activeRecord)}>
          trigger-delete-active
        </button>
      </div>
    );
  },
  ImportPanel: ({
    onImportModeChange,
    onImport,
    importError,
  }: {
    onImportModeChange: (mode: 'new' | 'overwrite') => void;
    onImport: () => void | Promise<void>;
    importError: string | null;
  }) => {
    const triggerImport = () => {
      const maybePromise = onImport();
      if (maybePromise instanceof Promise) {
        maybePromise.catch(() => undefined);
      }
    };

    return (
      <div>
        <button type="button" onClick={() => onImportModeChange('overwrite')}>
          trigger-set-overwrite
        </button>
        <button type="button" onClick={triggerImport}>
          trigger-import
        </button>
        {importError && <p>{importError}</p>}
      </div>
    );
  },
  SnapshotsPanel: ({
    onCreateSnapshot,
    onRestoreSnapshot,
    onClearSnapshots,
  }: {
    onCreateSnapshot: () => void | Promise<void>;
    onRestoreSnapshot: (snapshotId: string) => void | Promise<void>;
    onClearSnapshots: () => void | Promise<void>;
  }) => (
    <div>
      <button type="button" onClick={() => onCreateSnapshot()}>
        trigger-create-snapshot
      </button>
      <button type="button" onClick={() => onRestoreSnapshot(SNAPSHOT_ID)}>
        trigger-restore-snapshot
      </button>
      <button type="button" onClick={() => onClearSnapshots()}>
        trigger-clear-snapshots
      </button>
    </div>
  ),
}));

describe('FormpackDetailPage guard paths', () => {
  beforeEach(() => {
    storageState.records = [storageState.record];
    storageState.activeRecord = storageState.record;
    storageState.hasLoaded = true;
    storageState.isRecordsLoading = false;
    storageState.recordsError = null;
    storageState.snapshots = [];
    storageState.isSnapshotsLoading = false;
    storageState.snapshotsError = null;
    storageState.createRecord.mockReset();
    storageState.loadRecord.mockReset();
    storageState.updateActiveRecord.mockReset();
    storageState.applyRecordUpdate.mockReset();
    storageState.deleteRecord.mockReset();
    storageState.setActiveRecord.mockReset();
    storageState.createSnapshot.mockReset();
    storageState.loadSnapshot.mockReset();
    storageState.clearSnapshots.mockReset();
    storageState.refreshSnapshots.mockReset();
    storageState.markAsSaved.mockReset();
    storageState.setLocale.mockReset();
    importState.validateJsonImport.mockReset();
    storageImportState.importRecordWithSnapshots.mockReset();

    formpackState.manifest = {
      ...formpackState.manifest,
      id: 'notfallpass',
      titleKey: 'formpackTitle',
    };
    formpackState.schema = {
      type: 'object',
      properties: {},
    };
    formpackState.uiSchema = {};

    importState.validateJsonImport.mockReturnValue({
      payload: {
        version: 1,
        formpack: { id: 'notfallpass', version: '1.0.0' },
        record: {
          title: 'Imported',
          locale: 'de',
          data: { field: 'imported' },
        },
        revisions: [],
      },
      error: null,
    });

    storageImportState.importRecordWithSnapshots.mockResolvedValue(
      storageState.record,
    );
  });

  it('returns early when deleting the active record', async () => {
    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    fireEvent.click(await screen.findByText('trigger-delete-active'));

    expect(storageState.deleteRecord).not.toHaveBeenCalled();
  });

  it('returns early for snapshot handlers when no active record exists', async () => {
    storageState.activeRecord = null;
    storageState.hasLoaded = false;

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    fireEvent.click(await screen.findByText('trigger-create-snapshot'));
    fireEvent.click(screen.getByText('trigger-restore-snapshot'));
    fireEvent.click(screen.getByText('trigger-clear-snapshots'));

    expect(storageState.createSnapshot).not.toHaveBeenCalled();
    expect(storageState.loadSnapshot).not.toHaveBeenCalled();
    expect(storageState.clearSnapshots).not.toHaveBeenCalled();
  });

  it('returns import errors early when formpack id is missing in overwrite mode', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
      id: '',
    };

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    fireEvent.click(await screen.findByText('trigger-set-overwrite'));
    fireEvent.click(screen.getByText('trigger-import'));

    await waitFor(() =>
      expect(screen.getByText('importNoActiveRecord')).toBeInTheDocument(),
    );
    expect(storageImportState.importRecordWithSnapshots).not.toHaveBeenCalled();
  });

  it('returns early for new import when formpack id is missing', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
      id: '',
    };

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    fireEvent.click(await screen.findByText('trigger-import'));

    await waitFor(() =>
      expect(importState.validateJsonImport).toHaveBeenCalledWith(
        '',
        expect.any(Object),
        '',
      ),
    );
    expect(storageImportState.importRecordWithSnapshots).not.toHaveBeenCalled();
  });
});
