import { useLayoutEffect, useRef } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { adjustTextareaHeight } from './textareaAutoGrow';

const DEFAULT_ROWS = 6;

export const AutoGrowTextareaWidget = ({
  id,
  value,
  required,
  disabled,
  readonly,
  placeholder,
  options,
  onChange,
  onBlur,
  onFocus,
}: WidgetProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rowsOption = options.rows;
  const rows =
    typeof rowsOption === 'number' && Number.isFinite(rowsOption)
      ? Math.max(1, Math.floor(rowsOption))
      : DEFAULT_ROWS;

  useLayoutEffect(() => {
    adjustTextareaHeight(textareaRef.current);
  }, [value]);

  return (
    <textarea
      id={id}
      ref={textareaRef}
      className="formpack-textarea--auto"
      value={typeof value === 'string' ? value : ''}
      placeholder={placeholder}
      rows={rows}
      required={required}
      disabled={disabled}
      readOnly={readonly}
      onChange={(event) => onChange(event.target.value)}
      onBlur={(event) => onBlur(id, event.target.value)}
      onFocus={(event) => onFocus(id, event.target.value)}
    />
  );
};
