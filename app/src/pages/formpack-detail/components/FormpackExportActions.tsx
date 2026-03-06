import { Suspense, type ComponentType, type ReactNode } from 'react';
import type { DocxTemplateId } from '../../../export/docxLazy';
import type { PdfExportControlsProps } from '../../../export/pdf';
import {
  OFFLABEL_ANTRAG_FORMPACK_ID,
  type FormpackManifest,
} from '../../../formpacks';

/**
 * Props required to render all export controls for a formpack detail view.
 */
export interface FormpackExportActionsProps {
  PdfExportControlsComponent: ComponentType<PdfExportControlsProps>;
  docxError: string | null;
  docxSuccess: string | null;
  docxTemplateId: DocxTemplateId;
  docxTemplateOptions: Array<{ id: DocxTemplateId; label: string }>;
  encryptJsonExport: boolean;
  formData: Record<string, unknown>;
  formpackId: string | null;
  handleExportDocx: () => void | Promise<void>;
  handleExportJson: () => void | Promise<void>;
  handlePdfExportError: () => void;
  handlePdfExportSuccess: () => void;
  isDocxExporting: boolean;
  jsonExportError: string | null;
  jsonExportPassword: string;
  jsonExportPasswordConfirm: string;
  manifest: FormpackManifest;
  offlabelOutputLocale: 'de' | 'en';
  pdfError: string | null;
  pdfSuccess: string | null;
  secondaryActions?: ReactNode;
  setDocxTemplateId: (value: DocxTemplateId) => void;
  setEncryptJsonExport: (value: boolean) => void;
  setJsonExportPassword: (value: string) => void;
  setJsonExportPasswordConfirm: (value: string) => void;
  storageBlocked: boolean;
  t: (key: string) => string;
}

/**
 * Renders DOCX, PDF, and JSON export actions for the detail form.
 *
 * @param props - Export state, handlers, manifest metadata, and translated labels.
 * @returns Export controls with status messaging.
 */
