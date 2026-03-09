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
import FormpackFormPanel from '../../../src/pages/formpack-detail/components/FormpackFormPanel';
import FormpackToolsSection from '../../../src/pages/formpack-detail/components/FormpackToolsSection';
import type { FormpackFormPanelProps } from '../../../src/pages/formpack-detail/components/FormpackFormPanel';
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
  onApplyDummyData: vi.fn(),
  onApplyProfile: vi.fn(),
  onCloseIntroModal: vi.fn(),
  onConfirmIntroGate: vi.fn(),
  onFormChange: vi.fn(),
  onFormSubmit: vi.fn(),
  onOpenIntroModal: vi.fn(),
  onProfileSaveToggle: vi.fn(),
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
  ...overrides,
});

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

  it('renders export controls and status messages', () => {
    render(
      <FormpackExportActions
        PdfExportControlsComponent={DummyPdfControls as never}
        docxError="docx-error"
        docxSuccess="docx-success"
        docxTemplateId="a4"
        docxTemplateOptions={[
          { id: 'a4', label: 'A4' },
          { id: 'wallet', label: 'Wallet' },
        ]}
        encryptJsonExport
        formData={{}}
        formpackId="offlabel-antrag"
        handleExportDocx={vi.fn()}
        handleExportJson={vi.fn()}
        handlePdfExportError={vi.fn()}
        handlePdfExportSuccess={vi.fn()}
        isDocxExporting={false}
        jsonExportError="json-error"
        jsonExportPassword="secret"
        jsonExportPasswordConfirm="secret"
        manifest={{
          id: 'offlabel-antrag',
          version: '1.0.0',
          titleKey: 'title',
          descriptionKey: 'description',
          defaultLocale: 'de',
          locales: ['de', 'en'],
          exports: ['docx', 'json', 'pdf'],
          visibility: 'public',
          docx: {
            templates: { a4: '/a4.docx' },
            mapping: '/mapping.json',
          },
        }}
        offlabelOutputLocale="de"
        pdfError="pdf-error"
        pdfSuccess="pdf-success"
        secondaryActions={<button type="button">Reset</button>}
        setDocxTemplateId={vi.fn()}
        setEncryptJsonExport={vi.fn()}
        setJsonExportPassword={vi.fn()}
        setJsonExportPasswordConfirm={vi.fn()}
        storageBlocked={false}
        t={(key) => key}
      />,
    );

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
});
