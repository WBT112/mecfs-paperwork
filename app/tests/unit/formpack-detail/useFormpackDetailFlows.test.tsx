import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangeEvent, MouseEvent } from 'react';

const mocked = vi.hoisted(() => ({
  buildDocxExportFilename: vi.fn(),
  buildJsonExportFilename: vi.fn(),
  buildJsonExportPayload: vi.fn(),
  decryptJsonWithPassword: vi.fn(),
  downloadDocxExport: vi.fn(),
  downloadJsonExport: vi.fn(),
  encryptJsonWithPassword: vi.fn(),
  exportDocx: vi.fn(),
  getActionButtonDataAction: vi.fn(),
  getDocxErrorKey: vi.fn(),
  importRecordWithSnapshots: vi.fn(),
  isJsonEncryptionRuntimeError: vi.fn(),
  loadJsonEncryptionModule: vi.fn(),
  preloadDocxAssets: vi.fn(),
  requestConfirmation: vi.fn(),
  resolveImportErrorMessage: vi.fn(),
  resolveJsonEncryptionErrorMessage: vi.fn(),
  scheduleDocxPreload: vi.fn(),
  startUserTiming: vi.fn(),
  tryParseEncryptedEnvelope: vi.fn(),
  validateJsonImport: vi.fn(),
}));

vi.mock('../../../src/import/json', () => ({
  validateJsonImport: mocked.validateJsonImport,
}));

vi.mock('../../../src/storage', () => ({
  importRecordWithSnapshots: mocked.importRecordWithSnapshots,
}));

vi.mock('../../../src/export/json', () => ({
  buildJsonExportFilename: mocked.buildJsonExportFilename,
  buildJsonExportPayload: mocked.buildJsonExportPayload,
  downloadJsonExport: mocked.downloadJsonExport,
}));

vi.mock('../../../src/export/docxLazy', () => ({
  buildDocxExportFilename: mocked.buildDocxExportFilename,
  downloadDocxExport: mocked.downloadDocxExport,
  exportDocx: mocked.exportDocx,
  getDocxErrorKey: mocked.getDocxErrorKey,
  preloadDocxAssets: mocked.preloadDocxAssets,
  scheduleDocxPreload: mocked.scheduleDocxPreload,
}));

vi.mock('../../../src/pages/formpack-detail/formpackDetailHelpers', () => ({
  formpackDetailHelpers: {
    getActionButtonDataAction: mocked.getActionButtonDataAction,
    isJsonEncryptionRuntimeError: mocked.isJsonEncryptionRuntimeError,
    loadJsonEncryptionModule: mocked.loadJsonEncryptionModule,
    resolveImportErrorMessage: mocked.resolveImportErrorMessage,
    resolveJsonEncryptionErrorMessage: mocked.resolveJsonEncryptionErrorMessage,
    tryParseEncryptedEnvelope: mocked.tryParseEncryptedEnvelope,
  },
}));

vi.mock('../../../src/lib/performance/userTiming', async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import('../../../src/lib/performance/userTiming')
    >();
  return {
    ...original,
    startUserTiming: mocked.startUserTiming,
  };
});

import { useExportFlow } from '../../../src/pages/formpack-detail/useExportFlow';
import { useImportFlow } from '../../../src/pages/formpack-detail/useImportFlow';
import { useSnapshotManager } from '../../../src/pages/formpack-detail/useSnapshotManager';
import type { FormpackManifest, FormpackId } from '../../../src/formpacks';
import type { RecordEntry, SnapshotEntry } from '../../../src/storage';

const FORM_ID: FormpackId = 'doctor-letter';
const RECORD: RecordEntry = {
  id: 'record-1',
  formpackId: FORM_ID,
  locale: 'de' as const,
  title: 'Draft',
  createdAt: '2026-03-06T09:00:00.000Z',
  updatedAt: '2026-03-06T10:00:00.000Z',
  data: { field: 'value' },
};
const SNAPSHOT: SnapshotEntry = {
  id: 'snapshot-1',
  recordId: RECORD.id,
  label: 'Snapshot',
  createdAt: '2026-03-06T10:10:00.000Z',
  data: { field: 'snapshot' },
};
const MANIFEST: FormpackManifest = {
  id: FORM_ID,
  version: '1.0.0',
  titleKey: 'title',
  descriptionKey: 'description',
  defaultLocale: 'de',
  locales: ['de', 'en'],
  visibility: 'public',
  exports: ['json', 'docx', 'pdf'],
  docx: {
    templates: {
      a4: '/templates/a4.docx',
    },
    mapping: '/templates/mapping.json',
  },
};
const OFFLABEL_MANIFEST: FormpackManifest = {
  ...MANIFEST,
  id: 'offlabel-antrag',
};
const NOTFALLPASS_MANIFEST: FormpackManifest = {
  ...MANIFEST,
  id: 'notfallpass',
  docx: {
    templates: {
      a4: '/templates/a4.docx',
      wallet: '/templates/wallet.docx',
    },
    mapping: '/templates/mapping.json',
  },
};

