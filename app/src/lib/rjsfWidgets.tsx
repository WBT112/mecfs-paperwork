import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type FocusEvent,
  type RefObject,
} from 'react';
import {
  ariaDescribedByIds,
  enumOptionsIndexForValue,
  enumOptionsValueForIndex,
  type WidgetProps,
} from '@rjsf/utils';
import i18n from '../i18n';
import { adjustTextareaHeight } from './textareaAutoGrow';

const DEFAULT_ROWS = 6;
const EMPTY_SELECT_VALUE = '';
const DEFAULT_EMPTY_SELECT_LABEL = '[keine Angabe]';
const EMPTY_SELECT_LABEL_I18N_KEY = 'formpackSelectEmptyOption';
type SupportedAttachmentLocale = 'de' | 'en';
type SelectWidgetOptions = {
  enumOptions?: Array<{ value: unknown; label: string }>;
  enumDisabled?: unknown[];
  emptyValue?: unknown;
  emptyValueLabel?: unknown;
};

type AutoGrowTextareaProps = {
  id: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  rows: number;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  onChange: WidgetProps['onChange'];
  onBlur: WidgetProps['onBlur'];
  onFocus: WidgetProps['onFocus'];
  placeholder?: string;
};

type AttachmentsAssistantItem = {
  id: string;
  value: Record<SupportedAttachmentLocale, string>;
  labelKey: string;
};

type AttachmentsAssistantItemSeed = [id: string, de: string, en: string];

const ATTACHMENTS_ASSISTANT_ITEM_SEEDS: AttachmentsAssistantItemSeed[] = [
  ['medicalFindings', 'Arztbefunde', 'Medical findings'],
  [
    'physicianStatement',
    'Ärztliche Stellungnahme zum Off-Label-Antrag',
    'Physician statement for off-label application',
  ],
  ['careLevelNotice', 'Pflegegrad-Bescheid', 'Care level notice'],
  ['gdbNotice', 'GdB-Bescheid', 'Disability degree notice'],
  ['pensionNotice', 'Rentenbescheid', 'Pension notice'],
  [
    'medicationPlan',
    'Medikamentenplan / Unverträglichkeiten',
    'Medication plan / intolerances',
  ],
  ['symptomLog', 'Symptom-/Funktionsprotokoll', 'Symptom/function log'],
  ['rehabReport', 'Reha-/Klinikbericht', 'Rehab/clinic report'],
];

const mapAttachmentAssistantItem = ([
  id,
  de,
  en,
]: AttachmentsAssistantItemSeed): AttachmentsAssistantItem => ({
  id,
  value: {
    de,
    en,
  },
  labelKey: `offlabel-antrag.attachmentsAssistant.item.${id}`,
});

const ATTACHMENTS_ASSISTANT_ITEMS: AttachmentsAssistantItem[] =
  ATTACHMENTS_ASSISTANT_ITEM_SEEDS.map((seed) =>
    mapAttachmentAssistantItem(seed),
  );
const BULLET_PREFIX = /^[-*•]\s+/u;
const MULTI_SPACE = /\s+/g;

const resolveAttachmentsAssistantLocale = (
  language: string | undefined,
): SupportedAttachmentLocale =>
  (language ?? '').toLowerCase().startsWith('en') ? 'en' : 'de';

const normalizeAttachmentLine = (value: string): string =>
  value
    .trim()
    .replace(BULLET_PREFIX, '')
    .replaceAll(MULTI_SPACE, ' ')
    .toLocaleLowerCase();

const getAttachmentLines = (value: string): string[] =>
  value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const getNormalizedAttachmentSet = (lines: string[]): Set<string> =>
  new Set(lines.map((line) => normalizeAttachmentLine(line)));

const getItemVariants = (item: AttachmentsAssistantItem): string[] => [
  item.value.de,
  item.value.en,
];

const getNormalizedItemVariants = (
  item: AttachmentsAssistantItem,
): Set<string> =>
  new Set(getItemVariants(item).map((line) => normalizeAttachmentLine(line)));

