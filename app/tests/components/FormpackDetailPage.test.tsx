import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FormpackDetailPage from '../../src/pages/FormpackDetailPage';
import { exportDocx } from '../../src/export/docx';
import type { FormpackManifest } from '../../src/formpacks/types';

const formpackState = vi.hoisted(() => ({
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
        wallet: 'template-wallet.docx',
      },
      mapping: 'mapping.json',
    },
  } as FormpackManifest,
  schema: {
    type: 'object',
    properties: {},
  },
  uiSchema: {},
}));

const storageState = vi.hoisted(() => {
  const record = {
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
    activeRecord: record as typeof record | null,
    isRecordsLoading: false,
    hasLoaded: true,
    recordsError: null as string | null,
    createRecord: vi.fn(),
    loadRecord: vi.fn(),
    updateActiveRecord: vi.fn(),
    applyRecordUpdate: vi.fn(),
    setActiveRecord: vi.fn(),
    snapshots: [] as Array<unknown>,
    isSnapshotsLoading: false,
    snapshotsError: null as string | null,
    createSnapshot: vi.fn(),
    loadSnapshot: vi.fn(),
    refreshSnapshots: vi.fn(),
    markAsSaved: vi.fn(),
    setLocale: vi.fn(),
  };
});

const record = storageState.record;
const mockUpdateActiveRecord = storageState.updateActiveRecord;
const mockMarkAsSaved = storageState.markAsSaved;
const FORMPACK_ROUTE = '/formpacks/notfallpass';

vi.mock('../../src/export/docx', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../src/export/docx')>();
  return {
    ...original,
    exportDocx: vi.fn(),
  };
});

vi.mock('@rjsf/core', () => ({
  default: ({
    children,
    formData,
    onChange,
  }: {
    children?: React.ReactNode;
    formData?: Record<string, unknown>;
    onChange?: (event: { formData: Record<string, unknown> }) => void;
  }) => (
    <div>
      <div data-testid="form-data">{JSON.stringify(formData)}</div>
      <button
        type="button"
        onClick={() => onChange?.({ formData: { field: 'value' } })}
      >
        trigger-change
      </button>
      {children}
    </div>
  ),
}));

vi.mock('../../src/i18n/formpack', () => ({
  loadFormpackI18n: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/i18n/useLocale', () => ({
  useLocale: () => ({
    locale: 'de',
    setLocale: storageState.setLocale,
  }),
}));

vi.mock('../../src/formpacks/documentModel', () => ({
  buildDocumentModel: () => ({
    diagnosisParagraphs: [],
    person: { name: null, birthDate: null },
    contacts: [],
    diagnoses: { formatted: null },
    symptoms: null,
    medications: [],
    allergies: null,
    doctor: { name: null, phone: null },
  }),
}));

vi.mock('../../src/formpacks/loader', () => ({
  FormpackLoaderError: class extends Error {},
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
    setActiveRecord: storageState.setActiveRecord,
  }),
  useSnapshots: () => ({
    snapshots: storageState.snapshots,
    isLoading: storageState.isSnapshotsLoading,
    errorCode: storageState.snapshotsError,
    createSnapshot: storageState.createSnapshot,
    loadSnapshot: storageState.loadSnapshot,
    refresh: storageState.refreshSnapshots,
  }),
  useAutosaveRecord: () => ({
    markAsSaved: storageState.markAsSaved,
  }),
}));

const mockT = (key: string) => key;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'de' },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => undefined,
  },
}));

describe('FormpackDetailPage', () => {
  beforeEach(() => {
    storageState.records = [storageState.record];
    storageState.activeRecord = storageState.record;
    storageState.isRecordsLoading = false;
    storageState.hasLoaded = true;
    storageState.recordsError = null;
    storageState.snapshots = [];
    storageState.isSnapshotsLoading = false;
    storageState.snapshotsError = null;
    storageState.createRecord.mockReset();
    storageState.loadRecord.mockReset();
    storageState.applyRecordUpdate.mockReset();
    storageState.setActiveRecord.mockReset();
    storageState.createSnapshot.mockReset();
    storageState.loadSnapshot.mockReset();
    storageState.refreshSnapshots.mockReset();
    storageState.markAsSaved.mockReset();
    storageState.setLocale.mockReset();
    formpackState.manifest = {
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
          wallet: 'template-wallet.docx',
        },
        mapping: 'mapping.json',
      },
    };
    formpackState.schema = {
      type: 'object',
      properties: {},
    };
    formpackState.uiSchema = {};
    mockUpdateActiveRecord.mockResolvedValue({
      ...record,
      data: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('clears the draft and persists the reset', async () => {
    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const triggerButton = await screen.findByText('trigger-change');

    await waitFor(() =>
      expect(screen.getByTestId('form-data')).toHaveTextContent(
        JSON.stringify({}),
      ),
    );

    await userEvent.click(triggerButton);

    await waitFor(() =>
      expect(screen.getByTestId('form-data')).toHaveTextContent(
        JSON.stringify(record.data),
      ),
    );

    await userEvent.click(await screen.findByText('formpackFormReset'));

    await waitFor(() =>
      expect(mockUpdateActiveRecord).toHaveBeenCalledWith(record.id, {
        data: {},
        locale: 'de',
      }),
    );
    expect(mockUpdateActiveRecord).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(screen.getByTestId('form-data')).toHaveTextContent(
        JSON.stringify({}),
      ),
    );

    expect(mockMarkAsSaved).toHaveBeenCalledWith({});
  });

  it('logs an error if DOCX export fails', async () => {
    const error = new Error('DOCX export failed');
    vi.mocked(exportDocx).mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const exportButton = await screen.findByText('formpackRecordExportDocx');
    await userEvent.click(exportButton);

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith('DOCX export failed:', error),
    );
    expect(
      await screen.findByText('formpackDocxExportError'),
    ).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('renders empty states when no records are available', async () => {
    storageState.records = [];
    storageState.activeRecord = null;

    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('formpackRecordsEmpty')).toBeInTheDocument();
    expect(screen.getByText('formpackFormNoActiveRecord')).toBeInTheDocument();
    expect(screen.getByText('formpackSnapshotsNoRecord')).toBeInTheDocument();
    expect(
      screen.getByText('formpackImportModeOverwriteHint'),
    ).toBeInTheDocument();
  });

  it('hides DOCX controls when export is not available', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
      exports: ['json'],
      docx: undefined,
    };

    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('formpackRecordExportJson'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('formpackRecordExportDocx'),
    ).not.toBeInTheDocument();
  });
});