const createTiming = () => ({ end: vi.fn() });
const JSON_EXPORT_FILENAME = 'export.json';
const DOCX_EXPORT_FILENAME = 'export.docx';
const ENCRYPTED_IMPORT_FILE = new File(['encrypted'], 'encrypted.json');
const EMPTY_OBJECT_SCHEMA = { type: 'object' } as const;

const createFileChangeEvent = (files: File[]): ChangeEvent<HTMLInputElement> =>
  ({ target: { files } }) as unknown as ChangeEvent<HTMLInputElement>;

const createActionEvent = (): MouseEvent<HTMLDivElement> =>
  ({
    target: document.createElement('button'),
  }) as unknown as MouseEvent<HTMLDivElement>;

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const renderImportFlow = (overrides?: {
  activeRecord?: RecordEntry | null;
  formpackId?: FormpackId | null;
  initialImportMode?: 'new' | 'overwrite';
  requestConfirmation?: typeof mocked.requestConfirmation;
}) =>
  renderHook(() =>
    useImportFlow({
      activeRecord: overrides?.activeRecord ?? RECORD,
      applyRecordUpdate: vi.fn(),
      formpackId:
        overrides?.formpackId === undefined ? FORM_ID : overrides.formpackId,
      initialImportMode: overrides?.initialImportMode,
      importInputRef: { current: document.createElement('input') },
      manifest: MANIFEST,
      markAsSaved: vi.fn(),
      persistActiveRecordId: vi.fn(),
      refreshSnapshots: vi.fn(),
      requestConfirmation:
        overrides?.requestConfirmation ?? mocked.requestConfirmation,
      schema: EMPTY_OBJECT_SCHEMA,
      setFormData: vi.fn(),
      setLocale: vi.fn().mockResolvedValue(undefined),
      t: (key) => key,
      title: '',
    }),
  );