const hasRecommendedAttachment = (
  lines: string[],
  item: AttachmentsAssistantItem,
): boolean => {
  const normalizedLines = getNormalizedAttachmentSet(lines);
  const normalizedVariants = getNormalizedItemVariants(item);
  return [...normalizedVariants].some((variant) =>
    normalizedLines.has(variant),
  );
};

const removeRecommendedAttachment = (
  lines: string[],
  item: AttachmentsAssistantItem,
): string[] => {
  const normalizedVariants = getNormalizedItemVariants(item);
  return lines.filter(
    (line) => !normalizedVariants.has(normalizeAttachmentLine(line)),
  );
};

const addRecommendedAttachment = (
  lines: string[],
  item: AttachmentsAssistantItem,
  locale: SupportedAttachmentLocale,
): string[] => {
  const cleanedLines = removeRecommendedAttachment(lines, item);
  const nextLine = `- ${item.value[locale]}`;
  return [...cleanedLines, nextLine];
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

const resolveWidgetRows = (rowsOption: unknown): number =>
  typeof rowsOption === 'number' && Number.isFinite(rowsOption)
    ? Math.max(1, Math.floor(rowsOption))
    : DEFAULT_ROWS;

const resolveStringValue = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const resolveSelectWidgetValue = (
  event: ChangeEvent<HTMLSelectElement> | FocusEvent<HTMLSelectElement>,
  multiple: boolean,
  enumOptions: SelectWidgetOptions['enumOptions'],
  optionsEmptyValue: unknown,
): unknown =>
  enumOptionsValueForIndex(
    getSelectValue(event as ChangeEvent<HTMLSelectElement>, multiple),
    enumOptions,
    optionsEmptyValue,
  ) as unknown;

const useAutoGrowTextareaModel = (
  rowsOption: unknown,
  value: unknown,
): {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  rows: number;
  textValue: string;
} => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rows = resolveWidgetRows(rowsOption);
  const textValue = resolveStringValue(value);

  useLayoutEffect(() => {
    adjustTextareaHeight(textareaRef.current);
  }, [textValue]);

  return {
    textareaRef,
    rows,
    textValue,
  };
};

const AutoGrowTextarea = ({
  id,
  textareaRef,
  value,
  rows,
  required,
  disabled,
  readonly,
  onChange,
  onBlur,
  onFocus,
  placeholder,
}: AutoGrowTextareaProps) => (
  <textarea
    id={id}
    ref={textareaRef}
    className="formpack-textarea--auto"
    value={value}
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

const stripMarkdownStrong = (value: string): string => {
  let normalized = value;

  if (normalized.startsWith('**')) {
    normalized = normalized.slice(2).trimStart();
  }

  if (normalized.endsWith('**')) {
    normalized = normalized.slice(0, -2).trimEnd();
  }

  return normalized;
};

const resolveSelectPlaceholderLabel = (
  placeholder: unknown,
  emptyValueLabel: unknown,
): string => {
  if (typeof placeholder === 'string' && placeholder.trim().length > 0) {
    return placeholder;
  }

  if (
    typeof emptyValueLabel === 'string' &&
    emptyValueLabel.trim().length > 0
  ) {
    return emptyValueLabel;
  }

  return i18n.t(EMPTY_SELECT_LABEL_I18N_KEY, {
    defaultValue: DEFAULT_EMPTY_SELECT_LABEL,
  });
};

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
  const { textareaRef, rows, textValue } = useAutoGrowTextareaModel(
    options.rows,
    value,
  );

  return (
    <AutoGrowTextarea
      id={id}
      textareaRef={textareaRef}
      value={textValue}
      placeholder={placeholder}
      rows={rows}
      required={required}
      disabled={disabled}
      readonly={readonly}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
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
}: WidgetProps) => {
  const selectOptions = options as SelectWidgetOptions;
  const enumOptions = selectOptions.enumOptions;
  const enumDisabled = selectOptions.enumDisabled;
  const optionsEmptyValue = selectOptions.emptyValue;
  const optionsEmptyValueLabel = selectOptions.emptyValueLabel;
  const selectedIndexes = enumOptionsIndexForValue(
    value,
    enumOptions,
    multiple,
  );
  const showPlaceholderOption = !multiple && schema.default === undefined;
  const placeholderLabel = resolveSelectPlaceholderLabel(
    placeholder,
    optionsEmptyValueLabel,
  );
  const emptyValue = multiple ? [] : EMPTY_SELECT_VALUE;
  const resolveEventValue = useCallback(
    (event: ChangeEvent<HTMLSelectElement> | FocusEvent<HTMLSelectElement>) =>
      resolveSelectWidgetValue(event, multiple, enumOptions, optionsEmptyValue),
    [multiple, enumOptions, optionsEmptyValue],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLSelectElement>) => {
      onBlur(id, resolveEventValue(event));
    },
    [id, onBlur, resolveEventValue],
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLSelectElement>) => {
      onFocus(id, resolveEventValue(event));
    },
    [id, onFocus, resolveEventValue],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onChange(resolveEventValue(event));
    },
    [onChange, resolveEventValue],
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
      {showPlaceholderOption && <option value="">{placeholderLabel}</option>}
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

