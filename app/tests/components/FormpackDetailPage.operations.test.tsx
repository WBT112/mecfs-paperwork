import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { TestRouter } from '../setup/testRouter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FormpackDetailPage from '../../src/pages/FormpackDetailPage';
import { exportDocx } from '../../src/export/docxLazy';
import {
  FormpackLoaderError,
  loadFormpackManifest,
} from '../../src/formpacks/loader';
import type { FormpackManifest } from '../../src/formpacks/types';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { RecordEntry, SnapshotEntry } from '../../src/storage/types';
import type { OfflabelRenderedDocument } from '../../src/formpacks/offlabel-antrag/content/buildOfflabelDocuments';

const testConstants = vi.hoisted(() => ({
  FORMPACK_ID: 'notfallpass',
  DOCX_MAPPING_PATH: 'mapping.json',
  TEMPLATE_A4: 'template-a4.docx',
  TEMPLATE_WALLET: 'template-wallet.docx',
  IMPORT_FILE_NAME: 'import.json',
  IMPORT_FILE_CONTENT: '{"data":true}',
}));

const formpackState = vi.hoisted(
  (): {
    manifest: FormpackManifest;
    schema: RJSFSchema | null;
    uiSchema: UiSchema | null;
  } => ({
    manifest: {
      id: testConstants.FORMPACK_ID,
      version: '1.0.0',
      titleKey: 'formpackTitle',
      descriptionKey: 'formpackDescription',
      defaultLocale: 'de',
      locales: ['de', 'en'],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: {
          a4: testConstants.TEMPLATE_A4,
          wallet: testConstants.TEMPLATE_WALLET,
        },
        mapping: testConstants.DOCX_MAPPING_PATH,
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
    isRecordsLoading: boolean;
    hasLoaded: boolean;
    recordsError: string | null;
    createRecord: ReturnType<typeof vi.fn>;
    loadRecord: ReturnType<typeof vi.fn>;
    updateActiveRecord: ReturnType<typeof vi.fn>;
    applyRecordUpdate: ReturnType<typeof vi.fn>;
    deleteRecord: ReturnType<typeof vi.fn>;
    setActiveRecord: ReturnType<typeof vi.fn>;
    snapshots: SnapshotEntry[];
    isSnapshotsLoading: boolean;
    snapshotsError: string | null;
    createSnapshot: ReturnType<typeof vi.fn>;
    loadSnapshot: ReturnType<typeof vi.fn>;
    clearSnapshots: ReturnType<typeof vi.fn>;
    refreshSnapshots: ReturnType<typeof vi.fn>;
    markAsSaved: ReturnType<typeof vi.fn>;
    setLocale: ReturnType<typeof vi.fn>;
  } => {
    const record: RecordEntry = {
      id: 'record-1',
      formpackId: testConstants.FORMPACK_ID,
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
      deleteRecord: vi.fn(),
      setActiveRecord: vi.fn(),
      snapshots: [],
      isSnapshotsLoading: false,
      snapshotsError: null as string | null,
      createSnapshot: vi.fn(),
      loadSnapshot: vi.fn(),
      clearSnapshots: vi.fn(),
      refreshSnapshots: vi.fn(),
      markAsSaved: vi.fn(),
      setLocale: vi.fn(),
    };
  },
);

const {
  FORMPACK_ID,
  DOCX_MAPPING_PATH,
  TEMPLATE_A4,
  TEMPLATE_WALLET,
  IMPORT_FILE_NAME,
  IMPORT_FILE_CONTENT,
} = testConstants;

const importState = vi.hoisted(() => ({
  validateJsonImport: vi.fn(),
}));

const visibilityState = vi.hoisted(() => ({
  isDevUiEnabled: true,
}));

const offlabelPreviewState = vi.hoisted(() => ({
  buildDocuments:
    vi.fn<
      (
        formData: Record<string, unknown>,
        locale: 'de' | 'en',
      ) => OfflabelRenderedDocument[]
    >(),
}));

const pdfExportControlsState = vi.hoisted(() => ({
  props: null as {
    onSuccess?: () => void;
    onError?: () => void;
  } | null,
}));

const profileState = vi.hoisted(() => ({
  getProfile: vi.fn(),
  upsertProfile: vi.fn(),
  deleteProfile: vi.fn(),
  hasUsableProfileData: vi.fn((data: Record<string, unknown> | null) =>
    Boolean(data && Object.keys(data).length > 0),
  ),
}));

const profileMappingState = vi.hoisted(() => ({
  extractProfileData: vi.fn(
    (_formpackId: string, data: Record<string, unknown>) => data,
  ),
  applyProfileData: vi.fn(
    (
      _formpackId: string,
      formData: Record<string, unknown>,
      profileData: Record<string, unknown>,
    ) => ({ ...formData, ...profileData }),
  ),
}));

const ARIA_EXPANDED = 'aria-expanded';
const sectionLabels = {
  records: 'formpackRecordsHeading',
  import: 'formpackImportHeading',
  snapshots: 'formpackSnapshotsHeading',
  documentPreview: 'formpackDocumentPreviewHeading',
};

const openSection = async (label: string) => {
  const toggle = await screen.findByRole('button', { name: label });
  if (toggle.getAttribute(ARIA_EXPANDED) !== 'true') {
    await userEvent.click(toggle);
  }
  return toggle;
};

const openImportSection = async () => {
  await openSection(sectionLabels.import);
};

const openSnapshotsSection = async () => {
  await openSection(sectionLabels.snapshots);
};

const openRecordsSection = async () => {
  await openSection(sectionLabels.records);
};

const storageImportState = vi.hoisted(() => ({
  importRecordWithSnapshots: vi.fn(),
}));

const formpackMetaState = vi.hoisted(() => ({
  getFormpackMeta: vi.fn(),
  upsertFormpackMeta: vi.fn(),
}));

const jsonExportState = vi.hoisted(() => ({
  buildJsonExportPayload: vi.fn(),
  buildJsonExportFilename: vi.fn(),
  downloadJsonExport: vi.fn(),
}));

const record = storageState.record;
const mockUpdateActiveRecord = storageState.updateActiveRecord;
const FORMPACK_ROUTE = `/formpacks/${FORMPACK_ID}`;
const DOCX_EXPORT_BUTTON_LABEL = 'formpackRecordExportDocx';
const IMPORT_ACTION_LABEL = 'formpackImportAction';
const IMPORT_SUCCESS_LABEL = 'importSuccess';
const PDF_EXPORT_CONTROLS_LABEL = 'pdf-export-controls';
const PDF_SUCCESS_BUTTON_LABEL = 'pdf-success';

const mockFileText = (content: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(File.prototype, 'text');
  if (descriptor?.value) {
    const spy = vi.spyOn(File.prototype, 'text').mockResolvedValue(content);
    return () => spy.mockRestore();
  }

  Object.defineProperty(File.prototype, 'text', {
    configurable: true,
    value: () => Promise.resolve(content),
  });

  return () => {
    if (descriptor) {
      Object.defineProperty(File.prototype, 'text', descriptor);
    } else {
      delete (File.prototype as { text?: unknown }).text;
    }
  };
};

vi.mock('../../src/export/docxLazy', () => ({
  buildDocxExportFilename: vi
    .fn()
    .mockResolvedValue(`${testConstants.FORMPACK_ID}-a4-2024-01-01`),
  downloadDocxExport: vi.fn().mockResolvedValue(undefined),
  exportDocx: vi.fn(),
  getDocxErrorKey: vi.fn().mockResolvedValue('formpackDocxExportError'),
  preloadDocxAssets: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/export/json', () => jsonExportState);

vi.mock('../../src/import/json', () => ({
  validateJsonImport: importState.validateJsonImport,
}));

vi.mock('../../src/storage/import', () => ({
  importRecordWithSnapshots: storageImportState.importRecordWithSnapshots,
}));

vi.mock('../../src/storage/formpackMeta', () => ({
  getFormpackMeta: formpackMetaState.getFormpackMeta,
  upsertFormpackMeta: formpackMetaState.upsertFormpackMeta,
}));

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

vi.mock('../../src/export/pdf/PdfExportControls', () => ({
  default: (props: { onSuccess?: () => void; onError?: () => void }) => {
    pdfExportControlsState.props = props;
    return (
      <div>
        <div>pdf-export-controls</div>
        <button type="button" onClick={() => props.onSuccess?.()}>
          pdf-success
        </button>
        <button type="button" onClick={() => props.onError?.()}>
          pdf-error
        </button>
      </div>
    );
  },
}));

vi.mock('../../src/storage/profiles', () => ({
  getProfile: profileState.getProfile,
  upsertProfile: profileState.upsertProfile,
  deleteProfile: profileState.deleteProfile,
  hasUsableProfileData: profileState.hasUsableProfileData,
}));

vi.mock('../../src/lib/profile/profileMapping', () => ({
  extractProfileData: profileMappingState.extractProfileData,
  applyProfileData: profileMappingState.applyProfileData,
}));

vi.mock('../../src/formpacks/visibility', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../src/formpacks/visibility')>();
  return {
    ...original,
    get isDevUiEnabled() {
      return visibilityState.isDevUiEnabled;
    },
  };
});

vi.mock(
  '../../src/formpacks/offlabel-antrag/content/buildOfflabelDocuments',
  () => ({
    buildOfflabelDocuments: (
      formData: Record<string, unknown>,
      locale: 'de' | 'en',
    ) => offlabelPreviewState.buildDocuments(formData, locale),
  }),
);

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

const mockT = (key: string, options?: { ns?: string }) => {
  if (!options?.ns) {
    return key;
  }
  if (options.ns === 'formpack:notfallpass') {
    if (key === 'notfallpass.export.diagnoses.meCfs.paragraph') {
      return 'ME/CFS Paragraph';
    }
    if (key === 'notfallpass.export.diagnoses.pots.paragraph') {
      return 'POTS Paragraph';
    }
    if (key === 'notfallpass.export.diagnoses.longCovid.paragraph') {
      return 'Long Covid Paragraph';
    }
  }
  if (key === 'doctor-letter.case.0.paragraph') {
    return 'Case paragraph one[[P]]Case paragraph two';
  }
  return key;
};

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
    formpackMetaState.getFormpackMeta.mockReset();
    formpackMetaState.upsertFormpackMeta.mockReset();
    jsonExportState.buildJsonExportPayload.mockReset();
    jsonExportState.buildJsonExportFilename.mockReset();
    jsonExportState.downloadJsonExport.mockReset();
    offlabelPreviewState.buildDocuments.mockReset();
    offlabelPreviewState.buildDocuments.mockReturnValue([]);
    pdfExportControlsState.props = null;
    profileState.getProfile.mockReset();
    profileState.upsertProfile.mockReset();
    profileState.deleteProfile.mockReset();
    profileState.hasUsableProfileData.mockClear();
    profileMappingState.extractProfileData.mockClear();
    profileMappingState.applyProfileData.mockClear();
    visibilityState.isDevUiEnabled = true;
    formpackState.manifest = {
      id: record.formpackId,
      version: '1.0.0',
      titleKey: 'formpackTitle',
      descriptionKey: 'formpackDescription',
      defaultLocale: 'de',
      locales: ['de', 'en'],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: {
          a4: TEMPLATE_A4,
          wallet: TEMPLATE_WALLET,
        },
        mapping: DOCX_MAPPING_PATH,
      },
    };
    formpackState.schema = {
      type: 'object',
      properties: {},
    };
    formpackState.uiSchema = {};
    formpackMetaState.getFormpackMeta.mockResolvedValue(null);
    formpackMetaState.upsertFormpackMeta.mockResolvedValue({
      id: record.formpackId,
      versionOrHash: '1.0.0',
      version: '1.0.0',
      hash: 'abc',
      updatedAt: '2026-02-07T00:00:00.000Z',
    });
    mockUpdateActiveRecord.mockResolvedValue({
      ...record,
      data: {},
    });
    profileState.getProfile.mockResolvedValue(null);
    profileState.upsertProfile.mockResolvedValue({ data: {} });
    profileState.deleteProfile.mockResolvedValue(undefined);
    profileState.hasUsableProfileData.mockImplementation(
      (data: Record<string, unknown> | null) =>
        Boolean(data && Object.keys(data).length > 0),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('applies random dummy data and persists updates on repeated clicks', async () => {
    formpackState.schema = {
      type: 'object',
      properties: {
        visibleText: { type: 'string' },
        visibleChoice: {
          type: 'string',
          enum: ['yes', 'no'],
        },
        hiddenText: { type: 'string' },
        readonlyText: { type: 'string', readOnly: true },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    };
    formpackState.uiSchema = {
      visibleChoice: { 'ui:widget': 'radio' },
      hiddenText: { 'ui:widget': 'hidden' },
      readonlyText: { 'ui:readonly': true },
    };

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      const dummyButton = await screen.findByRole('button', {
        name: 'profileApplyDummyButton',
      });

      storageState.markAsSaved.mockClear();
      await userEvent.click(dummyButton);

      await waitFor(() => expect(storageState.markAsSaved).toHaveBeenCalled());
      const firstPayload = storageState.markAsSaved.mock.calls.at(-1)?.[0] as
        | Record<string, unknown>
        | undefined;
      expect(firstPayload).toBeDefined();
      expect(firstPayload?.visibleChoice).toBe('yes');
      expect(firstPayload?.hiddenText).toBeUndefined();
      expect(firstPayload?.readonlyText).toBeUndefined();
      expect(Array.isArray(firstPayload?.tags)).toBe(true);
      expect((firstPayload?.tags as unknown[]).length).toBe(1);

      randomSpy.mockReturnValue(0.99);
      await userEvent.click(dummyButton);

      await waitFor(() =>
        expect(storageState.markAsSaved.mock.calls.length).toBeGreaterThan(1),
      );
      const secondPayload = storageState.markAsSaved.mock.calls.at(-1)?.[0] as
        | Record<string, unknown>
        | undefined;
      expect(secondPayload).toBeDefined();
      expect(secondPayload?.visibleChoice).toBe('');
      expect(Array.isArray(secondPayload?.tags)).toBe(true);
      expect((secondPayload?.tags as unknown[]).length).toBe(3);
      expect(secondPayload).not.toEqual(firstPayload);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('shows a storage error when import processing throws', async () => {
    importState.validateJsonImport.mockImplementation(() => {
      throw new Error('boom');
    });
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));

      expect(await screen.findByText('importStorageError')).toBeInTheDocument();
    } finally {
      restoreText();
    }
  });

  it('requires confirmation before overwriting an import', async () => {
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'Imported',
        locale: 'de',
        data: { name: 'Ada' },
      },
      revisions: [{ label: 'Rev', data: { name: 'Ada' } }],
    };
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(
        screen.getByLabelText('formpackImportModeOverwrite'),
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));

      expect(confirmSpy).toHaveBeenCalledWith('importOverwriteConfirm');
      expect(
        storageImportState.importRecordWithSnapshots,
      ).not.toHaveBeenCalled();
      expect(screen.queryByText(IMPORT_SUCCESS_LABEL)).not.toBeInTheDocument();
    } finally {
      confirmSpy.mockRestore();
      restoreText();
    }
  });

  it('imports without revisions when the option is unchecked', async () => {
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'Imported',
        locale: 'en',
        data: { name: 'Ada' },
      },
      revisions: [{ label: 'Rev', data: { name: 'Ada' } }],
    };
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    storageImportState.importRecordWithSnapshots.mockResolvedValue({
      ...record,
      data: payload.record.data,
    });
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(
        screen.getByLabelText('formpackImportIncludeRevisions'),
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));

      await waitFor(() =>
        expect(
          storageImportState.importRecordWithSnapshots,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            revisions: [],
          }),
        ),
      );
    } finally {
      restoreText();
    }
  });

  it('clears import success when DOCX export is triggered', async () => {
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'Imported',
        locale: 'de',
        data: { name: 'Ada' },
      },
      revisions: [],
    };
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    storageImportState.importRecordWithSnapshots.mockResolvedValue({
      ...record,
      data: payload.record.data,
    });
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);
    const report = new Blob(['docx']);
    vi.mocked(exportDocx).mockResolvedValue(report);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));
      expect(await screen.findByText(IMPORT_SUCCESS_LABEL)).toBeInTheDocument();

      await userEvent.click(screen.getByText(DOCX_EXPORT_BUTTON_LABEL));

      await waitFor(() =>
        expect(
          screen.queryByText(IMPORT_SUCCESS_LABEL),
        ).not.toBeInTheDocument(),
      );
    } finally {
      restoreText();
    }
  });

  it('clears import success when a non-export action button is clicked', async () => {
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'Imported',
        locale: 'de',
        data: { name: 'Ada' },
      },
      revisions: [],
    };
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    storageImportState.importRecordWithSnapshots.mockResolvedValue({
      ...record,
      data: payload.record.data,
    });
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));
      expect(await screen.findByText(IMPORT_SUCCESS_LABEL)).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole('button', { name: 'formpackFormReset' }),
      );

      await waitFor(() =>
        expect(
          screen.queryByText(IMPORT_SUCCESS_LABEL),
        ).not.toBeInTheDocument(),
      );
    } finally {
      restoreText();
    }
  });

  it('clears PDF success when JSON import starts', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
      exports: ['docx', 'pdf'],
    };
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'Imported',
        locale: 'de',
        data: { name: 'Ada' },
      },
      revisions: [],
    };
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    storageImportState.importRecordWithSnapshots.mockResolvedValue({
      ...record,
      data: payload.record.data,
    });
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await screen.findByText(PDF_EXPORT_CONTROLS_LABEL);
      await userEvent.click(
        screen.getByRole('button', { name: PDF_SUCCESS_BUTTON_LABEL }),
      );
      expect(
        await screen.findByText('formpackPdfExportSuccess'),
      ).toBeInTheDocument();

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));

      await waitFor(() =>
        expect(
          screen.queryByText('formpackPdfExportSuccess'),
        ).not.toBeInTheDocument(),
      );
    } finally {
      restoreText();
    }
  });

  it('clears PDF success when a non-export action button is clicked', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
      exports: ['docx', 'pdf'],
    };

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await screen.findByText(PDF_EXPORT_CONTROLS_LABEL);
    await userEvent.click(
      screen.getByRole('button', { name: PDF_SUCCESS_BUTTON_LABEL }),
    );
    expect(
      await screen.findByText('formpackPdfExportSuccess'),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'formpackFormReset' }),
    );

    await waitFor(() =>
      expect(
        screen.queryByText('formpackPdfExportSuccess'),
      ).not.toBeInTheDocument(),
    );
  });

  it('clears DOCX success when starting a JSON import', async () => {
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'Imported',
        locale: 'de',
        data: { name: 'Ada' },
      },
      revisions: [],
    };
    const report = new Blob(['docx']);
    vi.mocked(exportDocx).mockResolvedValue(report);
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    storageImportState.importRecordWithSnapshots.mockResolvedValue({
      ...record,
      data: payload.record.data,
    });
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await userEvent.click(await screen.findByText(DOCX_EXPORT_BUTTON_LABEL));
      expect(
        await screen.findByText('formpackDocxExportSuccess'),
      ).toBeInTheDocument();

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));

      await waitFor(() =>
        expect(
          screen.queryByText('formpackDocxExportSuccess'),
        ).not.toBeInTheDocument(),
      );
    } finally {
      restoreText();
    }
  });

  it('clears DOCX success when a non-export action button is clicked', async () => {
    const report = new Blob(['docx']);
    vi.mocked(exportDocx).mockResolvedValue(report);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await userEvent.click(await screen.findByText(DOCX_EXPORT_BUTTON_LABEL));
    expect(
      await screen.findByText('formpackDocxExportSuccess'),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'formpackFormReset' }),
    );

    await waitFor(() =>
      expect(
        screen.queryByText('formpackDocxExportSuccess'),
      ).not.toBeInTheDocument(),
    );
  });

  it('restores a snapshot from the list', async () => {
    const snapshot: SnapshotEntry = {
      id: 'snapshot-1',
      recordId: record.id,
      label: 'Snapshot',
      createdAt: new Date().toISOString(),
      data: { field: 'snapshot' },
    };
    storageState.snapshots = [snapshot];
    storageState.loadSnapshot.mockResolvedValue(snapshot);
    storageState.updateActiveRecord.mockResolvedValue({
      ...record,
      data: snapshot.data,
    });

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await openSnapshotsSection();
    await userEvent.click(await screen.findByText('formpackSnapshotRestore'));

    await waitFor(() =>
      expect(storageState.updateActiveRecord).toHaveBeenCalledWith(record.id, {
        data: snapshot.data,
      }),
    );
    expect(storageState.markAsSaved).toHaveBeenCalledWith(snapshot.data);
  });

  it('loads records from the list', async () => {
    const secondRecord = {
      ...record,
      id: 'record-2',
      title: 'Second',
      data: { field: 'second' },
    };
    storageState.records = [record, secondRecord];
    storageState.loadRecord.mockResolvedValue(secondRecord);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await openRecordsSection();
    const loadButtons = await screen.findAllByText('formpackRecordLoad');
    await userEvent.click(loadButtons[1]);

    await waitFor(() =>
      expect(storageState.loadRecord).toHaveBeenCalledWith(secondRecord.id),
    );
    expect(storageState.markAsSaved).toHaveBeenCalledWith(secondRecord.data);
  });

  it('shows delete action only for non-active drafts', async () => {
    const secondRecord = {
      ...record,
      id: 'record-2',
      title: 'Second',
      updatedAt: new Date().toISOString(),
    };
    storageState.records = [record, secondRecord];
    storageState.activeRecord = record;

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await openRecordsSection();

    const deleteButtons = await screen.findAllByRole('button', {
      name: 'formpackRecordDelete',
    });
    expect(deleteButtons).toHaveLength(1);

    const activeBadge = screen.getByText('formpackRecordActive');
    const activeItem = activeBadge.closest('li');
    expect(
      within(activeItem as HTMLElement).queryByRole('button', {
        name: 'formpackRecordDelete',
      }),
    ).not.toBeInTheDocument();
  });

  it('does not delete a draft when the confirmation is dismissed', async () => {
    const secondRecord = {
      ...record,
      id: 'record-2',
      title: 'Second',
      updatedAt: new Date().toISOString(),
    };
    storageState.records = [record, secondRecord];
    storageState.activeRecord = record;
    storageState.deleteRecord.mockResolvedValue(true);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await openRecordsSection();
    await userEvent.click(
      await screen.findByRole('button', { name: 'formpackRecordDelete' }),
    );

    expect(storageState.deleteRecord).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('deletes a draft when confirmed', async () => {
    const secondRecord = {
      ...record,
      id: 'record-2',
      title: 'Second',
      updatedAt: new Date().toISOString(),
    };
    storageState.records = [record, secondRecord];
    storageState.activeRecord = record;
    storageState.deleteRecord.mockResolvedValue(true);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await openRecordsSection();
    await userEvent.click(
      await screen.findByRole('button', { name: 'formpackRecordDelete' }),
    );

    await waitFor(() =>
      expect(storageState.deleteRecord).toHaveBeenCalledWith(secondRecord.id),
    );
    confirmSpy.mockRestore();
  });

  it('disables clear snapshots when none exist', async () => {
    storageState.snapshots = [];

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await openSnapshotsSection();
    const clearButton = await screen.findByRole('button', {
      name: 'formpackSnapshotsClearAll',
    });
    expect(clearButton).toBeDisabled();
  });

  it('clears snapshots when confirmed', async () => {
    const snapshot: SnapshotEntry = {
      id: 'snapshot-1',
      recordId: record.id,
      label: 'Snapshot',
      data: { field: 'snapshot' },
      createdAt: new Date().toISOString(),
    };
    storageState.snapshots = [snapshot];
    storageState.clearSnapshots.mockResolvedValue(1);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await openSnapshotsSection();
    await userEvent.click(
      await screen.findByRole('button', { name: 'formpackSnapshotsClearAll' }),
    );

    await waitFor(() =>
      expect(storageState.clearSnapshots).toHaveBeenCalledWith(),
    );
    confirmSpy.mockRestore();
  });

  it('restores the last active record from local storage', async () => {
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockReturnValue(record.id);
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => undefined);
    storageState.loadRecord.mockResolvedValue(record);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await waitFor(() =>
      expect(storageState.setActiveRecord).toHaveBeenCalledWith(record),
    );
    expect(setItemSpy).toHaveBeenCalledWith(
      `mecfs-paperwork.activeRecordId.${record.formpackId}`,
      record.id,
    );

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('creates a new draft when no records exist', async () => {
    storageState.records = [];
    storageState.activeRecord = null;
    storageState.createRecord.mockResolvedValue(record);
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => undefined);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await waitFor(() =>
      expect(storageState.createRecord).toHaveBeenCalledWith(
        'de',
        {},
        'formpackTitle',
      ),
    );
    expect(setItemSpy).toHaveBeenCalledWith(
      `mecfs-paperwork.activeRecordId.${record.formpackId}`,
      record.id,
    );

    setItemSpy.mockRestore();
  });

  it('does not create a new record when updating the active record fails', async () => {
    storageState.updateActiveRecord.mockResolvedValue(null);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await openRecordsSection();
    await userEvent.click(
      await screen.findByRole('button', { name: 'formpackRecordNew' }),
    );

    await waitFor(() =>
      expect(storageState.updateActiveRecord).toHaveBeenCalled(),
    );
    expect(storageState.createRecord).not.toHaveBeenCalled();
  });

  it('updates DOCX template selection when changed', async () => {
    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const select = await screen.findByLabelText('formpackDocxTemplateLabel');
    await userEvent.selectOptions(select, 'wallet');

    expect(select).toHaveValue('wallet');
  });

  it('resets invalid DOCX template values back to the first available option', async () => {
    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const select = await screen.findByLabelText('formpackDocxTemplateLabel');
    fireEvent.change(select, { target: { value: 'invalid-template' } });

    await waitFor(() => expect(select).toHaveValue('a4'));
  });

  it('hides the DOCX template selector when only one template is available', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
      exports: ['docx'],
      docx: {
        templates: {
          a4: TEMPLATE_A4,
        },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(
      screen.queryByLabelText('formpackDocxTemplateLabel'),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: DOCX_EXPORT_BUTTON_LABEL }),
    ).toBeInTheDocument();
  });

  it('exports JSON backups when requested', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
      exports: ['docx', 'json'],
    };
    const payload = {
      app: { id: 'mecfs-paperwork', version: '0.0.0' },
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        id: record.id,
        updatedAt: record.updatedAt,
        locale: 'de',
        data: record.data,
      },
      locale: 'de',
      exportedAt: new Date().toISOString(),
      data: record.data,
    };
    jsonExportState.buildJsonExportPayload.mockReturnValue(payload);
    jsonExportState.buildJsonExportFilename.mockReturnValue('export.json');

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await userEvent.click(await screen.findByText('formpackRecordExportJson'));

    expect(jsonExportState.buildJsonExportPayload).toHaveBeenCalled();
    expect(jsonExportState.buildJsonExportFilename).toHaveBeenCalledWith(
      payload,
    );
    expect(jsonExportState.downloadJsonExport).toHaveBeenCalledWith(
      payload,
      'export.json',
    );
  });

  it('renders error content when formpack loading fails', async () => {
    vi.mocked(loadFormpackManifest).mockRejectedValueOnce(
      new Error('Load failed'),
    );

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(await screen.findByText('Load failed')).toBeInTheDocument();
    expect(screen.getByText('formpackBackToList')).toBeInTheDocument();
  });

  it('maps known loader errors to translated formpack messages', async () => {
    const loaderError = new FormpackLoaderError(
      'schema_not_found',
      'schema missing',
    );
    vi.mocked(loadFormpackManifest).mockRejectedValueOnce(loaderError);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(
      await screen.findByText('formpackSchemaNotFound'),
    ).toBeInTheDocument();
    expect(screen.getByText('formpackBackToList')).toBeInTheDocument();
  });

  it('falls back to the generic load error for non-error rejections', async () => {
    vi.mocked(loadFormpackManifest).mockRejectedValueOnce({
      reason: 'unexpected',
    });

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(await screen.findByText('formpackLoadError')).toBeInTheDocument();
  });

  it('shows an error when the formpack id is missing', async () => {
    render(
      <TestRouter initialEntries={['/formpacks']}>
        <Routes>
          <Route path="/formpacks" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(await screen.findByText('formpackMissingId')).toBeInTheDocument();
    expect(screen.getByText('formpackBackToList')).toBeInTheDocument();
  });

  it('does not validate imports without a loaded schema', async () => {
    formpackState.schema = null;
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));

      expect(importState.validateJsonImport).not.toHaveBeenCalled();
    } finally {
      restoreText();
    }
  });

  it('renders document previews for nested data', async () => {
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'Nested',
        locale: 'de',
        data: {
          notes: 'Hello',
          items: ['Alpha'],
          details: { level: 2 },
        },
      },
      revisions: [],
    };
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    const importedRecord = {
      ...record,
      id: 'record-2',
      title: payload.record.title,
      data: payload.record.data,
    };
    storageImportState.importRecordWithSnapshots.mockResolvedValue(
      importedRecord,
    );
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));
      expect(await screen.findByText(IMPORT_SUCCESS_LABEL)).toBeInTheDocument();

      expect(await screen.findByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('details')).toBeInTheDocument();
    } finally {
      restoreText();
    }
  }, 10000);

  it('renders preview entries using ui:order wildcards and mixed nested arrays', async () => {
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'Ordered',
        locale: 'de',
        data: {
          summary: {
            alpha: 'A',
            beta: 'B',
            nestedObjects: [{ note: 'one' }],
            nestedLists: [['two'], 'three'],
          },
        },
      },
      revisions: [],
    };
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    const importedRecord = {
      ...record,
      id: 'record-4',
      title: payload.record.title,
      data: payload.record.data,
    };
    storageImportState.importRecordWithSnapshots.mockResolvedValue(
      importedRecord,
    );
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);
    formpackState.schema = {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            alpha: { type: 'string', title: 'Alpha' },
            beta: { type: 'string', title: 'Beta' },
            nestedObjects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  note: { type: 'string' },
                },
              },
            },
            nestedLists: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
      },
    };
    formpackState.uiSchema = {
      summary: {
        'ui:title': 'Summary',
        'ui:order': ['beta', '*', 'missing'],
        beta: { 'ui:title': 'Beta Label' },
      },
    };

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));
      expect(await screen.findByText(IMPORT_SUCCESS_LABEL)).toBeInTheDocument();

      const preview = document.getElementById(
        'formpack-document-preview-content',
      );
      expect(preview).toBeTruthy();
      if (preview) {
        expect(within(preview).getByText('Beta Label')).toBeInTheDocument();
        expect(within(preview).getByText('A')).toBeInTheDocument();
        expect(within(preview).getByText('one')).toBeInTheDocument();
        expect(within(preview).getByText('two')).toBeInTheDocument();
        expect(within(preview).getByText('three')).toBeInTheDocument();
      }
    } finally {
      restoreText();
    }
  }, 10000);

  it('renders preview entries using ui:order without wildcard', async () => {
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'OrderedNoWildcard',
        locale: 'de',
        data: {
          orderExample: {
            first: 'First',
            second: 'Second',
            tail: 'Tail',
          },
        },
      },
      revisions: [],
    };
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    const importedRecord = {
      ...record,
      id: 'record-5',
      title: payload.record.title,
      data: payload.record.data,
    };
    storageImportState.importRecordWithSnapshots.mockResolvedValue(
      importedRecord,
    );
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);
    formpackState.schema = {
      type: 'object',
      properties: {
        orderExample: {
          type: 'object',
          properties: {
            first: { type: 'string', title: 'First title' },
            second: { type: 'string', title: 'Second title' },
            tail: { type: 'string' },
          },
        },
      },
    };
    formpackState.uiSchema = {
      orderExample: {
        'ui:title': 'Order Example',
        'ui:order': ['second', 'first'],
      },
    };

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));
      expect(await screen.findByText(IMPORT_SUCCESS_LABEL)).toBeInTheDocument();

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Tail')).toBeInTheDocument();
    } finally {
      restoreText();
    }
  }, 10000);

  it('renders case text paragraphs in the document preview', async () => {
    const caseParagraphs = ['First paragraph', 'Second paragraph'];
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'Decision',
        locale: 'de',
        data: {
          decision: {
            caseText: 'Fallback text[[P]]Ignored text',
            caseParagraphs,
          },
        },
      },
      revisions: [],
    };
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    const importedRecord = {
      ...record,
      id: 'record-2',
      title: payload.record.title,
      data: payload.record.data,
    };
    storageImportState.importRecordWithSnapshots.mockResolvedValue(
      importedRecord,
    );
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);
    formpackState.schema = {
      type: 'object',
      properties: {
        decision: {
          type: 'object',
          properties: {
            caseText: { type: 'string' },
            caseParagraphs: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    };
    formpackState.uiSchema = {
      decision: {
        'ui:title': 'decision',
        caseText: {
          'ui:title': 'caseText',
        },
        caseParagraphs: {
          'ui:title': 'caseParagraphs',
        },
      },
    };

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));
      expect(await screen.findByText(IMPORT_SUCCESS_LABEL)).toBeInTheDocument();

      for (const paragraph of caseParagraphs) {
        expect(await screen.findByText(paragraph)).toBeInTheDocument();
      }
      expect(screen.queryByText('Fallback text')).not.toBeInTheDocument();
      expect(screen.queryByText('[[P]]')).not.toBeInTheDocument();
    } finally {
      restoreText();
    }
  });

  it('localizes boolean values in the document preview', async () => {
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'Booleans',
        locale: 'de',
        data: {
          diagnoses: {
            meCfs: true,
            pots: false,
          },
        },
      },
      revisions: [],
    };
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    const importedRecord = {
      ...record,
      id: 'record-3',
      title: payload.record.title,
      data: payload.record.data,
    };
    storageImportState.importRecordWithSnapshots.mockResolvedValue(
      importedRecord,
    );
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);
    formpackState.schema = {
      type: 'object',
      properties: {
        diagnoses: {
          type: 'object',
          properties: {
            meCfs: { type: 'boolean' },
            pots: { type: 'boolean' },
          },
        },
      },
    };
    formpackState.uiSchema = {
      diagnoses: {
        'ui:title': 'diagnoses',
        meCfs: {
          'ui:title': 'meCfs',
        },
        pots: {
          'ui:title': 'POTS',
        },
      },
    };

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));

      expect(await screen.findByText('ME/CFS Paragraph')).toBeInTheDocument();
      const previewContent = document.getElementById(
        'formpack-document-preview-content',
      );
      expect(previewContent).toBeTruthy();
      if (previewContent) {
        expect(within(previewContent).queryByText('POTS')).toBeNull();
      }
    } finally {
      restoreText();
    }
  }, 10000);
});
