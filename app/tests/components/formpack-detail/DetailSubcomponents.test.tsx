import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({
  renderOfflabelPreviewDocument: vi.fn((doc: { title: string }) => (
    <div>{doc.title}</div>
  )),
}));

vi.mock(
  '../../../src/pages/formpack-detail/helpers/offlabelPreviewHelpers',
  () => ({
    offlabelPreviewHelpers: {
      renderOfflabelPreviewDocument: mocked.renderOfflabelPreviewDocument,
    },
  }),
);

vi.mock('../../../src/components/FormpackIntroGate', () => ({
  default: ({ title, onConfirm }: { title: string; onConfirm: () => void }) => (
    <button type="button" onClick={onConfirm}>
      intro:{title}
    </button>
  ),
}));

vi.mock('../../../src/components/FormpackIntroModal', () => ({
  default: ({
    isOpen,
    title,
    onClose,
  }: {
    isOpen: boolean;
    title: string;
    onClose: () => void;
  }) =>
    isOpen ? (
      <button type="button" onClick={onClose}>
        modal:{title}
      </button>
    ) : null,
}));

vi.mock('../../../src/pages/formpack-detail/components/RecordsPanel', () => ({
  default: ({ labels }: { labels: { title: string } }) => (
    <div>{labels.title}</div>
  ),
}));

vi.mock('../../../src/pages/formpack-detail/components/ImportPanel', () => ({
  default: ({ labels }: { labels: { title: string } }) => (
    <div>{labels.title}</div>
  ),
}));

vi.mock('../../../src/pages/formpack-detail/components/SnapshotsPanel', () => ({
  default: ({ labels }: { labels: { title: string } }) => (
    <div>{labels.title}</div>
  ),
}));

import FormpackDocumentPreviewContent from '../../../src/pages/formpack-detail/components/FormpackDocumentPreviewContent';
import FormpackExportActions from '../../../src/pages/formpack-detail/components/FormpackExportActions';
import FormpackFormPanel, {
  type FormpackFormPanelProps,
} from '../../../src/pages/formpack-detail/components/FormpackFormPanel';
import FormpackIntroUtilityRow from '../../../src/pages/formpack-detail/components/FormpackIntroUtilityRow';
import FormpackToolsSection from '../../../src/pages/formpack-detail/components/FormpackToolsSection';
import PacingAmpelkartenEditor from '../../../src/pages/formpack-detail/components/PacingAmpelkartenEditor';
import type { FormpackManifest } from '../../../src/formpacks/types';
import * as formpackDetailComponents from '../../../src/pages/formpack-detail/components';

const DummyForm = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => (
  <div data-testid="dummy-form" className={className}>
    {children}
  </div>
);

const DummyPdfControls = ({ label }: { label: string }) => (
  <button type="button">{label}</button>
);

const INTRO_TEXTS = {
  title: 'Intro',
  body: 'Body',
  checkboxLabel: 'Check',
  startButtonLabel: 'Start',
  reopenButtonLabel: 'Reopen',
} as const;

const DOCX_MAPPING_PATH = '/mapping.json';
const DOCX_A4_TEMPLATE_PATH = '/a4.docx';
const DOCX_WALLET_TEMPLATE_PATH = '/wallet.docx';
const DEFAULT_LOCALES = ['de', 'en'] as const;
const PACING_FORMPACK_ID = 'pacing-ampelkarten';
const FORMPACK_UTILITY_ROW_SELECTOR = '.formpack-utility-row';

const TOOL_SECTION_PROPS = {
  heading: 'Tools',
  recordsPanelProps: {
    labels: { title: 'Records' },
    records: [],
    activeRecordId: null,
    isRecordsLoading: false,
    storageUnavailable: false,
    storageErrorMessage: null,
    formatUpdatedAt: () => '',
    onCreateRecord: vi.fn(),
    onLoadRecord: vi.fn(),
    onDeleteRecord: vi.fn(),
  } as never,
  importPanelProps: {
    labels: { title: 'Import' },
    importInputRef: { current: null },
    importFileName: null,
    importPassword: '',
    isImportFileEncrypted: false,
    importMode: 'new',
    importIncludeRevisions: false,
    importError: null,
    importSuccess: null,
    importJson: '',
    isImporting: false,
    activeRecordExists: false,
    storageUnavailable: false,
    onImportModeChange: vi.fn(),
    onIncludeRevisionsChange: vi.fn(),
    onImportPasswordChange: vi.fn(),
    onFileChange: vi.fn(),
    onImport: vi.fn(),
  } as never,
  snapshotsPanelProps: {
    labels: { title: 'Snapshots' },
    snapshots: [],
    activeRecordExists: false,
    isSnapshotsLoading: false,
    storageUnavailable: false,
    formatCreatedAt: () => '',
    onCreateSnapshot: vi.fn(),
    onClearSnapshots: vi.fn(),
    onRestoreSnapshot: vi.fn(),
  } as never,
} as const;