export const AttachmentsAssistantWidget = ({
  id,
  value,
  required,
  disabled,
  readonly,
  options,
  onChange,
  onBlur,
  onFocus,
}: WidgetProps) => {
  const { textareaRef, rows, textValue } = useAutoGrowTextareaModel(
    options.rows,
    value,
  );
  const locale = resolveAttachmentsAssistantLocale(
    i18n.resolvedLanguage ?? i18n.language,
  );
  const t = i18n.getFixedT(locale, 'formpack:offlabel-antrag');
  const currentLines = getAttachmentLines(textValue);
  const additionalLabel = t(
    'offlabel-antrag.attachmentsAssistant.additionalLabel',
    {
      defaultValue:
        locale === 'en'
          ? 'Attachments (additional attachments can be added directly in this field)'
          : 'Anlagen (weitere Anlagen können direkt in diesem Feld ergänzt werden)',
    },
  );
  const [additionalLabelMain, additionalLabelHintRaw] = additionalLabel.split(
    '\n',
    2,
  );
  const additionalLabelHint = additionalLabelHintRaw
    ? stripMarkdownStrong(additionalLabelHintRaw.trim())
    : '';

  const handleToggle = (item: AttachmentsAssistantItem, isChecked: boolean) => {
    const nextLines = isChecked
      ? addRecommendedAttachment(currentLines, item, locale)
      : removeRecommendedAttachment(currentLines, item);
    onChange(nextLines.join('\n'));
  };

  return (
    <div className="attachments-assistant">
      <fieldset className="attachments-assistant__recommended">
        <legend>
          {t('offlabel-antrag.attachmentsAssistant.recommendedHeading', {
            defaultValue: locale === 'en' ? 'Attachments' : 'Anlagen',
          })}
        </legend>
        {ATTACHMENTS_ASSISTANT_ITEMS.map((item) => {
          const checkboxId = `${id}-attachment-${item.id}`;
          return (
            <div key={item.id}>
              <label htmlFor={checkboxId}>
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={hasRecommendedAttachment(currentLines, item)}
                  disabled={disabled || readonly}
                  onChange={(event) => handleToggle(item, event.target.checked)}
                />{' '}
                {t(item.labelKey, {
                  defaultValue: item.value[locale],
                })}
              </label>
            </div>
          );
        })}
      </fieldset>
      <label htmlFor={id}>
        {additionalLabelMain}
        {additionalLabelHint ? (
          <>
            <br />
            <strong>{additionalLabelHint}</strong>
          </>
        ) : null}
      </label>
      <AutoGrowTextarea
        id={id}
        textareaRef={textareaRef}
        value={textValue}
        rows={rows}
        required={required}
        disabled={disabled}
        readonly={readonly}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
      />
    </div>
  );
};
