import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
} from 'react';
import {
  buildJsonExportFilename,
  buildJsonExportPayload,
  downloadJsonExport,
} from '../../../export/json';
import {
  buildDocxExportFilename,
  downloadDocxExport,
  exportDocx,
  getDocxErrorKey,
  preloadDocxAssets,
  scheduleDocxPreload,
  type DocxTemplateId,
} from '../../../export/docxLazy';
import type { SupportedLocale } from '../../../i18n/locale';
import {
  USER_TIMING_NAMES,
  startUserTiming,
} from '../../../lib/performance/userTiming';
import { type FormpackId, type FormpackManifest } from '../../../formpacks';
import { formpackAssetHelpers } from '../helpers/formpackAssetHelpers';
import type { RecordEntry, SnapshotEntry } from '../../../storage';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * Dependencies required to orchestrate form export actions.
 */
export interface UseExportFlowOptions {
  activeRecord: RecordEntry | null;
  formData: Record<string, unknown>;
  formSchema: RJSFSchema | null;
  formpackId: FormpackId | null;
  locale: SupportedLocale;
  manifest: FormpackManifest | null;
  offlabelOutputLocale: SupportedLocale;
  onAnyActionTriggered?: () => void;
  previewUiSchema: UiSchema | null;
  schema: RJSFSchema | null;
  snapshots: SnapshotEntry[];
  t: (key: string, options?: Record<string, unknown>) => string;
}

/**
 * Export state and handlers exposed to the detail page.
 */
export interface UseExportFlowResult {
  clearDocxSuccess: () => void;
  clearJsonExportError: () => void;
  clearPdfSuccess: () => void;
  docxError: string | null;
  docxSuccess: string | null;
  docxTemplateId: DocxTemplateId;
  docxTemplateOptions: Array<{ id: DocxTemplateId; label: string }>;
  encryptJsonExport: boolean;
  handleActionClickCapture: (event: MouseEvent<HTMLDivElement>) => void;
  handleExportDocx: () => Promise<void>;
  handleExportJson: () => Promise<void>;
  handlePdfExportError: () => void;
  handlePdfExportSuccess: () => void;
  isDocxExporting: boolean;
  jsonExportError: string | null;
  jsonExportPassword: string;
  jsonExportPasswordConfirm: string;
  pdfError: string | null;
  pdfSuccess: string | null;
  setDocxTemplateId: Dispatch<SetStateAction<DocxTemplateId>>;
  setEncryptJsonExport: Dispatch<SetStateAction<boolean>>;
  setJsonExportPassword: Dispatch<SetStateAction<string>>;
  setJsonExportPasswordConfirm: Dispatch<SetStateAction<string>>;
}

/**
 * Encapsulates JSON, DOCX, and PDF export state for the detail page.
 *
 * @param options - Manifest, schema, and record context required for export.
 * @returns Export state plus action handlers for the detail page.
 */