describe('formpack detail flow hooks', () => {
  beforeEach(() => {
    Object.values(mocked).forEach((value) => {
      if ('mockReset' in value) {
        value.mockReset();
      }
    });
    mocked.loadJsonEncryptionModule.mockResolvedValue({
      decryptJsonWithPassword: mocked.decryptJsonWithPassword,
      encryptJsonWithPassword: mocked.encryptJsonWithPassword,
    });
    mocked.resolveImportErrorMessage.mockReturnValue('importResolvedError');
    mocked.resolveJsonEncryptionErrorMessage.mockReturnValue(
      'formpackJsonExportError',
    );
    mocked.scheduleDocxPreload.mockImplementation((callback: () => void) => {
      callback();
      return () => undefined;
    });
    mocked.startUserTiming.mockReturnValue(createTiming());
    mocked.tryParseEncryptedEnvelope.mockReturnValue(null);
    mocked.getActionButtonDataAction.mockReturnValue('docx-export');
    mocked.isJsonEncryptionRuntimeError.mockReturnValue(false);
    mocked.getDocxErrorKey.mockResolvedValue('formpackDocxExportError');
  });

  it('imports a new JSON record and resets transient import state after success', async () => {
    const applyRecordUpdate = vi.fn();
    const markAsSaved = vi.fn();
    const persistActiveRecordId = vi.fn();
    const refreshSnapshots = vi.fn();
    const setLocale = vi.fn().mockResolvedValue(undefined);
    const setFormData = vi.fn();
    const importInput = document.createElement('input');
    importInput.value = 'filled';
    const file = new File(['{"ok":true}'], 'import.json', {
      type: 'application/json',
    });
    const importedRecord = {
      ...RECORD,
      id: 'record-2',
      data: { imported: true },
    };
    mocked.validateJsonImport.mockReturnValue({
      error: null,
      payload: {
        record: {
          title: 'Imported',
          locale: 'en',
          data: importedRecord.data,
        },
        revisions: [],
      },
    });
    mocked.importRecordWithSnapshots.mockResolvedValue(importedRecord);

    const { result } = renderHook(() =>
      useImportFlow({
        activeRecord: RECORD,
        applyRecordUpdate,
        formpackId: FORM_ID,
        importInputRef: { current: importInput },
        manifest: MANIFEST,
        markAsSaved,
        persistActiveRecordId,
        refreshSnapshots,
        requestConfirmation: mocked.requestConfirmation,
        schema: { type: 'object' },
        setFormData,
        setLocale,
        t: (key) => key,
        title: 'Fallback title',
      }),
    );

    await act(async () => {
      await result.current.handleImportFileChange(
        createFileChangeEvent([file]),
      );
    });
    await act(async () => {
      await result.current.handleImport();
    });

    expect(mocked.importRecordWithSnapshots).toHaveBeenCalledWith(
      expect.objectContaining({
        formpackId: FORM_ID,
        mode: 'new',
        title: 'Imported',
      }),
    );
    expect(applyRecordUpdate).toHaveBeenCalledWith(importedRecord);
    expect(markAsSaved).toHaveBeenCalledWith(importedRecord.data);
    expect(setFormData).toHaveBeenCalledWith(importedRecord.data);
    expect(persistActiveRecordId).toHaveBeenCalledWith(importedRecord.id);
    expect(setLocale).toHaveBeenCalledWith('en');
    expect(refreshSnapshots).not.toHaveBeenCalled();
    expect(result.current.importSuccess).toBe('importSuccess');
    expect(result.current.importFileName).toBeNull();
    expect(result.current.importPassword).toBe('');
    expect(result.current.isImportFileEncrypted).toBe(false);
    expect(importInput.value).toBe('');

    act(() => {
      result.current.clearImportSuccess();
    });
    expect(result.current.importSuccess).toBeNull();
  });

  it('keeps encrypted imports blocked until a password is provided and reports validation errors', async () => {
    const decryptResult = '{"decrypted":true}';
    mocked.tryParseEncryptedEnvelope.mockReturnValue({ kind: 'encrypted' });
    mocked.decryptJsonWithPassword.mockResolvedValue(decryptResult);
    mocked.validateJsonImport
      .mockReturnValueOnce({ error: 'broken-import', payload: null })
      .mockReturnValueOnce({
        error: null,
        payload: {
          record: {
            locale: 'de',
            data: RECORD.data,
          },
          revisions: [],
        },
      });
    mocked.importRecordWithSnapshots.mockResolvedValue(RECORD);

    const { result } = renderImportFlow();

    await act(async () => {
      await result.current.handleImportFileChange(
        createFileChangeEvent([ENCRYPTED_IMPORT_FILE]),
      );
    });
    await act(async () => {
      await result.current.handleImport();
    });
    expect(result.current.importError).toBe('importPasswordRequired');
    expect(mocked.validateJsonImport).not.toHaveBeenCalled();

    act(() => {
      result.current.setImportPassword('secret');
    });
    await act(async () => {
      await result.current.handleImport();
    });
    expect(mocked.decryptJsonWithPassword).toHaveBeenCalledWith(
      { kind: 'encrypted' },
      'secret',
    );
    expect(mocked.validateJsonImport).toHaveBeenCalledWith(
      decryptResult,
      { type: 'object' },
      FORM_ID,
    );
    expect(result.current.importError).toBe('importResolvedError');
  });

  it('handles overwrite confirmation, revision refresh, storage failures, and empty file selections', async () => {
    const setLocale = vi.fn().mockResolvedValue(undefined);
    const refreshSnapshots = vi.fn().mockResolvedValue(undefined);
    const applyRecordUpdate = vi.fn();
    const file = new File(['{"ok":true}'], 'import.json');
    const requestConfirmation = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    mocked.validateJsonImport
      .mockReturnValueOnce({
        error: null,
        payload: {
          record: {
            locale: 'de',
            data: { overwrite: 1 },
          },
          revisions: [SNAPSHOT],
        },
      })
      .mockReturnValueOnce({
        error: null,
        payload: {
          record: {
            locale: 'de',
            data: { overwrite: 2 },
          },
          revisions: [SNAPSHOT],
        },
      });
    mocked.importRecordWithSnapshots
      .mockResolvedValueOnce({ ...RECORD, data: { overwrite: 2 } })
      .mockRejectedValueOnce(new Error('storage failed'));

    const { result, rerender } = renderHook(
      ({ activeRecord }: { activeRecord: RecordEntry | null }) =>
        useImportFlow({
          activeRecord,
          applyRecordUpdate,
          formpackId: FORM_ID,
          importInputRef: { current: document.createElement('input') },
          manifest: MANIFEST,
          markAsSaved: vi.fn(),
          persistActiveRecordId: vi.fn(),
          refreshSnapshots,
          requestConfirmation,
          schema: EMPTY_OBJECT_SCHEMA,
          setFormData: vi.fn(),
          setLocale,
          t: (key) => key,
          title: '',
        }),
      {
        initialProps: { activeRecord: RECORD as RecordEntry | null },
      },
    );

    await act(async () => {
      await result.current.handleImportFileChange(
        createFileChangeEvent([file]),
      );
    });
    act(() => {
      result.current.setImportMode('overwrite');
    });
    await act(async () => {
      await result.current.handleImport();
    });
    expect(mocked.importRecordWithSnapshots).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleImport();
    });
    expect(mocked.importRecordWithSnapshots).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'overwrite',
        recordId: RECORD.id,
        revisions: [SNAPSHOT],
      }),
    );
    expect(refreshSnapshots).toHaveBeenCalled();

    await act(async () => {
      await result.current.handleImport();
    });
    expect(result.current.importError).toBe('importStorageError');

    rerender({ activeRecord: null });
    act(() => {
      result.current.setImportMode('overwrite');
    });
    await flushMicrotasks();
    expect(result.current.importMode).toBe('new');

    await act(async () => {
      await result.current.handleImportFileChange(createFileChangeEvent([]));
    });
    expect(result.current.importFileName).toBeNull();
  });

  it('maps import encryption runtime failures and unreadable files to translated errors', async () => {
    const badFile = {
      name: 'broken.json',
      text: vi.fn().mockRejectedValue(new Error('nope')),
    } as unknown as File;
    mocked.tryParseEncryptedEnvelope.mockReturnValue({ kind: 'encrypted' });
    mocked.isJsonEncryptionRuntimeError.mockReturnValue(true);
    mocked.decryptJsonWithPassword.mockRejectedValue(
      new Error('decrypt failed'),
    );

    const { result } = renderImportFlow();

    await act(async () => {
      await result.current.handleImportFileChange(
        createFileChangeEvent([badFile]),
      );
    });
    expect(result.current.importError).toBe('importInvalidJson');

    await act(async () => {
      await result.current.handleImportFileChange(
        createFileChangeEvent([ENCRYPTED_IMPORT_FILE]),
      );
    });
    act(() => {
      result.current.setImportPassword('secret');
    });
    await act(async () => {
      await result.current.handleImport();
    });
    expect(result.current.importError).toBe('formpackJsonExportError');
  });

  it('tracks successful file reads and covers missing formpack imports', async () => {
    const readableFile = {
      name: 'plain.json',
      text: vi.fn().mockResolvedValue('plain-content'),
    } as unknown as File;
    const noFormpack = renderImportFlow({ formpackId: null });

    await act(async () => {
      await noFormpack.result.current.handleImportFileChange(
        createFileChangeEvent([readableFile]),
      );
    });
    expect(noFormpack.result.current.importFileName).toBe('plain.json');
    expect(noFormpack.result.current.isImportFileEncrypted).toBe(false);
    mocked.validateJsonImport.mockReturnValueOnce({
      error: null,
      payload: {
        record: {
          locale: 'de',
          data: { created: true },
        },
        revisions: [],
      },
    });
    await act(async () => {
      await noFormpack.result.current.handleImport();
    });
    expect(mocked.importRecordWithSnapshots).not.toHaveBeenCalled();
    expect(noFormpack.result.current.importSuccess).toBeNull();
  });

  it('ignores imports when required formpack assets are missing', async () => {
    const { result } = renderHook(() =>
      useImportFlow({
        activeRecord: RECORD,
        applyRecordUpdate: vi.fn(),
        formpackId: FORM_ID,
        importInputRef: { current: document.createElement('input') },
        manifest: null,
        markAsSaved: vi.fn(),
        persistActiveRecordId: vi.fn(),
        refreshSnapshots: vi.fn(),
        requestConfirmation: mocked.requestConfirmation,
        schema: null,
        setFormData: vi.fn(),
        setLocale: vi.fn().mockResolvedValue(undefined),
        t: (key) => key,
        title: '',
      }),
    );

    await act(async () => {
      await result.current.handleImport();
    });
    expect(mocked.validateJsonImport).not.toHaveBeenCalled();
    expect(result.current.isImporting).toBe(false);
  });

  it('resets import state safely when no file input element is mounted', async () => {
    const { result } = renderHook(() =>
      useImportFlow({
        activeRecord: RECORD,
        applyRecordUpdate: vi.fn(),
        formpackId: FORM_ID,
        importInputRef: { current: null },
        manifest: MANIFEST,
        markAsSaved: vi.fn(),
        persistActiveRecordId: vi.fn(),
        refreshSnapshots: vi.fn(),
        requestConfirmation: mocked.requestConfirmation,
        schema: EMPTY_OBJECT_SCHEMA,
        setFormData: vi.fn(),
        setLocale: vi.fn().mockResolvedValue(undefined),
        t: (key) => key,
        title: '',
      }),
    );

    await act(async () => {
      await result.current.handleImportFileChange(createFileChangeEvent([]));
    });
    expect(result.current.importFileName).toBeNull();
    expect(result.current.importError).toBeNull();
  });

  it('uses fallback titles and omits revisions when import revision carry-over is disabled', async () => {
    const overwriteConfirmation = vi.fn().mockResolvedValue(true);
    mocked.importRecordWithSnapshots
      .mockResolvedValueOnce({ ...RECORD, data: { created: true } })
      .mockResolvedValueOnce({ ...RECORD, data: { overwritten: true } });

    const newImport = renderImportFlow();
    await act(async () => {
      await newImport.result.current.handleImportFileChange(
        createFileChangeEvent([ENCRYPTED_IMPORT_FILE]),
      );
    });
    act(() => {
      newImport.result.current.setImportIncludeRevisions(false);
    });
    mocked.validateJsonImport.mockReturnValueOnce({
      error: null,
      payload: {
        record: {
          locale: 'de',
          data: { created: true },
        },
        revisions: [SNAPSHOT],
      },
    });
    await act(async () => {
      await newImport.result.current.handleImport();
    });
    expect(mocked.importRecordWithSnapshots).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'new',
        title: 'formpackRecordUntitled',
        revisions: [],
      }),
    );

    const overwriteImport = renderImportFlow({
      initialImportMode: 'overwrite',
      requestConfirmation: overwriteConfirmation,
    });
    await act(async () => {
      await overwriteImport.result.current.handleImportFileChange(
        createFileChangeEvent([ENCRYPTED_IMPORT_FILE]),
      );
    });
    act(() => {
      overwriteImport.result.current.setImportIncludeRevisions(false);
    });
    mocked.validateJsonImport.mockReturnValueOnce({
      error: null,
      payload: {
        record: {
          title: 'Updated',
          locale: 'de',
          data: { overwritten: true },
        },
        revisions: [SNAPSHOT],
      },
    });
    await act(async () => {
      await overwriteImport.result.current.handleImport();
    });
    expect(mocked.importRecordWithSnapshots).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: 'overwrite',
        revisions: [],
      }),
    );
  });

  it('creates, restores, and clears snapshots with confirmation handling', async () => {
    const setFormData = vi.fn();
    const setPendingFormFocus = vi.fn();
    const markAsSaved = vi.fn();
    const updateActiveRecord = vi
      .fn()
      .mockResolvedValueOnce({ ...RECORD, data: SNAPSHOT.data })
      .mockResolvedValueOnce(null);
    const requestConfirmation = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const { result, rerender } = renderHook(
      ({ activeRecord }: { activeRecord: RecordEntry | null }) =>
        useSnapshotManager({
          activeRecord,
          buildSnapshotLabel: () => 'snapshot-label',
          clearSnapshots: vi.fn().mockResolvedValue(1),
          createSnapshot: vi.fn().mockResolvedValue(SNAPSHOT),
          formData: { draft: true },
          loadSnapshot: vi
            .fn()
            .mockResolvedValueOnce(SNAPSHOT)
            .mockResolvedValueOnce(SNAPSHOT)
            .mockResolvedValueOnce(null),
          markAsSaved,
          requestConfirmation,
          setFormData,
          setPendingFormFocus,
          t: (key) => key,
          updateActiveRecord,
        }),
      {
        initialProps: { activeRecord: RECORD as RecordEntry | null },
      },
    );

    await act(async () => {
      await result.current.handleCreateSnapshot();
      await result.current.handleRestoreSnapshot(SNAPSHOT.id);
      await result.current.handleRestoreSnapshot(SNAPSHOT.id);
      await result.current.handleRestoreSnapshot(SNAPSHOT.id);
      await result.current.handleClearSnapshots();
      await result.current.handleClearSnapshots();
    });

    expect(setFormData).toHaveBeenCalledWith(SNAPSHOT.data);
    expect(markAsSaved).toHaveBeenCalledWith(SNAPSHOT.data);
    expect(setPendingFormFocus).toHaveBeenCalledTimes(2);
    expect(updateActiveRecord).toHaveBeenCalledTimes(2);
    expect(requestConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'formpackSnapshotsClearAllConfirm',
      }),
    );

    rerender({ activeRecord: null });
    await act(async () => {
      await result.current.handleCreateSnapshot();
      await result.current.handleRestoreSnapshot(SNAPSHOT.id);
      await result.current.handleClearSnapshots();
    });
    expect(updateActiveRecord).toHaveBeenCalledTimes(2);
  });

  it('exports JSON, DOCX, and PDF flows while resetting status banners by action type', async () => {
    const timing = createTiming();
    mocked.startUserTiming.mockReturnValue(timing);
    mocked.buildJsonExportPayload.mockReturnValue({ payload: true });
    mocked.buildJsonExportFilename.mockReturnValue(JSON_EXPORT_FILENAME);
    mocked.encryptJsonWithPassword.mockResolvedValue({ encrypted: true });
    mocked.exportDocx.mockResolvedValue('docx-report');
    mocked.buildDocxExportFilename.mockResolvedValue(DOCX_EXPORT_FILENAME);

    const { result, rerender } = renderHook(
      ({ manifest }: { manifest: FormpackManifest }) =>
        useExportFlow({
          activeRecord: RECORD,
          formData: RECORD.data,
          formSchema: EMPTY_OBJECT_SCHEMA,
          formpackId: manifest.id as FormpackId,
          locale: 'de',
          manifest,
          offlabelOutputLocale: manifest.id === 'offlabel-antrag' ? 'de' : 'en',
          previewUiSchema: {},
          schema: EMPTY_OBJECT_SCHEMA,
          snapshots: [SNAPSHOT],
          t: (key) => key,
        }),
      {
        initialProps: { manifest: MANIFEST },
      },
    );

    await act(async () => {
      await result.current.handleExportJson();
    });
    expect(mocked.downloadJsonExport).toHaveBeenCalledWith(
      { payload: true },
      JSON_EXPORT_FILENAME,
    );

    const nullSchemaExport = renderHook(() =>
      useExportFlow({
        activeRecord: RECORD,
        formData: RECORD.data,
        formSchema: EMPTY_OBJECT_SCHEMA,
        formpackId: FORM_ID,
        locale: 'de',
        manifest: MANIFEST,
        offlabelOutputLocale: 'en',
        previewUiSchema: {},
        schema: null,
        snapshots: [],
        t: (key) => key,
      }),
    );
    await act(async () => {
      await nullSchemaExport.result.current.handleExportJson();
    });
    expect(mocked.buildJsonExportPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: undefined,
      }),
    );

    act(() => {
      result.current.setEncryptJsonExport(true);
    });
    await act(async () => {
      await result.current.handleExportJson();
    });
    expect(result.current.jsonExportError).toBe(
      'formpackJsonExportPasswordRequired',
    );

    act(() => {
      result.current.setJsonExportPassword('a');
      result.current.setJsonExportPasswordConfirm('b');
    });
    await act(async () => {
      await result.current.handleExportJson();
    });
    expect(result.current.jsonExportError).toBe(
      'formpackJsonExportPasswordMismatch',
    );

    act(() => {
      result.current.setJsonExportPassword('secret');
      result.current.setJsonExportPasswordConfirm('secret');
    });
    await act(async () => {
      await result.current.handleExportJson();
      await result.current.handleExportDocx();
    });
    expect(mocked.downloadJsonExport).toHaveBeenLastCalledWith(
      { encrypted: true },
      JSON_EXPORT_FILENAME,
    );
    expect(mocked.exportDocx).toHaveBeenCalledWith(
      expect.objectContaining({
        formpackId: FORM_ID,
        recordId: RECORD.id,
        locale: 'en',
      }),
    );
    expect(mocked.downloadDocxExport).toHaveBeenCalledWith(
      'docx-report',
      DOCX_EXPORT_FILENAME,
    );
    expect(result.current.docxSuccess).toBe('formpackDocxExportSuccess');
    act(() => {
      result.current.clearDocxSuccess();
    });
    expect(result.current.docxSuccess).toBeNull();

    await act(async () => {
      await result.current.handleExportDocx();
    });

    act(() => {
      result.current.handlePdfExportSuccess();
    });
    act(() => {
      result.current.handleActionClickCapture(createActionEvent());
    });
    expect(result.current.pdfSuccess).toBeNull();

    mocked.getActionButtonDataAction.mockReturnValueOnce('json-import');
    act(() => {
      result.current.handleActionClickCapture(createActionEvent());
    });
    expect(result.current.docxSuccess).toBeNull();

    act(() => {
      result.current.handlePdfExportSuccess();
    });
    await act(async () => {
      await result.current.handleExportDocx();
    });
    mocked.getActionButtonDataAction.mockReturnValueOnce('reset-form');
    act(() => {
      result.current.handleActionClickCapture(createActionEvent());
    });
    expect(result.current.docxSuccess).toBeNull();
    expect(result.current.pdfSuccess).toBeNull();

    mocked.getActionButtonDataAction.mockReturnValueOnce(null);
    act(() => {
      result.current.handleActionClickCapture(createActionEvent());
      result.current.handlePdfExportError();
    });
    expect(result.current.pdfError).toBe('formpackPdfExportError');

    rerender({ manifest: NOTFALLPASS_MANIFEST });
    await waitFor(() => {
      expect(result.current.docxTemplateOptions).toHaveLength(2);
    });
    act(() => {
      result.current.setDocxTemplateId('wallet');
    });
    rerender({ manifest: OFFLABEL_MANIFEST });
    await waitFor(() => {
      expect(result.current.docxTemplateId).toBe('a4');
    });
    expect(mocked.preloadDocxAssets).toHaveBeenCalled();

    act(() => {
      result.current.setEncryptJsonExport(false);
    });
    expect(result.current.jsonExportPassword).toBe('');
    expect(result.current.jsonExportPasswordConfirm).toBe('');
    expect(timing.end).toHaveBeenCalled();
  });

  it('maps export encryption and DOCX runtime errors and ignores guarded actions', async () => {
    mocked.buildJsonExportPayload.mockReturnValue({ payload: true });
    mocked.buildJsonExportFilename.mockReturnValue(JSON_EXPORT_FILENAME);
    mocked.encryptJsonWithPassword.mockRejectedValue(new Error('encrypt fail'));
    mocked.exportDocx.mockRejectedValue(new Error('docx fail'));
    mocked.getDocxErrorKey.mockResolvedValue('docxErrorKey');

    const { result } = renderHook(() =>
      useExportFlow({
        activeRecord: RECORD,
        formData: RECORD.data,
        formSchema: EMPTY_OBJECT_SCHEMA,
        formpackId: FORM_ID,
        locale: 'de',
        manifest: MANIFEST,
        offlabelOutputLocale: 'en',
        previewUiSchema: {},
        schema: EMPTY_OBJECT_SCHEMA,
        snapshots: [],
        t: (key) => key,
      }),
    );

    act(() => {
      result.current.setEncryptJsonExport(true);
      result.current.setJsonExportPassword('secret');
      result.current.setJsonExportPasswordConfirm('secret');
    });
    await act(async () => {
      await result.current.handleExportJson();
      await result.current.handleExportDocx();
    });
    expect(result.current.jsonExportError).toBe('formpackJsonExportError');
    expect(result.current.docxError).toBe('docxErrorKey');

    const guarded = renderHook(() =>
      useExportFlow({
        activeRecord: null,
        formData: {},
        formSchema: null,
        formpackId: null,
        locale: 'de',
        manifest: null,
        offlabelOutputLocale: 'de',
        previewUiSchema: null,
        schema: null,
        snapshots: [],
        t: (key) => key,
      }),
    );
    await act(async () => {
      await guarded.result.current.handleExportJson();
      await guarded.result.current.handleExportDocx();
    });
    expect(mocked.buildJsonExportPayload).toHaveBeenCalledTimes(1);
    expect(mocked.exportDocx).toHaveBeenCalledTimes(1);
  });
});