export default function FormpackExportActions({
  PdfExportControlsComponent,
  docxError,
  docxSuccess,
  docxTemplateId,
  docxTemplateOptions,
  encryptJsonExport,
  formData,
  formpackId,
  handleExportDocx,
  handleExportJson,
  handlePdfExportError,
  handlePdfExportSuccess,
  isDocxExporting,
  jsonExportError,
  jsonExportPassword,
  jsonExportPasswordConfirm,
  manifest,
  offlabelOutputLocale,
  pdfError,
  pdfSuccess,
  secondaryActions = null,
  setDocxTemplateId,
  setEncryptJsonExport,
  setJsonExportPassword,
  setJsonExportPasswordConfirm,
  storageBlocked,
  t,
}: Readonly<FormpackExportActionsProps>) {
  const renderPdfExportControls = () => {
    if (!manifest.exports.includes('pdf')) {
      return null;
    }

    return (
      <div className="formpack-pdf-export">
        <Suspense
          fallback={
            <button type="button" className="app__button" disabled>
              {t('formpackRecordExportPdf')}
            </button>
          }
        >
          <PdfExportControlsComponent
            formpackId={manifest.id}
            formData={formData}
            locale={offlabelOutputLocale}
            label={t('formpackRecordExportPdf')}
            loadingLabel={t('formpackPdfExportInProgress')}
            disabled={storageBlocked}
            onSuccess={handlePdfExportSuccess}
            onError={handlePdfExportError}
          />
        </Suspense>
      </div>
    );
  };

  const renderDocxExportControls = () => {
    if (
      !manifest.exports.includes('docx') ||
      !manifest.docx ||
      docxTemplateOptions.length === 0
    ) {
      return null;
    }

    const pdfControls = renderPdfExportControls();
    const isOfflabelFormpack = formpackId === OFFLABEL_ANTRAG_FORMPACK_ID;
    const hasMultipleDocxTemplates = docxTemplateOptions.length > 1;
    const hasPdfControls = Boolean(pdfControls);
    const docxExportClassName = hasMultipleDocxTemplates
      ? 'formpack-docx-export'
      : 'formpack-docx-export formpack-docx-export--single-template';
    const docxButtonsClassNameBase = hasPdfControls
      ? 'formpack-docx-export__buttons'
      : 'formpack-docx-export__buttons formpack-docx-export__buttons--single-action';
    const docxButtonsClassName = isOfflabelFormpack
      ? `${docxButtonsClassNameBase} formpack-docx-export__buttons--offlabel`
      : docxButtonsClassNameBase;
    const docxButtonClassName = isOfflabelFormpack
      ? 'app__button formpack-docx-export__button--primary'
      : 'app__button';

    return (
      <div className={docxExportClassName}>
        {hasMultipleDocxTemplates && (
          <div className="formpack-docx-export__template">
            <label
              className="formpack-docx-export__label"
              htmlFor="docx-template-select"
            >
              {t('formpackDocxTemplateLabel')}
              <select
                id="docx-template-select"
                className="formpack-docx-export__select"
                value={docxTemplateId}
                onChange={(event) =>
                  setDocxTemplateId(event.target.value as DocxTemplateId)
                }
              >
                {docxTemplateOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className={docxButtonsClassName}>
          <button
            type="button"
            className={docxButtonClassName}
            onClick={handleExportDocx}
            data-action="docx-export"
            disabled={storageBlocked || isDocxExporting}
          >
            {isDocxExporting
              ? t('formpackDocxExportInProgress')
              : t('formpackRecordExportDocx')}
          </button>
          {pdfControls}
        </div>
      </div>
    );
  };

  const renderJsonExportControls = () =>
    manifest.exports.includes('json') ? (
      <div className="formpack-json-export">
        <label className="formpack-json-export__toggle">
          <input
            type="checkbox"
            checked={encryptJsonExport}
            onChange={(event) => setEncryptJsonExport(event.target.checked)}
          />
          {t('formpackJsonExportEncryptionToggle')}
        </label>
        <p className="formpack-json-export__hint">
          {t('formpackJsonExportEncryptionHint')}
        </p>
        {encryptJsonExport && (
          <div className="formpack-json-export__passwords">
            <label
              className="formpack-json-export__field"
              htmlFor="json-export-password"
            >
              {t('formpackJsonExportPasswordLabel')}
              <input
                id="json-export-password"
                type="password"
                className="formpack-json-export__input"
                value={jsonExportPassword}
                onChange={(event) => setJsonExportPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label
              className="formpack-json-export__field"
              htmlFor="json-export-password-confirm"
            >
              {t('formpackJsonExportPasswordConfirmLabel')}
              <input
                id="json-export-password-confirm"
                type="password"
                className="formpack-json-export__input"
                value={jsonExportPasswordConfirm}
                onChange={(event) =>
                  setJsonExportPasswordConfirm(event.target.value)
                }
                autoComplete="new-password"
              />
            </label>
          </div>
        )}
        <button
          type="button"
          className="app__button"
          onClick={handleExportJson}
          disabled={storageBlocked}
        >
          {t('formpackRecordExportJson')}
        </button>
      </div>
    ) : null;

  const renderActionStatus = () => {
    if (
      !docxError &&
      !docxSuccess &&
      !pdfError &&
      !pdfSuccess &&
      !jsonExportError
    ) {
      return null;
    }

    return (
      <div className="formpack-actions__status" aria-live="polite">
        {docxError && <span className="app__error">{docxError}</span>}
        {docxSuccess && (
          <span className="formpack-actions__success">{docxSuccess}</span>
        )}
        {jsonExportError && (
          <span className="app__error">{jsonExportError}</span>
        )}
        {pdfError && <span className="app__error">{pdfError}</span>}
        {pdfSuccess && (
          <span className="formpack-actions__success">{pdfSuccess}</span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="formpack-actions__group formpack-actions__group--export">
        {renderDocxExportControls()}
      </div>
      <div className="formpack-actions__group formpack-actions__group--secondary">
        {secondaryActions}
        {renderJsonExportControls()}
      </div>
      {renderActionStatus()}
    </>
  );
}