const formPanelActionProps = {
  onApplyDummyData: vi.fn(),
  onApplyProfile: vi.fn(),
  onCloseIntroModal: vi.fn(),
  onConfirmIntroGate: vi.fn(),
  onFormChange: vi.fn(),
  onFormSubmit: vi.fn(),
  onOpenIntroModal: vi.fn(),
  onProfileSaveToggle: vi.fn(),
};

const createFormPanelProps = (
  overrides: Partial<FormpackFormPanelProps> = {},
): FormpackFormPanelProps => ({
  FormComponent: DummyForm as never,
  actions: <div>actions</div>,
  activeRecordExists: true,
  closeLabel: 'Close',
  emptyMessage: 'No record',
  formClassName: 'form-class',
  formContentRef: { current: null },
  formContext: { t: ((key: string) => key) as never },
  formData: {},
  formSchema: { type: 'object' },
  introGateEnabled: false,
  introTexts: null,
  isIntroGateVisible: false,
  isIntroModalOpen: false,
  loadingLabel: 'Loading',
  profileApplyDummyLabel: 'Dummy',
  profileApplyLabel: 'Apply',
  profileHasSavedData: false,
  profileSaveEnabled: false,
  profileStatus: null,
  profileStatusSuccessText: 'profileApplySuccess',
  profileToggleLabel: 'Save',
  showDevSections: false,
  templates: {},
  uiSchema: {},
  validator: {} as never,
  ...formPanelActionProps,
  ...overrides,
});

type ExportActionOverrides = Partial<
  React.ComponentProps<typeof FormpackExportActions>
>;

const createManifest = (
  overrides: Partial<FormpackManifest> = {},
): FormpackManifest => ({
  id: 'doctor-letter',
  version: '1.0.0',
  titleKey: 'title',
  descriptionKey: 'description',
  defaultLocale: 'de',
  locales: [...DEFAULT_LOCALES],
  exports: ['docx'],
  visibility: 'public',
  docx: {
    templates: { a4: DOCX_A4_TEMPLATE_PATH },
    mapping: DOCX_MAPPING_PATH,
  },
  ...overrides,
});

const createExportActionProps = (
  overrides: ExportActionOverrides = {},
): React.ComponentProps<typeof FormpackExportActions> => ({
  PdfExportControlsComponent: DummyPdfControls as never,
  docxError: null,
  docxSuccess: null,
  docxTemplateId: 'a4',
  docxTemplateOptions: [{ id: 'a4', label: 'A4' }],
  encryptJsonExport: false,
  formData: {},
  formpackId: 'doctor-letter',
  handleExportDocx: vi.fn(),
  handleExportJson: vi.fn(),
  handlePdfExportError: vi.fn(),
  handlePdfExportSuccess: vi.fn(),
  isDocxExporting: false,
  jsonExportError: null,
  jsonExportPassword: '',
  jsonExportPasswordConfirm: '',
  manifest: createManifest(),
  offlabelOutputLocale: 'de',
  pdfError: null,
  pdfSuccess: null,
  secondaryActions: null,
  setDocxTemplateId: vi.fn(),
  setEncryptJsonExport: vi.fn(),
  setJsonExportPassword: vi.fn(),
  setJsonExportPasswordConfirm: vi.fn(),
  storageBlocked: false,
  t: (key) => key,
  ...overrides,
});

const renderExportActions = (overrides: ExportActionOverrides = {}) =>
  render(<FormpackExportActions {...createExportActionProps(overrides)} />);

