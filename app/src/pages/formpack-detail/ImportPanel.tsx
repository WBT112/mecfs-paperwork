import type { ChangeEvent, RefObject } from 'react';
import CollapsibleSection from '../../components/CollapsibleSection';

type ImportPanelLabels = {
  title: string;
  hint: string;
  fileLabel: string;
  fileName: (name: string) => string;
  modeLabel: string;
  modeNew: string;
  modeOverwrite: string;
  modeOverwriteHint: string;
  includeRevisions: string;
  statusLabel: string;
  inProgress: string;
  action: string;
};

type ImportPanelProps = {
  labels: ImportPanelLabels;
  importInputRef: RefObject<HTMLInputElement | null>;
  importFileName: string | null;
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
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
};

export default function ImportPanel({
  labels,
  importInputRef,
  importFileName,
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
  onFileChange,
  onImport,
}: ImportPanelProps) {
  return (
    <CollapsibleSection
      id="formpack-import"
      title={labels.title}
      className="formpack-detail__section"
    >
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
          onClick={onImport}
          data-action="json-import"
          disabled={!importJson.trim() || storageUnavailable || isImporting}
        >
          {isImporting ? labels.inProgress : labels.action}
        </button>
      </div>
    </CollapsibleSection>
  );
}
