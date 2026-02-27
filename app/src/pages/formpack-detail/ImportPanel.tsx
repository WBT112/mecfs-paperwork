import type { ChangeEvent, RefObject } from 'react';
import CollapsibleSection from '../../components/CollapsibleSection';

type ImportPanelLabels = {
  title: string;
  hint: string;
  fileLabel: string;
  fileName: (name: string) => string;
  passwordLabel: string;
  passwordHint: string;
  passwordEncryptedHint: string;
  modeLabel: string;
  modeNew: string;
  modeOverwrite: string;
  modeOverwriteHint: string;
  includeRevisions: string;
  statusLabel: string;
  inProgress: string;
  action: string;
};

type ImportPanelProps = Readonly<{
  labels: ImportPanelLabels;
  importInputRef: RefObject<HTMLInputElement | null>;
  importFileName: string | null;
  importPassword: string;
  isImportFileEncrypted: boolean;
  importMode: 'new' | 'overwrite';
  importIncludeRevisions: boolean;
  importError: string | null;
  importSuccess: string | null;
  importJson: string;
  isImporting: boolean;
  activeRecordExists: boolean;
  storageUnavailable: boolean;
  onImportModeChange: (mode: 'new' | 'overwrite') => void;
  onIncludeRevisionsChange: (checked: boolean) => void;
  onImportPasswordChange: (password: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
}>;

export default function ImportPanel({
  labels,
  importInputRef,
  importFileName,
  importPassword,
  isImportFileEncrypted,
  importMode,
  importIncludeRevisions,
  importError,
  importSuccess,
  importJson,
  isImporting,
  activeRecordExists,
  storageUnavailable,
  onImportModeChange,
  onIncludeRevisionsChange,
  onImportPasswordChange,
  onFileChange,
  onImport,
}: ImportPanelProps) {
  return (
    <CollapsibleSection
      id="formpack-import"
      title={labels.title}
      className="formpack-detail__section"
    >
      <form>
        <p className="formpack-import__hint" id="formpack-import-hint">
          {labels.hint}
        </p>
        <div className="formpack-import__field">
          <label htmlFor="formpack-import-file">{labels.fileLabel}</label>
          <input
            ref={importInputRef}
            id="formpack-import-file"
            className="formpack-import__file"
            type="file"
            accept="application/json,.json"
            onChange={onFileChange}
            aria-describedby="formpack-import-hint"
          />
          {importFileName && (
            <p className="formpack-import__file-name">
              {labels.fileName(importFileName)}
            </p>
          )}
        </div>
        <div className="formpack-import__field">
          <label htmlFor="formpack-import-password">
            {labels.passwordLabel}
          </label>
          <input
            id="formpack-import-password"
            className="formpack-import__file"
            type="password"
            autoComplete="current-password"
            value={importPassword}
            onChange={(event) => onImportPasswordChange(event.target.value)}
          />
          <p className="formpack-import__file-name">
            {isImportFileEncrypted
              ? labels.passwordEncryptedHint
              : labels.passwordHint}
          </p>
        </div>
        <fieldset className="formpack-import__options">
          <legend>{labels.modeLabel}</legend>
          <label className="formpack-import__option">
            <input
              type="radio"
              name="import-mode"
              value="new"
              checked={importMode === 'new'}
              onChange={() => onImportModeChange('new')}
            />
            {labels.modeNew}
          </label>
          <label className="formpack-import__option">
            <input
              type="radio"
              name="import-mode"
              value="overwrite"
              checked={importMode === 'overwrite'}
              onChange={() => onImportModeChange('overwrite')}
              disabled={!activeRecordExists}
            />
            {labels.modeOverwrite}
          </label>
          {!activeRecordExists && (
            <p className="formpack-import__note">{labels.modeOverwriteHint}</p>
          )}
        </fieldset>
        <label className="formpack-import__option">
          <input
            type="checkbox"
            checked={importIncludeRevisions}
            onChange={(event) => onIncludeRevisionsChange(event.target.checked)}
          />
          {labels.includeRevisions}
        </label>
        <div aria-live="polite" aria-label={labels.statusLabel}>
          {importError && <p className="app__error">{importError}</p>}
          {importSuccess && (
            <p className="formpack-import__success">{importSuccess}</p>
          )}
        </div>
        <div className="formpack-import__actions">
          <button
            type="button"
            className="app__button"
            data-action="json-import"
            onClick={onImport}
            disabled={!importJson.trim() || storageUnavailable || isImporting}
          >
            {isImporting ? labels.inProgress : labels.action}
          </button>
        </div>
      </form>
    </CollapsibleSection>
  );
}
