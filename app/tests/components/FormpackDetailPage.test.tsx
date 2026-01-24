import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FormpackDetailPage from '../../src/pages/FormpackDetailPage';
import { downloadDocxExport, exportDocx } from '../../src/export/docx';
import { loadFormpackManifest } from '../../src/formpacks/loader';
import type { FormpackManifest } from '../../src/formpacks/types';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { RecordEntry } from '../../src/storage/types';

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
    setActiveRecord: ReturnType<typeof vi.fn>;
    snapshots: Array<unknown>;
    isSnapshotsLoading: boolean;
    snapshotsError: string | null;
    createSnapshot: ReturnType<typeof vi.fn>;
    loadSnapshot: ReturnType<typeof vi.fn>;
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

vi.mock('../../src/export/docx', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../src/export/docx')>();
  return {
    ...original,
    exportDocx: vi.fn(),
    downloadDocxExport: vi.fn(),
  };
});

vi.mock('../../src/export/json', () => jsonExportState);

vi.mock('../../src/import/json', () => ({
  validateJsonImport: importState.validateJsonImport,
}));

vi.mock('../../src/storage/import', () => ({
  importRecordWithSnapshots: storageImportState.importRecordWithSnapshots,
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
    storageState.setActiveRecord.mockReset();
    storageState.createSnapshot.mockReset();
    storageState.loadSnapshot.mockReset();
    storageState.refreshSnapshots.mockReset();
    storageState.markAsSaved.mockReset();
    storageState.setLocale.mockReset();
    importState.validateJsonImport.mockReset();
    storageImportState.importRecordWithSnapshots.mockReset();
    jsonExportState.buildJsonExportPayload.mockReset();
    jsonExportState.buildJsonExportFilename.mockReset();
    jsonExportState.downloadJsonExport.mockReset();
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

    const exportButton = await screen.findByText(DOCX_EXPORT_BUTTON_LABEL);
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

  it('shows record and snapshot loading states', async () => {
    storageState.records = [];
    storageState.activeRecord = storageState.record;
    storageState.isRecordsLoading = true;
    storageState.hasLoaded = false;
    storageState.snapshots = [];
    storageState.isSnapshotsLoading = true;

    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('formpackRecordsLoading'),
    ).toBeInTheDocument();
    expect(screen.getByText('formpackSnapshotsLoading')).toBeInTheDocument();
  });
  it('toggles a tools section via keyboard', async () => {
    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('formpackDocxTemplateWalletUnavailable'),
    ).toBeInTheDocument();
  });

  it('hides dev-only sections in production', async () => {
    visibilityState.isDevUiEnabled = false;

    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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
  });

  it('renders document preview above the tools group', async () => {
    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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

  it('defaults to collapsed drafts, import, and history with preview expanded', async () => {
    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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
    expect(previewToggle).toHaveAttribute(ARIA_EXPANDED, 'true');

    expect(screen.getByLabelText('formpackImportLabel')).not.toBeVisible();
  });

  it('shows success after DOCX export completes', async () => {
    const report = new Blob(['docx']);
    vi.mocked(exportDocx).mockResolvedValue(report);

    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
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
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
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

  it('shows storage unavailable message when storage is blocked', async () => {
    storageState.recordsError = 'unavailable';

    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(STORAGE_UNAVAILABLE_LABEL),
    ).toBeInTheDocument();
  });

  it('shows the generic storage error message for non-unavailable errors', async () => {
    storageState.recordsError = 'unknown';

    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('storageError')).toBeInTheDocument();
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

  it('clears import state when no file is selected', async () => {
    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
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
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));

      expect(
        await screen.findByText('importInvalidJsonWithDetails'),
      ).toBeInTheDocument();
      expect(
        storageImportState.importRecordWithSnapshots,
      ).not.toHaveBeenCalled();
    } finally {
      restoreText();
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
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
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
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
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
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
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
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
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
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
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

  it('restores a snapshot from the list', async () => {
    const snapshot = {
      id: 'snapshot-1',
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
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await openRecordsSection();
    const loadButtons = await screen.findAllByText('formpackRecordLoad');
    await userEvent.click(loadButtons[1]);

    await waitFor(() =>
      expect(storageState.loadRecord).toHaveBeenCalledWith(secondRecord.id),
    );
    expect(storageState.markAsSaved).toHaveBeenCalledWith(secondRecord.data);
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
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByText('formpackRecordNew'));

    await waitFor(() =>
      expect(storageState.updateActiveRecord).toHaveBeenCalled(),
    );
    expect(storageState.createRecord).not.toHaveBeenCalled();
  });

  it('updates DOCX template selection when changed', async () => {
    render(
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const select = await screen.findByLabelText('formpackDocxTemplateLabel');
    await userEvent.selectOptions(select, 'wallet');

    expect(select).toHaveValue('wallet');
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
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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
      <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Load failed')).toBeInTheDocument();
    expect(screen.getByText('formpackBackToList')).toBeInTheDocument();
  });

  it('shows an error when the formpack id is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/formpacks']}>
        <Routes>
          <Route path="/formpacks" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
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
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
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
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
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
      },
    };

    try {
      render(
        <MemoryRouter initialEntries={[FORMPACK_ROUTE]}>
          <Routes>
            <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );

      await openImportSection();
      await userEvent.upload(
        await screen.findByLabelText('formpackImportLabel'),
        file,
      );
      await userEvent.click(screen.getByText(IMPORT_ACTION_LABEL));

      expect(await screen.findByText('ME/CFS Paragraph')).toBeInTheDocument();
    } finally {
      restoreText();
    }
  }, 10000);
});
