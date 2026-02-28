import React from 'react';
import {
  act,
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
import { downloadDocxExport, exportDocx } from '../../src/export/docxLazy';
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
const OFFLABEL_FORMPACK_ID = 'offlabel-antrag';
const INTRO_GATE_ACCEPTED_PATH = 'request.introAccepted';
const INTRO_TITLE_KEY = 'intro.title';
const INTRO_BODY_KEY = 'intro.body';
const INTRO_CHECKBOX_KEY = 'intro.checkbox';
const INTRO_START_KEY = 'intro.start';
const INTRO_REOPEN_KEY = 'intro.reopen';
const INTRO_GATE_CONFIG = {
  enabled: true,
  acceptedFieldPath: INTRO_GATE_ACCEPTED_PATH,
  titleKey: INTRO_TITLE_KEY,
  bodyKey: INTRO_BODY_KEY,
  checkboxLabelKey: INTRO_CHECKBOX_KEY,
  startButtonLabelKey: INTRO_START_KEY,
  reopenButtonLabelKey: INTRO_REOPEN_KEY,
};

const offlabelPreviewState = vi.hoisted(() => ({
  buildDocuments:
    vi.fn<
      (
        formData: Record<string, unknown>,
        locale: 'de' | 'en',
      ) => OfflabelRenderedDocument[]
    >(),
}));

const offlabelFocusState = vi.hoisted(() => ({
  resolveOfflabelFocusTarget: vi.fn(),
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

const autosaveState = vi.hoisted(() => ({
  triggerOnSaved: false,
  onSaved: null as ((record: RecordEntry) => void) | null,
  onError: null as ((error: unknown) => void) | null,
}));

const diagnosticsState = vi.hoisted(() => ({
  health: {
    status: 'ok',
  } as { status: 'ok' | 'warning' | 'error' },
  resetAllLocalData: vi.fn().mockResolvedValue(undefined),
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
const mockMarkAsSaved = storageState.markAsSaved;
const FORMPACK_ROUTE = `/formpacks/${FORMPACK_ID}`;
const DOCX_EXPORT_BUTTON_LABEL = 'formpackRecordExportDocx';
const DOCX_TEMPLATE_A4_OPTION = 'formpackDocxTemplateA4Option';
const DOCX_TEMPLATE_WALLET_OPTION = 'formpackDocxTemplateWalletOption';
const IMPORT_ACTION_LABEL = 'formpackImportAction';
const IMPORT_SUCCESS_LABEL = 'importSuccess';
const STORAGE_UNAVAILABLE_LABEL = 'storageUnavailable';
const STORAGE_LOCKED_LABEL = 'storageLocked';
const PROFILE_SAVE_STORAGE_KEY = 'mecfs-paperwork.profile.saveEnabled';
const PDF_EXPORT_CONTROLS_LABEL = 'pdf-export-controls';
const PDF_SUCCESS_BUTTON_LABEL = 'pdf-success';
const PDF_ERROR_BUTTON_LABEL = 'pdf-error';

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

const mockFileTextError = (error: Error) => {
  const descriptor = Object.getOwnPropertyDescriptor(File.prototype, 'text');
  if (descriptor?.value) {
    const spy = vi.spyOn(File.prototype, 'text').mockRejectedValue(error);
    return () => spy.mockRestore();
  }

  Object.defineProperty(File.prototype, 'text', {
    configurable: true,
    value: () => Promise.reject(error),
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

vi.mock('../../src/storage/importRecord', () => ({
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
    onSubmit,
  }: {
    children?: React.ReactNode;
    formData?: Record<string, unknown>;
    onChange?: (event: { formData: Record<string, unknown> }) => void;
    onSubmit?: (
      event: { formData: Record<string, unknown> },
      submitEvent: { preventDefault: () => void },
    ) => void;
  }) => (
    <div>
      <div data-testid="form-data">{JSON.stringify(formData)}</div>
      <button
        type="button"
        onClick={() => onChange?.({ formData: { field: 'value' } })}
      >
        trigger-change
      </button>
      <button
        type="button"
        onClick={() =>
          onChange?.({
            formData: {
              request: {
                drug: 'other',
                selectedIndicationKey: 'legacy-indication',
              },
            },
          })
        }
      >
        trigger-offlabel-change
      </button>
      <button
        type="button"
        onClick={() =>
          onSubmit?.(
            { formData: { submitted: true } },
            { preventDefault: () => undefined },
          )
        }
      >
        trigger-submit
      </button>
      <input id="root_request_selectedIndicationKey" />
      <input id="root_request_otherDrugName" />
      <input id="root_request_indicationFullyMetOrDoctorConfirms_0" />
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

vi.mock('../../src/formpacks/offlabel-antrag/focusTarget', () => ({
  resolveOfflabelFocusTarget: offlabelFocusState.resolveOfflabelFocusTarget,
}));

vi.mock('../../src/lib/diagnostics', () => ({
  useStorageHealth: () => ({
    health: diagnosticsState.health,
  }),
  resetAllLocalData: diagnosticsState.resetAllLocalData,
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
  useAutosaveRecord: (
    _recordId: string | null,
    _formData: Record<string, unknown>,
    _locale: 'de' | 'en',
    _activeData: Record<string, unknown> | null,
    options?: {
      onSaved?: (record: RecordEntry) => void;
      onError?: (error: unknown) => void;
    },
  ) => {
    autosaveState.onSaved = options?.onSaved ?? null;
    autosaveState.onError = options?.onError ?? null;
    return {
      markAsSaved: storageState.markAsSaved,
    };
  },
}));

const mockT = (key: string, options?: { ns?: string; message?: string }) => {
  if (key === 'importInvalidJsonWithDetails') {
    return `invalid_json_details:${options?.message ?? ''}`;
  }

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
    offlabelFocusState.resolveOfflabelFocusTarget.mockReset();
    offlabelFocusState.resolveOfflabelFocusTarget.mockReturnValue(null);
    pdfExportControlsState.props = null;
    profileState.getProfile.mockReset();
    profileState.upsertProfile.mockReset();
    profileState.deleteProfile.mockReset();
    profileState.hasUsableProfileData.mockClear();
    profileMappingState.extractProfileData.mockClear();
    profileMappingState.applyProfileData.mockClear();
    autosaveState.triggerOnSaved = false;
    autosaveState.onSaved = null;
    autosaveState.onError = null;
    diagnosticsState.health.status = 'ok';
    diagnosticsState.resetAllLocalData.mockReset();
    diagnosticsState.resetAllLocalData.mockResolvedValue(undefined);
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

  it('clears the draft and persists the reset', async () => {
    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const triggerButton = await screen.findByText('trigger-change', undefined, {
      timeout: 3000,
    });

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
  }, 10000);

  it('shows an error if DOCX export fails', async () => {
    const error = new Error('DOCX export failed');
    vi.mocked(exportDocx).mockRejectedValue(error);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const exportButton = await screen.findByText(DOCX_EXPORT_BUTTON_LABEL);
    await userEvent.click(exportButton);

    expect(
      await screen.findByText('formpackDocxExportError'),
    ).toBeInTheDocument();
  });

  it('renders empty states when no records are available', async () => {
    storageState.records = [];
    storageState.activeRecord = null;

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(await screen.findByText('formpackRecordsEmpty')).toBeInTheDocument();
    expect(screen.getByText('formpackFormNoActiveRecord')).toBeInTheDocument();
    expect(screen.getByText('formpackSnapshotsNoRecord')).toBeInTheDocument();
    expect(
      screen.getByText('formpackImportModeOverwriteHint'),
    ).toBeInTheDocument();
  });

  it('shows record and snapshot loading states', async () => {
    storageState.records = [];
    storageState.activeRecord = storageState.record;
    storageState.isRecordsLoading = true;
    storageState.hasLoaded = false;
    storageState.snapshots = [];
    storageState.isSnapshotsLoading = true;

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(
      await screen.findByText('formpackRecordsLoading'),
    ).toBeInTheDocument();
    expect(screen.getByText('formpackSnapshotsLoading')).toBeInTheDocument();
  });
  it('toggles a tools section via keyboard', async () => {
    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const toggle = await screen.findByRole('button', {
      name: sectionLabels.records,
    });
    expect(toggle).toHaveAttribute(ARIA_EXPANDED, 'false');

    toggle.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(toggle).toHaveAttribute(ARIA_EXPANDED, 'true'));
    expect(toggle).toHaveFocus();

    toggle.focus();
    fireEvent.keyUp(toggle, { key: ' ', code: 'Space' });
    await waitFor(() => expect(toggle).toHaveAttribute(ARIA_EXPANDED, 'false'));
  });

  it('renders DOCX metadata and template options', async () => {
    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(await screen.findByText(DOCX_MAPPING_PATH)).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: DOCX_TEMPLATE_A4_OPTION }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: DOCX_TEMPLATE_WALLET_OPTION }),
    ).toBeInTheDocument();
  });

  it('shows a fallback label when the wallet template is unavailable', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
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
      await screen.findByText('formpackDocxTemplateWalletUnavailable'),
    ).toBeInTheDocument();
  });

  it('renders PDF export controls when the formpack supports pdf export', async () => {
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

    expect(
      await screen.findByText(PDF_EXPORT_CONTROLS_LABEL),
    ).toBeInTheDocument();
  });

  it('does not render PDF controls when pdf export is not declared', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
      exports: ['docx'],
    };

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(
      await screen.findByRole('button', { name: DOCX_EXPORT_BUTTON_LABEL }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(PDF_EXPORT_CONTROLS_LABEL),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'formpackRecordExportPdf' }),
    ).not.toBeInTheDocument();
  });

  it('renders PDF export controls for offlabel-antrag when pdf export is declared', async () => {
    const offlabelRecord = {
      ...record,
      formpackId: OFFLABEL_FORMPACK_ID,
      data: {},
    };
    storageState.records = [offlabelRecord];
    storageState.activeRecord = offlabelRecord;
    formpackState.manifest = {
      ...formpackState.manifest,
      id: OFFLABEL_FORMPACK_ID,
      exports: ['docx', 'pdf'],
      docx: {
        templates: {
          a4: TEMPLATE_A4,
        },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    render(
      <TestRouter initialEntries={[`/formpacks/${OFFLABEL_FORMPACK_ID}`]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(
      await screen.findByText(PDF_EXPORT_CONTROLS_LABEL),
    ).toBeInTheDocument();
    const docxButton = screen.getByRole('button', {
      name: DOCX_EXPORT_BUTTON_LABEL,
    });
    expect(docxButton).toHaveClass('formpack-docx-export__button--primary');
    expect(docxButton.closest('.formpack-docx-export__buttons')).toHaveClass(
      'formpack-docx-export__buttons--offlabel',
    );
  });

  it('shows PDF success and error statuses via PDF callbacks', async () => {
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
      screen.getByRole('button', { name: PDF_ERROR_BUTTON_LABEL }),
    );
    expect(
      await screen.findByText('formpackPdfExportError'),
    ).toBeInTheDocument();
  });

  it('clears PDF success when DOCX export is triggered', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
      exports: ['docx', 'pdf'],
    };
    vi.mocked(exportDocx).mockResolvedValue(new Blob(['docx']));

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

    await userEvent.click(screen.getByText(DOCX_EXPORT_BUTTON_LABEL));
    await waitFor(() =>
      expect(
        screen.queryByText('formpackPdfExportSuccess'),
      ).not.toBeInTheDocument(),
    );
  });

  it('hides dev-only sections in production', async () => {
    visibilityState.isDevUiEnabled = false;

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await screen.findByText('formpackRecordsHeading');

    expect(
      screen.queryByText('formpackDetailsHeading'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('formpackExportsHeading'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('formpackDocxHeading')).not.toBeInTheDocument();
    expect(
      screen.queryByText('formpackFormPreviewHeading'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'profileApplyDummyButton' }),
    ).not.toBeInTheDocument();
  });

  it('renders document preview above the tools group', async () => {
    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const previewToggle = await screen.findByRole('button', {
      name: sectionLabels.documentPreview,
    });
    const toolsHeading = await screen.findByRole('heading', {
      name: 'formpackToolsHeading',
    });

    expect(
      previewToggle.compareDocumentPosition(toolsHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const toolsSection = toolsHeading.closest('.formpack-detail__section');
    expect(toolsSection).not.toBeNull();

    if (toolsSection instanceof HTMLElement) {
      const toolsScope = within(toolsSection);
      expect(
        toolsScope.getByRole('button', { name: sectionLabels.records }),
      ).toBeInTheDocument();
      expect(
        toolsScope.getByRole('button', { name: sectionLabels.import }),
      ).toBeInTheDocument();
      expect(
        toolsScope.getByRole('button', { name: sectionLabels.snapshots }),
      ).toBeInTheDocument();
    }
  });

  it('defaults to collapsed drafts, import, history, and preview', async () => {
    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const recordsToggle = await screen.findByRole('button', {
      name: sectionLabels.records,
    });
    const importToggle = await screen.findByRole('button', {
      name: sectionLabels.import,
    });
    const snapshotsToggle = await screen.findByRole('button', {
      name: sectionLabels.snapshots,
    });
    const previewToggle = await screen.findByRole('button', {
      name: sectionLabels.documentPreview,
    });

    expect(recordsToggle).toHaveAttribute(ARIA_EXPANDED, 'false');
    expect(importToggle).toHaveAttribute(ARIA_EXPANDED, 'false');
    expect(snapshotsToggle).toHaveAttribute(ARIA_EXPANDED, 'false');
    expect(previewToggle).toHaveAttribute(ARIA_EXPANDED, 'false');

    expect(screen.getByLabelText('formpackImportLabel')).not.toBeVisible();
  });

  it('shows success after DOCX export completes', async () => {
    const report = new Blob(['docx']);
    vi.mocked(exportDocx).mockResolvedValue(report);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const exportButton = await screen.findByText(DOCX_EXPORT_BUTTON_LABEL);
    await userEvent.click(exportButton);

    await waitFor(() => {
      expect(exportDocx).toHaveBeenCalledWith({
        formpackId: record.formpackId,
        recordId: record.id,
        variant: 'a4',
        locale: 'de',
        manifest: formpackState.manifest,
        schema: formpackState.schema,
        uiSchema: formpackState.uiSchema,
      });
    });
    expect(downloadDocxExport).toHaveBeenCalledWith(
      report,
      expect.stringContaining(`${FORMPACK_ID}-a4-`),
    );
    expect(
      await screen.findByText('formpackDocxExportSuccess'),
    ).toBeInTheDocument();
  });

  it('renders offlabel document preview tabs and block kinds', async () => {
    const attachmentItem = 'Attachment 1';
    const secondTabTitle = 'Teil 2';
    const offlabelRecord = {
      ...record,
      formpackId: OFFLABEL_FORMPACK_ID,
      data: {},
    };
    storageState.records = [offlabelRecord];
    storageState.activeRecord = offlabelRecord;
    formpackState.manifest = {
      ...formpackState.manifest,
      id: OFFLABEL_FORMPACK_ID,
    };
    offlabelPreviewState.buildDocuments.mockReturnValue([
      {
        id: 'part1',
        title: 'Teil 1',
        blocks: [
          { kind: 'heading', text: 'Heading 1' },
          { kind: 'paragraph', text: 'Paragraph 1' },
          { kind: 'list', items: [attachmentItem] },
          { kind: 'pageBreak' },
        ],
      },
      {
        id: 'part2',
        title: secondTabTitle,
        blocks: [
          { kind: 'heading', text: 'Heading 2' },
          { kind: 'list', items: [] },
        ],
      },
      {
        id: 'part3',
        title: 'Teil 3',
        blocks: [{ kind: 'paragraph', text: 'Paragraph 3' }],
      },
    ]);

    render(
      <TestRouter initialEntries={[`/formpacks/${OFFLABEL_FORMPACK_ID}`]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await openSection(sectionLabels.documentPreview);

    expect(await screen.findByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
    expect(screen.getByText(attachmentItem)).toBeInTheDocument();
    expect(screen.queryByText('— Page break —')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: secondTabTitle }));
    expect(screen.getByText('Heading 2')).toBeInTheDocument();
    expect(screen.queryByText(attachmentItem)).not.toBeInTheDocument();
  });

  it('hides offlabel consent section in part 2 preview', async () => {
    const offlabelRecord = {
      ...record,
      formpackId: OFFLABEL_FORMPACK_ID,
      data: {},
    };
    storageState.records = [offlabelRecord];
    storageState.activeRecord = offlabelRecord;
    formpackState.manifest = {
      ...formpackState.manifest,
      id: OFFLABEL_FORMPACK_ID,
    };
    offlabelPreviewState.buildDocuments.mockReturnValue([
      {
        id: 'part1',
        title: 'Teil 1',
        blocks: [{ kind: 'paragraph', text: 'Teil 1 Inhalt' }],
      },
      {
        id: 'part2',
        title: 'Teil 2',
        blocks: [
          { kind: 'paragraph', text: 'Visible part 2 content' },
          {
            kind: 'heading',
            text: 'Aufklärung und Einwilligung zum Off-Label-Use: Ivabradin',
          },
          { kind: 'paragraph', text: 'Consent content must be hidden' },
        ],
      },
      {
        id: 'part3',
        title: 'Teil 3',
        blocks: [{ kind: 'paragraph', text: 'Teil 3 Inhalt' }],
      },
    ]);

    render(
      <TestRouter initialEntries={[`/formpacks/${OFFLABEL_FORMPACK_ID}`]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await openSection(sectionLabels.documentPreview);
    await userEvent.click(screen.getByRole('tab', { name: 'Teil 2' }));

    expect(screen.getByText('Visible part 2 content')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Aufklärung und Einwilligung zum Off-Label-Use: Ivabradin',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Consent content must be hidden'),
    ).not.toBeInTheDocument();
  });

  it('shows intro gate when required and unlocks form after confirmation', async () => {
    const introRecord = {
      ...record,
      formpackId: OFFLABEL_FORMPACK_ID,
      data: {},
    };
    storageState.records = [introRecord];
    storageState.activeRecord = introRecord;
    formpackState.manifest = {
      ...formpackState.manifest,
      id: OFFLABEL_FORMPACK_ID,
      ui: {
        introGate: INTRO_GATE_CONFIG,
      },
    };
    offlabelPreviewState.buildDocuments.mockReturnValue([]);

    render(
      <TestRouter initialEntries={[`/formpacks/${OFFLABEL_FORMPACK_ID}`]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(await screen.findByText(INTRO_TITLE_KEY)).toBeInTheDocument();
    const startButton = screen.getByRole('button', { name: INTRO_START_KEY });
    expect(startButton).toBeDisabled();

    await userEvent.click(
      screen.getByRole('checkbox', { name: INTRO_CHECKBOX_KEY }),
    );
    expect(startButton).toBeEnabled();
    await userEvent.click(startButton);

    await waitFor(() =>
      expect(screen.queryByText(INTRO_START_KEY)).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: INTRO_REOPEN_KEY }),
    ).toBeInTheDocument();
    await waitFor(
      () =>
        expect(
          screen.getByRole('button', { name: DOCX_EXPORT_BUTTON_LABEL }),
        ).toHaveFocus(),
      { timeout: 4_000 },
    );
  });

  it('opens and closes intro modal via reopen button', async () => {
    const introRecord = {
      ...record,
      formpackId: OFFLABEL_FORMPACK_ID,
      data: {},
    };
    storageState.records = [introRecord];
    storageState.activeRecord = introRecord;
    formpackState.manifest = {
      ...formpackState.manifest,
      id: OFFLABEL_FORMPACK_ID,
      ui: {
        introGate: INTRO_GATE_CONFIG,
      },
    };
    offlabelPreviewState.buildDocuments.mockReturnValue([]);

    render(
      <TestRouter initialEntries={[`/formpacks/${OFFLABEL_FORMPACK_ID}`]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const startButton = await screen.findByRole('button', {
      name: INTRO_START_KEY,
    });
    await userEvent.click(
      screen.getByRole('checkbox', { name: INTRO_CHECKBOX_KEY }),
    );
    await userEvent.click(startButton);

    const reopenButton = await screen.findByRole('button', {
      name: INTRO_REOPEN_KEY,
    });
    await userEvent.click(reopenButton);

    const closeButton = await screen.findByText('common.close');
    expect(screen.getByText(INTRO_TITLE_KEY)).toBeInTheDocument();
    await userEvent.click(closeButton);
    await waitFor(() =>
      expect(screen.queryByText('common.close')).not.toBeInTheDocument(),
    );
  });

  it('toggles profile quickfill persistence in localStorage', async () => {
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const checkbox = await screen.findByRole('checkbox', {
      name: 'profileSaveCheckbox',
    });

    await userEvent.click(checkbox);
    expect(setItemSpy).toHaveBeenCalledWith(PROFILE_SAVE_STORAGE_KEY, 'false');
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(profileState.deleteProfile).not.toHaveBeenCalled();

    await userEvent.click(checkbox);
    expect(setItemSpy).toHaveBeenCalledWith(PROFILE_SAVE_STORAGE_KEY, 'true');

    confirmSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('shows dummy-fill action in dev mode', async () => {
    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(
      await screen.findByRole('button', { name: 'profileApplyDummyButton' }),
    ).toBeInTheDocument();
  });

  it('prompts for deleting saved profile data when disabling profile save', async () => {
    profileState.getProfile.mockResolvedValueOnce({
      data: { patient: { firstName: 'Alice' } },
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const checkbox = await screen.findByRole('checkbox', {
      name: 'profileSaveCheckbox',
    });
    const applyButton = await screen.findByRole('button', {
      name: 'profileApplyButton',
    });
    await waitFor(() => expect(applyButton).toBeEnabled());

    await userEvent.click(checkbox);

    expect(confirmSpy).toHaveBeenCalledWith('profileDeleteConfirmPrompt');
    await waitFor(() =>
      expect(profileState.deleteProfile).toHaveBeenCalledWith('default'),
    );
    await waitFor(() => expect(applyButton).toBeDisabled());

    confirmSpy.mockRestore();
  });

  it('applies profile data and shows success status', async () => {
    profileState.getProfile
      .mockResolvedValueOnce({ data: { firstName: 'Alice' } })
      .mockResolvedValueOnce({ data: { firstName: 'Alice' } });

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const applyButton = await screen.findByRole('button', {
      name: 'profileApplyButton',
    });
    await waitFor(() => expect(applyButton).toBeEnabled());

    await userEvent.click(applyButton);

    await waitFor(() =>
      expect(storageState.markAsSaved).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Alice' }),
      ),
    );
    expect(await screen.findByText('profileApplySuccess')).toBeInTheDocument();
  });

  it('shows no-data status when profile apply has no usable data', async () => {
    profileState.getProfile
      .mockResolvedValueOnce({ data: { firstName: 'Alice' } })
      .mockResolvedValueOnce(null);

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const applyButton = await screen.findByRole('button', {
      name: 'profileApplyButton',
    });
    await waitFor(() => expect(applyButton).toBeEnabled());
    await userEvent.click(applyButton);

    expect(await screen.findByText('profileApplyNoData')).toBeInTheDocument();
  });

  it('shows error status when profile apply fails', async () => {
    profileState.getProfile
      .mockResolvedValueOnce({ data: { firstName: 'Alice' } })
      .mockRejectedValueOnce(new Error('profile broken'));

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    const applyButton = await screen.findByRole('button', {
      name: 'profileApplyButton',
    });
    await waitFor(() => expect(applyButton).toBeEnabled());
    await userEvent.click(applyButton);

    expect(await screen.findByText('profileApplyError')).toBeInTheDocument();
  });

  it('imports JSON as a new record and shows success', async () => {
    const payload = {
      version: 1,
      formpack: { id: record.formpackId, version: '1.0.0' },
      record: {
        title: 'Imported',
        locale: 'en',
        data: { name: 'Ada' },
      },
      revisions: [],
    };
    importState.validateJsonImport.mockReturnValue({
      payload,
      error: null,
    });
    const importedRecord = {
      id: 'record-2',
      formpackId: record.formpackId,
      title: 'Imported',
      locale: 'en',
      data: { name: 'Ada' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      expect(
        await screen.findByText('formpackImportFileName'),
      ).toBeInTheDocument();

      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));

      await waitFor(() =>
        expect(
          storageImportState.importRecordWithSnapshots,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            formpackId: record.formpackId,
            mode: 'new',
            data: payload.record.data,
            locale: payload.record.locale,
            title: payload.record.title,
          }),
        ),
      );
      expect(storageState.applyRecordUpdate).toHaveBeenCalledWith(
        importedRecord,
      );
      expect(storageState.markAsSaved).toHaveBeenCalledWith(
        payload.record.data,
      );
      expect(storageState.setLocale).toHaveBeenCalledWith(
        payload.record.locale,
      );
      expect(await screen.findByText(IMPORT_SUCCESS_LABEL)).toBeInTheDocument();
    } finally {
      restoreText();
    }
  });

  it('imports JSON overwrite and refreshes snapshots', async () => {
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
    storageImportState.importRecordWithSnapshots.mockResolvedValue({
      ...record,
      data: payload.record.data,
    });
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

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

      await waitFor(() =>
        expect(
          storageImportState.importRecordWithSnapshots,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            formpackId: record.formpackId,
            mode: 'overwrite',
            recordId: record.id,
            revisions: payload.revisions,
          }),
        ),
      );
      expect(storageState.refreshSnapshots).toHaveBeenCalled();
      expect(confirmSpy).toHaveBeenCalledWith('importOverwriteConfirm');
    } finally {
      restoreText();
      confirmSpy.mockRestore();
    }
  });

  it('switches import mode back to new after selecting overwrite', async () => {
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
    storageImportState.importRecordWithSnapshots.mockResolvedValue(record);
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileText(IMPORT_FILE_CONTENT);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

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
      await userEvent.click(screen.getByLabelText('formpackImportModeNew'));
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));

      await waitFor(() =>
        expect(
          storageImportState.importRecordWithSnapshots,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'new',
          }),
        ),
      );
      expect(confirmSpy).not.toHaveBeenCalled();
    } finally {
      restoreText();
      confirmSpy.mockRestore();
    }
  });

  it('shows storage unavailable message when storage is blocked', async () => {
    storageState.recordsError = 'unavailable';

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(
      await screen.findByText(STORAGE_UNAVAILABLE_LABEL),
    ).toBeInTheDocument();
  });

  it('shows the generic storage error message for non-unavailable errors', async () => {
    storageState.recordsError = 'unknown';

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(await screen.findByText('storageError')).toBeInTheDocument();
  });

  it('shows storage locked message and reset action', async () => {
    storageState.recordsError = 'locked';

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(await screen.findByText(STORAGE_LOCKED_LABEL)).toBeInTheDocument();
    await openSection(sectionLabels.records);
    expect(
      await screen.findByRole('button', { name: 'resetAllButton' }),
    ).toBeInTheDocument();
  });

  it('executes full storage reset when recovery is confirmed', async () => {
    storageState.recordsError = 'locked';
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openSection(sectionLabels.records);
      await userEvent.click(
        await screen.findByRole('button', { name: 'resetAllButton' }),
      );

      await waitFor(() =>
        expect(diagnosticsState.resetAllLocalData).toHaveBeenCalledTimes(1),
      );
      expect(confirmSpy).toHaveBeenCalledWith('resetAllConfirm');
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it('does not reset storage when recovery confirmation is denied', async () => {
    storageState.recordsError = 'locked';
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      await openSection(sectionLabels.records);
      await userEvent.click(
        await screen.findByRole('button', { name: 'resetAllButton' }),
      );

      expect(diagnosticsState.resetAllLocalData).not.toHaveBeenCalled();
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it('continues rendering when localStorage access throws', async () => {
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });

    try {
      render(
        <TestRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </TestRouter>,
      );

      expect(
        await screen.findByText('formpackFormHeading'),
      ).toBeInTheDocument();
    } finally {
      getItemSpy.mockRestore();
    }
  });

  it('applies autosave onSaved callback and persists profile snippets', async () => {
    profileState.upsertProfile.mockResolvedValue({
      data: { firstName: 'Ada' },
    });
    window.localStorage.setItem(PROFILE_SAVE_STORAGE_KEY, 'true');

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await screen.findByText('formpackFormHeading');

    await act(async () => {
      autosaveState.onSaved?.({
        ...storageState.record,
        data: { firstName: 'Ada' },
      });
    });

    await waitFor(() =>
      expect(profileState.upsertProfile).toHaveBeenCalledWith(
        'default',
        expect.any(Object),
      ),
    );
  });

  it('submits form data via onSubmit handler', async () => {
    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await userEvent.click(await screen.findByText('trigger-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('form-data')).toHaveTextContent(
        JSON.stringify({ submitted: true }),
      ),
    );
  });

  it('normalizes offlabel request changes and focuses the configured target', async () => {
    const offlabelRoute = '/formpacks/offlabel-antrag';
    formpackState.manifest = {
      ...formpackState.manifest,
      id: 'offlabel-antrag',
      titleKey: 'offlabelTitle',
      descriptionKey: 'offlabelDescription',
      exports: ['docx'],
    } as FormpackManifest;
    formpackState.schema = {
      type: 'object',
      properties: {
        request: {
          type: 'object',
          properties: {
            drug: { type: 'string', enum: ['other'] },
            selectedIndicationKey: {
              type: 'string',
              enum: ['legacy-indication'],
            },
          },
        },
      },
    } as RJSFSchema;
    formpackState.uiSchema = {
      request: {
        drug: {},
        selectedIndicationKey: {},
      },
    } as UiSchema;
    offlabelFocusState.resolveOfflabelFocusTarget.mockReturnValue(
      'request.selectedIndicationKey',
    );

    render(
      <TestRouter initialEntries={[offlabelRoute]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await userEvent.click(await screen.findByText('trigger-offlabel-change'));

    await waitFor(() =>
      expect(screen.getByTestId('form-data')).toHaveTextContent(
        JSON.stringify({ request: { drug: 'other' } }),
      ),
    );
    await waitFor(() =>
      expect(document.activeElement?.id).toBe(
        'root_request_selectedIndicationKey',
      ),
    );
  });

  it('refreshes formpack metadata when update events include the current id', async () => {
    formpackMetaState.getFormpackMeta
      .mockResolvedValueOnce({
        id: record.formpackId,
        versionOrHash: '1.0.0',
        version: '1.0.0',
        hash: 'abc',
        updatedAt: '2026-02-24T09:03:00.000Z',
      })
      .mockResolvedValueOnce({
        id: record.formpackId,
        versionOrHash: '1.0.0',
        version: '1.0.0',
        hash: 'abc',
        updatedAt: '2026-02-24T10:03:00.000Z',
      });

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await screen.findByText('formpackFormHeading');
    await waitFor(() =>
      expect(formpackMetaState.getFormpackMeta).toHaveBeenCalled(),
    );
    const callsBeforeUpdate =
      formpackMetaState.getFormpackMeta.mock.calls.length;

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('formpacks:updated', {
          detail: { formpackIds: [record.formpackId] },
        }),
      );
    });

    await waitFor(() =>
      expect(
        formpackMetaState.getFormpackMeta.mock.calls.length,
      ).toBeGreaterThan(callsBeforeUpdate),
    );
  });

  it('dismisses the quota banner in warning state', async () => {
    diagnosticsState.health.status = 'warning';

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(await screen.findByText('storageQuotaWarning')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'storageQuotaDismiss' }),
    );
    await waitFor(() =>
      expect(screen.queryByText('storageQuotaWarning')).not.toBeInTheDocument(),
    );
  });

  it('shows missing-id error when route parameter is absent', async () => {
    render(
      <TestRouter initialEntries={['/formpacks']}>
        <Routes>
          <Route path="/formpacks" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(await screen.findByText('formpackMissingId')).toBeInTheDocument();
  });

  it('refreshes stale formpack metadata when manifest revision changed', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
      version: '1.1.0',
    };
    formpackMetaState.getFormpackMeta.mockResolvedValue({
      id: record.formpackId,
      versionOrHash: '1.0.0',
      version: '1.0.0',
      hash: 'stale-hash',
      updatedAt: '2026-02-24T09:03:00.000Z',
    });
    formpackMetaState.upsertFormpackMeta.mockResolvedValue({
      id: record.formpackId,
      versionOrHash: '1.1.0',
      version: '1.1.0',
      hash: 'fresh-hash',
      updatedAt: '2026-02-24T09:10:00.000Z',
    });

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await waitFor(() =>
      expect(formpackMetaState.upsertFormpackMeta).toHaveBeenCalledWith(
        expect.objectContaining({
          id: record.formpackId,
          versionOrHash: '1.1.0',
          version: '1.1.0',
        }),
      ),
    );
  });

  it('hides DOCX controls when export is not available', async () => {
    formpackState.manifest = {
      ...formpackState.manifest,
      exports: ['json'],
      docx: undefined,
    };

    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    expect(
      await screen.findByText('formpackRecordExportJson'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('formpackRecordExportDocx'),
    ).not.toBeInTheDocument();
  });

  it('clears import state when no file is selected', async () => {
    render(
      <TestRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    await openImportSection();
    const input = await screen.findByLabelText('formpackImportLabel');
    fireEvent.change(input, { target: { files: [] } });

    expect(
      screen.queryByText('formpackImportFileName'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: IMPORT_ACTION_LABEL }),
    ).toBeDisabled();
  });

  it('shows an error when an import file cannot be read', async () => {
    const file = new File([IMPORT_FILE_CONTENT], IMPORT_FILE_NAME, {
      type: 'application/json',
    });
    const restoreText = mockFileTextError(new Error('read failed'));

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

      expect(await screen.findByText('importInvalidJson')).toBeInTheDocument();
      expect(screen.getByText('formpackImportFileName')).toBeInTheDocument();
    } finally {
      restoreText();
    }
  });

  it('shows validation errors for invalid import payloads', async () => {
    importState.validateJsonImport.mockReturnValue({
      payload: null,
      error: { code: 'invalid_json', message: 'bad json' },
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

      expect(
        await screen.findByText('invalid_json_details:bad json'),
      ).toBeInTheDocument();
      expect(
        storageImportState.importRecordWithSnapshots,
      ).not.toHaveBeenCalled();
    } finally {
      restoreText();
    }
  });
});
