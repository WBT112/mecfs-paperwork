import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { copyRepresentativeLetterText } from '../clipboard';

type CopyStatus = 'idle' | 'copied' | 'manual';

type CopyableTextFieldProps = {
  id: string;
  label: string;
  copyLabel: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
};

/**
 * Renders one selectable plain-text field with an independent copy action.
 *
 * @param props - Field content, labels, and optional textarea configuration.
 * @returns An accessible copy field with clipboard and manual-selection paths.
 */
export default function CopyableTextField({
  id,
  label,
  copyLabel,
  value,
  placeholder,
  multiline = false,
  rows = 2,
}: CopyableTextFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<CopyStatus>('idle');
  const statusId = `${id}-copy-status`;

  useEffect(() => {
    setStatus('idle');
  }, [value]);

  const copy = async () => {
    const copied = await copyRepresentativeLetterText(value);
    if (copied) {
      setStatus('copied');
      return;
    }

    const field = multiline ? textareaRef.current : inputRef.current;
    field?.focus();
    field?.select();
    setStatus('manual');
  };

  const sharedProps = {
    id,
    readOnly: true,
    value,
    placeholder,
    'aria-describedby': statusId,
  };
  const statusMessage: Record<CopyStatus, string> = {
    idle: '',
    copied: t('representativeLetter.copySucceeded'),
    manual: t('representativeLetter.copyManualFallback'),
  };

  return (
    <div className="representative-letter__copy-field">
      <div className="representative-letter__copy-field-heading">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          className="app__button"
          disabled={!value}
          onClick={copy}
        >
          {copyLabel}
        </button>
      </div>
      {multiline ? (
        <textarea ref={textareaRef} rows={rows} {...sharedProps} />
      ) : (
        <input ref={inputRef} type="text" {...sharedProps} />
      )}
      <output
        id={statusId}
        className="representative-letter__copy-status"
        aria-live="polite"
      >
        {statusMessage[status]}
      </output>
    </div>
  );
}