export const useExportFlow = ({
  activeRecord,
  formData,
  formSchema,
  formpackId,
  locale,
  manifest,
  offlabelOutputLocale,
  onAnyActionTriggered,
  previewUiSchema,
  schema,
  snapshots,
  t,
}: UseExportFlowOptions): UseExportFlowResult => {
  const [encryptJsonExport, setEncryptJsonExport] = useState(false);
  const [jsonExportPassword, setJsonExportPassword] = useState('');
  const [jsonExportPasswordConfirm, setJsonExportPasswordConfirm] =
    useState('');
  const [jsonExportError, setJsonExportError] = useState<string | null>(null);
  const [docxTemplateId, setDocxTemplateId] = useState<DocxTemplateId>('a4');
  const [docxError, setDocxError] = useState<string | null>(null);
  const [docxSuccess, setDocxSuccess] = useState<string | null>(null);
  const [isDocxExporting, setIsDocxExporting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState<string | null>(null);

  useEffect(() => {
    const manifestExports = manifest?.exports;
    if (!manifest?.docx || !manifestExports?.includes('docx') || !formpackId) {
      return;
    }

    // Preload DOCX assets so export still works after going offline.
    return scheduleDocxPreload(() =>
      preloadDocxAssets(formpackId, manifest.docx!),
    );
  }, [formpackId, manifest]);

  useEffect(() => {
    if (!encryptJsonExport) {
      setJsonExportPassword('');
      setJsonExportPasswordConfirm('');
      setJsonExportError(null);
    }
  }, [encryptJsonExport]);

  const docxTemplateOptions = useMemo(() => {
    if (!manifest?.docx) {
      return [];
    }

    return [
      { id: 'a4', label: t('formpackDocxTemplateA4Option') },
    ] satisfies Array<{ id: DocxTemplateId; label: string }>;
  }, [manifest, t]);

  const handleExportJson = useCallback(async () => {
    if (!manifest || !activeRecord) {
      return;
    }

    const timing = startUserTiming(USER_TIMING_NAMES.exportJsonTotal);
    setJsonExportError(null);

    try {
      const payload = buildJsonExportPayload({
        formpack: {
          id: manifest.id,
          version: manifest.version,
        },
        record: activeRecord,
        data: formData,
        locale,
        revisions: snapshots,
        schema: schema ?? undefined,
      });
      const filename = buildJsonExportFilename(payload);

      if (!encryptJsonExport) {
        downloadJsonExport(payload, filename);
        return;
      }

      if (!jsonExportPassword) {
        setJsonExportError(t('formpackJsonExportPasswordRequired'));
        return;
      }

      if (jsonExportPassword !== jsonExportPasswordConfirm) {
        setJsonExportError(t('formpackJsonExportPasswordMismatch'));
        return;
      }

      const { encryptJsonWithPassword } =
        await formpackAssetHelpers.loadJsonEncryptionModule();

      const encryptedPayload = await encryptJsonWithPassword(
        JSON.stringify(payload),
        jsonExportPassword,
      );
      downloadJsonExport(encryptedPayload, filename);
    } catch (error) {
      setJsonExportError(
        formpackAssetHelpers.resolveJsonEncryptionErrorMessage(
          error,
          'export',
          t,
        ),
      );
    } finally {
      timing.end();
    }
  }, [
    activeRecord,
    encryptJsonExport,
    formData,
    jsonExportPassword,
    jsonExportPasswordConfirm,
    locale,
    manifest,
    schema,
    snapshots,
    t,
  ]);

  const handleExportDocx = useCallback(async () => {
    if (
      !formpackId ||
      !manifest ||
      !formSchema ||
      !previewUiSchema ||
      !activeRecord
    ) {
      return;
    }

    const timing = startUserTiming(USER_TIMING_NAMES.exportDocxTotal);
    setDocxError(null);
    setDocxSuccess(null);
    setIsDocxExporting(true);

    try {
      const report = await exportDocx({
        formpackId,
        recordId: activeRecord.id,
        variant: docxTemplateId,
        locale: offlabelOutputLocale,
        schema: formSchema,
        uiSchema: previewUiSchema,
        manifest,
      });
      const filename = await buildDocxExportFilename(
        formpackId,
        docxTemplateId,
      );
      await downloadDocxExport(report, filename);
      setDocxSuccess(t('formpackDocxExportSuccess'));
    } catch (error) {
      const errorKey = await getDocxErrorKey(error);
      setDocxError(t(errorKey));
    } finally {
      setIsDocxExporting(false);
      timing.end();
    }
  }, [
    activeRecord,
    docxTemplateId,
    formSchema,
    formpackId,
    manifest,
    offlabelOutputLocale,
    previewUiSchema,
    t,
  ]);

  const handlePdfExportSuccess = useCallback(() => {
    setPdfError(null);
    setPdfSuccess(t('formpackPdfExportSuccess'));
  }, [t]);

  const handlePdfExportError = useCallback(() => {
    setPdfError(t('formpackPdfExportError'));
    setPdfSuccess(null);
  }, [t]);

  const clearDocxSuccess = useCallback(() => {
    if (docxSuccess) {
      setDocxSuccess(null);
    }
  }, [docxSuccess]);

  const clearPdfSuccess = useCallback(() => {
    if (pdfSuccess) {
      setPdfSuccess(null);
    }
  }, [pdfSuccess]);

  const clearJsonExportError = useCallback(() => setJsonExportError(null), []);

  const handleActionClickCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const action = formpackAssetHelpers.getActionButtonDataAction(
        event.target,
      );
      if (action === null) {
        return;
      }
      onAnyActionTriggered?.();
      if (action === 'docx-export') {
        clearJsonExportError();
        clearPdfSuccess();
        return;
      }
      if (action === 'json-import') {
        clearDocxSuccess();
        clearJsonExportError();
        clearPdfSuccess();
        return;
      }

      clearDocxSuccess();
      clearJsonExportError();
      clearPdfSuccess();
    },
    [
      clearDocxSuccess,
      clearJsonExportError,
      clearPdfSuccess,
      onAnyActionTriggered,
    ],
  );

  return {
    clearDocxSuccess,
    clearJsonExportError,
    clearPdfSuccess,
    docxError,
    docxSuccess,
    docxTemplateId,
    docxTemplateOptions,
    encryptJsonExport,
    handleActionClickCapture,
    handleExportDocx,
    handleExportJson,
    handlePdfExportError,
    handlePdfExportSuccess,
    isDocxExporting,
    jsonExportError,
    jsonExportPassword,
    jsonExportPasswordConfirm,
    pdfError,
    pdfSuccess,
    setDocxTemplateId,
    setEncryptJsonExport,
    setJsonExportPassword,
    setJsonExportPasswordConfirm,
  };
};