describe('formpack detail subcomponents', () => {
  it('re-exports the page-local component entrypoints through the barrel', () => {
    expect(formpackDetailComponents.FormpackDetailHeader).toBeTypeOf(
      'function',
    );
    expect(formpackDetailComponents.DocumentPreviewPanel).toBeTypeOf(
      'function',
    );
    expect(formpackDetailComponents.FormContentSection).toBeTypeOf('function');
    expect(formpackDetailComponents.QuotaBanner).toBeTypeOf('function');
    expect(formpackDetailComponents.DevMetadataPanel).toBeTypeOf('function');
    expect(formpackDetailComponents.ImportPanel).toBeTypeOf('function');
    expect(formpackDetailComponents.RecordsPanel).toBeTypeOf('function');
    expect(formpackDetailComponents.SnapshotsPanel).toBeTypeOf('function');
    expect(formpackDetailComponents.FormpackFormPanel).toBe(FormpackFormPanel);
    expect(formpackDetailComponents.FormpackExportActions).toBe(
      FormpackExportActions,
    );
    expect(formpackDetailComponents.FormpackDocumentPreviewContent).toBe(
      FormpackDocumentPreviewContent,
    );
    expect(formpackDetailComponents.FormpackToolsSection).toBe(
      FormpackToolsSection,
    );
    expect(formpackDetailComponents.PacingAmpelkartenEditor).toBe(
      PacingAmpelkartenEditor,
    );
  });

  it('renders offlabel, generic, and empty preview states', () => {
    const onSelectOfflabelPreview = vi.fn();
    const { rerender } = render(
      <FormpackDocumentPreviewContent
        documentPreview={<div>generic-preview</div>}
        emptyLabel="empty-preview"
        formpackId="offlabel-antrag"
        hasDocumentContent={false}
        offlabelPreviewDocuments={[
          { id: 'part1', title: 'Teil 1', blocks: [] },
          { id: 'part2', title: 'Teil 2', blocks: [] },
        ]}
        onSelectOfflabelPreview={onSelectOfflabelPreview}
        selectedOfflabelPreviewId="part2"
      />,
    );

    expect(screen.getByRole('tab', { name: 'Teil 1' })).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Teil 2');
    fireEvent.click(screen.getByRole('tab', { name: 'Teil 1' }));
    expect(onSelectOfflabelPreview).toHaveBeenCalledWith('part1');

    rerender(
      <FormpackDocumentPreviewContent
        documentPreview={<div>generic-preview</div>}
        emptyLabel="empty-preview"
        formpackId="doctor-letter"
        hasDocumentContent
        offlabelPreviewDocuments={[]}
        onSelectOfflabelPreview={onSelectOfflabelPreview}
        selectedOfflabelPreviewId="part1"
      />,
    );
    expect(screen.getByText('generic-preview')).toBeInTheDocument();

    rerender(
      <FormpackDocumentPreviewContent
        documentPreview={<div>generic-preview</div>}
        emptyLabel="empty-preview"
        formpackId="doctor-letter"
        hasDocumentContent={false}
        offlabelPreviewDocuments={[]}
        onSelectOfflabelPreview={onSelectOfflabelPreview}
        selectedOfflabelPreviewId="part1"
      />,
    );
    expect(screen.getByText('empty-preview')).toBeInTheDocument();
  });

  it('renders intro gates, forms, and tool sections', () => {
    const onConfirmIntroGate = vi.fn();
    const onOpenIntroModal = vi.fn();
    const onCloseIntroModal = vi.fn();
    const { rerender } = render(
      <FormpackFormPanel
        {...createFormPanelProps({ activeRecordExists: false })}
      />,
    );
    expect(screen.getByText('No record')).toBeInTheDocument();

    rerender(
      <FormpackFormPanel
        {...createFormPanelProps({
          introGateEnabled: true,
          introTexts: INTRO_TEXTS,
          isIntroGateVisible: true,
          onConfirmIntroGate,
        })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'intro:Intro' }));
    expect(onConfirmIntroGate).toHaveBeenCalled();

    rerender(
      <FormpackFormPanel
        {...createFormPanelProps({
          introGateEnabled: true,
          introTexts: INTRO_TEXTS,
          isIntroModalOpen: true,
          onCloseIntroModal,
          onOpenIntroModal,
          profileHasSavedData: true,
          profileSaveEnabled: true,
          profileStatus: 'profileApplySuccess',
          showDevSections: true,
        })}
      />,
    );
    expect(screen.getByTestId('dummy-form')).toHaveClass('form-class');
    expect(screen.getByText('actions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(onOpenIntroModal).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'modal:Intro' }));
    expect(onCloseIntroModal).toHaveBeenCalled();

    render(<FormpackToolsSection {...TOOL_SECTION_PROPS} />);
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Records')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('Snapshots')).toBeInTheDocument();
  });

  it('wraps intro and profile actions in a shared utility row for stable layout', () => {
    render(
      <FormpackFormPanel
        {...createFormPanelProps({
          introGateEnabled: true,
          introTexts: INTRO_TEXTS,
          profileHasSavedData: true,
          showDevSections: true,
        })}
      />,
    );

    const reopenButton = screen.getByRole('button', { name: 'Reopen' });
    const utilityRow = reopenButton.closest(FORMPACK_UTILITY_ROW_SELECTOR);

    expect(utilityRow).not.toBeNull();
    expect(utilityRow).toContainElement(
      screen.getByRole('checkbox', { name: 'Save' }),
    );
    expect(utilityRow).toContainElement(
      screen.getByRole('button', { name: 'Apply' }),
    );
    expect(utilityRow).toContainElement(
      screen.getByRole('button', { name: 'Dummy' }),
    );
  });

  it('renders intro and profile controls without layout wrappers when none are provided', () => {
    render(
      <FormpackIntroUtilityRow
        introGateEnabled
        introReopenLabel="Reopen"
        onApplyDummyData={vi.fn()}
        onApplyProfile={vi.fn()}
        onOpenIntroModal={vi.fn()}
        onProfileSaveToggle={vi.fn()}
        profileApplyDummyLabel="Dummy"
        profileApplyLabel="Apply"
        profileClassName="profile-quickfill"
        profileHasSavedData={false}
        profileSaveEnabled={false}
        profileStatus="profile-error"
        profileStatusSuccessText="profileApplySuccess"
        profileToggleLabel="Save"
        showDevSections={false}
      />,
    );

    expect(document.querySelector(FORMPACK_UTILITY_ROW_SELECTOR)).toBeNull();
    expect(document.querySelector('.formpack-intro__reopen')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Dummy' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('profile-error')).toBeInTheDocument();
  });

  it('can render only profile actions inside a provided wrapper when intro controls are absent', () => {
    render(
      <FormpackIntroUtilityRow
        containerClassName="formpack-utility-row"
        introGateEnabled={false}
        onApplyDummyData={vi.fn()}
        onApplyProfile={vi.fn()}
        onOpenIntroModal={vi.fn()}
        onProfileSaveToggle={vi.fn()}
        profileApplyDummyLabel="Dummy"
        profileApplyLabel="Apply"
        profileClassName="profile-quickfill"
        profileHasSavedData
        profileSaveEnabled
        profileStatus="profileApplySuccess"
        profileStatusSuccessText="profileApplySuccess"
        profileToggleLabel="Save"
        showDevSections
      />,
    );

    const utilityRow = document.querySelector(FORMPACK_UTILITY_ROW_SELECTOR);
    expect(utilityRow).not.toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Reopen' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Dummy' })).toBeInTheDocument();
    expect(screen.getByText('profileApplySuccess')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('renders export controls and status messages', () => {
    renderExportActions({
      docxError: 'docx-error',
      docxSuccess: 'docx-success',
      docxTemplateOptions: [
        { id: 'a4', label: 'A4' },
        { id: 'wallet', label: 'Wallet' },
      ],
      encryptJsonExport: true,
      formpackId: 'offlabel-antrag',
      jsonExportError: 'json-error',
      jsonExportPassword: 'secret',
      jsonExportPasswordConfirm: 'secret',
      manifest: createManifest({
        id: 'offlabel-antrag',
        exports: ['docx', 'json', 'pdf'],
      }),
      pdfError: 'pdf-error',
      pdfSuccess: 'pdf-success',
      secondaryActions: <button type="button">Reset</button>,
    });

    expect(
      screen.getByRole('button', { name: 'formpackRecordExportDocx' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'formpackRecordExportPdf' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'formpackRecordExportJson' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getByText('docx-error')).toBeInTheDocument();
    expect(screen.getByText('docx-success')).toBeInTheDocument();
    expect(screen.getByText('json-error')).toBeInTheDocument();
    expect(screen.getByText('pdf-error')).toBeInTheDocument();
    expect(screen.getByText('pdf-success')).toBeInTheDocument();
  });

  it('renders standalone PDF controls when a formpack has no DOCX export', () => {
    renderExportActions({
      docxTemplateOptions: [],
      formpackId: PACING_FORMPACK_ID,
      manifest: createManifest({
        id: PACING_FORMPACK_ID,
        exports: ['json', 'pdf'],
        docx: undefined,
      }),
    });

    expect(
      screen.queryByRole('button', { name: 'formpackRecordExportDocx' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'formpackRecordExportPdf' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'formpackRecordExportJson' }),
    ).toBeInTheDocument();
  });

  it('hides the primary export row when docx is declared without usable templates', () => {
    renderExportActions({
      docxTemplateOptions: [],
      manifest: createManifest({ exports: ['docx'] }),
    });

    expect(
      screen.queryByRole('button', { name: 'formpackRecordExportDocx' }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('.formpack-pdf-export')).toBeNull();
    expect(
      document.querySelector('.formpack-actions__group--export'),
    ).toBeEmptyDOMElement();
  });

  it('renders DOCX-only controls without PDF wrapper when pdf export is absent', () => {
    renderExportActions({
      isDocxExporting: true,
      manifest: createManifest({ exports: ['docx'] }),
    });

    const docxButton = screen.getByRole('button', {
      name: 'formpackDocxExportInProgress',
    });
    expect(docxButton).toBeDisabled();
    expect(
      document.querySelector('.formpack-docx-export--single-template'),
    ).not.toBeNull();
    expect(
      document.querySelector('.formpack-docx-export__buttons--single-action'),
    ).not.toBeNull();
    expect(document.querySelector('.formpack-pdf-export')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'formpackRecordExportJson' }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('.formpack-actions__status')).toBeNull();
  });

  it('updates template selection and encrypted json password fields', () => {
    const setDocxTemplateId = vi.fn();
    const setEncryptJsonExport = vi.fn();
    const setJsonExportPassword = vi.fn();
    const setJsonExportPasswordConfirm = vi.fn();

    renderExportActions({
      docxTemplateOptions: [
        { id: 'a4', label: 'A4' },
        { id: 'wallet', label: 'Wallet' },
      ],
      encryptJsonExport: true,
      jsonExportPassword: 'old-secret',
      jsonExportPasswordConfirm: 'old-confirm',
      manifest: createManifest({
        exports: ['docx', 'json'],
        docx: {
          templates: {
            a4: DOCX_A4_TEMPLATE_PATH,
            wallet: DOCX_WALLET_TEMPLATE_PATH,
          },
          mapping: DOCX_MAPPING_PATH,
        },
      }),
      setDocxTemplateId,
      setEncryptJsonExport,
      setJsonExportPassword,
      setJsonExportPasswordConfirm,
    });

    fireEvent.change(screen.getByLabelText('formpackDocxTemplateLabel'), {
      target: { value: 'wallet' },
    });
    expect(setDocxTemplateId).toHaveBeenCalledWith('wallet');

    fireEvent.click(
      screen.getByLabelText('formpackJsonExportEncryptionToggle'),
    );
    expect(setEncryptJsonExport).toHaveBeenCalledWith(false);

    fireEvent.change(screen.getByLabelText('formpackJsonExportPasswordLabel'), {
      target: { value: 'new-secret' },
    });
    expect(setJsonExportPassword).toHaveBeenCalledWith('new-secret');

    fireEvent.change(
      screen.getByLabelText('formpackJsonExportPasswordConfirmLabel'),
      {
        target: { value: 'new-confirm' },
      },
    );
    expect(setJsonExportPasswordConfirm).toHaveBeenCalledWith('new-confirm');
  });

  it('omits secondary export actions and status area when json export and messages are absent', () => {
    renderExportActions({
      docxTemplateOptions: [],
      formpackId: PACING_FORMPACK_ID,
      manifest: createManifest({
        id: PACING_FORMPACK_ID,
        exports: ['pdf'],
        docx: undefined,
      }),
    });

    expect(
      screen.getByRole('button', { name: 'formpackRecordExportPdf' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'formpackRecordExportJson' }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('.formpack-actions__status')).toBeNull();
  });
});
