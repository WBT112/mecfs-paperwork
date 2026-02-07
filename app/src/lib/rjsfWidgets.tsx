import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type FocusEvent,
} from 'react';
import {
  ariaDescribedByIds,
  enumOptionsIndexForValue,
  enumOptionsValueForIndex,
  type WidgetProps,
} from '@rjsf/utils';
import { adjustTextareaHeight } from './textareaAutoGrow';

const DEFAULT_ROWS = 6;
const EMPTY_SELECT_VALUE = '';
type SelectWidgetOptions = {
  enumOptions?: Array<{ value: unknown; label: string }>;
  enumDisabled?: unknown[];
  emptyValue?: unknown;
};

const getSelectValue = (
  event: ChangeEvent<HTMLSelectElement>,
  multiple: boolean,
): string | string[] =>
  multiple
    ? Array.from(event.target.options)
        .filter((option) => option.selected)
        .map((option) => option.value)
    : event.target.value;

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
}: WidgetProps<string>) => {
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

/**
 * RATIONALE: RJSF's built-in SelectWidget sets role="combobox" on native
 * <select> elements, which triggers false-positive ARIA failures in axe for
 * required combobox attributes. Native select semantics are already accessible
 * without overriding role.
 */
export const AccessibleSelectWidget = ({
  schema,
  id,
  name,
  options,
  value,
  required,
  disabled,
  readonly,
  multiple = false,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  htmlName,
}: WidgetProps<unknown>) => {
  const selectOptions = options as SelectWidgetOptions;
  const enumOptions = selectOptions.enumOptions;
  const enumDisabled = selectOptions.enumDisabled;
  const optionsEmptyValue = selectOptions.emptyValue;
  const selectedIndexes = enumOptionsIndexForValue(
    value,
    enumOptions,
    multiple,
  );
  const showPlaceholderOption = !multiple && schema.default === undefined;
  const emptyValue = multiple ? [] : EMPTY_SELECT_VALUE;

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLSelectElement>) => {
      const nextValue = getSelectValue(event, multiple);
      onBlur(
        id,
        enumOptionsValueForIndex(nextValue, enumOptions, optionsEmptyValue),
      );
    },
    [id, multiple, onBlur, enumOptions, optionsEmptyValue],
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLSelectElement>) => {
      const nextValue = getSelectValue(event, multiple);
      onFocus(
        id,
        enumOptionsValueForIndex(nextValue, enumOptions, optionsEmptyValue),
      );
    },
    [id, multiple, onFocus, enumOptions, optionsEmptyValue],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextValue = getSelectValue(event, multiple);
      onChange(
        enumOptionsValueForIndex(nextValue, enumOptions, optionsEmptyValue),
      );
    },
    [multiple, onChange, enumOptions, optionsEmptyValue],
  );

  return (
    <select
      id={id}
      name={htmlName ?? name}
      data-widget="accessible-select"
      multiple={multiple}
      className="form-control"
      value={selectedIndexes ?? emptyValue}
      required={required}
      disabled={disabled || readonly}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onChange={handleChange}
      aria-describedby={ariaDescribedByIds(id)}
    >
      {showPlaceholderOption && <option value="">{placeholder}</option>}
      {enumOptions?.map((option, index) => {
        const optionDisabled =
          Array.isArray(enumDisabled) && enumDisabled.includes(option.value);
        const optionKey = String(option.value);
        return (
          <option
            key={optionKey}
            value={String(index)}
            disabled={optionDisabled}
          >
            {option.label}
          </option>
        );
      })}
    </select>
  );
};
