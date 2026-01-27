/* eslint-disable react-refresh/only-export-components */

import type { ReactNode } from 'react';
import type {
  ArrayFieldItemTemplateProps,
  ArrayFieldTemplateProps,
  DescriptionFieldProps,
  FieldHelpProps,
  IconButtonProps,
  TemplatesType,
  UiSchema,
} from '@rjsf/utils';
import type { TFunction } from 'i18next';
import { buttonId, getTemplate, getUiOptions, helpId } from '@rjsf/utils';
import MarkdownRenderer from '../components/Markdown/MarkdownRenderer';

export type FormpackFormContext = {
  t: TFunction;
};

const isFormpackFormContext = (
  context: unknown,
): context is FormpackFormContext => {
  return (
    typeof context === 'object' &&
    context !== null &&
    't' in context &&
    typeof (context as { t: unknown }).t === 'function'
  );
};

const defaultTranslator = ((key: string) => key) as TFunction;

const getTranslator = (formContext: unknown): TFunction =>
  isFormpackFormContext(formContext) ? formContext.t : defaultTranslator;

const buildButtonClassName = (className?: string) =>
  ['app__button', 'formpack-array-button', className].filter(Boolean).join(' ');

const TranslatedButton = (
  props: IconButtonProps & { translationKey: string },
) => {
  const { className, disabled, onClick, children, registry, translationKey } =
    props;
  const t = getTranslator(registry.formContext);

  return (
    <button
      type="button"
      className={buildButtonClassName(className)}
      onClick={onClick}
      disabled={disabled}
    >
      {children ?? t(translationKey)}
    </button>
  );
};

const ArrayAddButton = (props: IconButtonProps) => (
  <TranslatedButton {...props} translationKey="common.add" />
);

const ArrayRemoveButton = (props: IconButtonProps) => (
  <TranslatedButton {...props} translationKey="common.remove" />
);

const ArrayFieldTemplate = (props: ArrayFieldTemplateProps) => {
  const {
    canAdd,
    className,
    disabled,
    fieldPathId,
    items,
    onAddClick,
    readonly,
    registry,
    required,
    schema,
    title,
    uiSchema,
  } = props;
  const uiOptions = getUiOptions(uiSchema);
  const ArrayFieldDescriptionTemplate = getTemplate(
    'ArrayFieldDescriptionTemplate',
    registry,
    uiOptions,
  );
  const ArrayFieldTitleTemplate = getTemplate(
    'ArrayFieldTitleTemplate',
    registry,
    uiOptions,
  );
  const { ButtonTemplates } = registry.templates;
  const uiTitle =
    uiSchema && typeof uiSchema['ui:title'] === 'string'
      ? uiSchema['ui:title']
      : undefined;
  const addLabelBase = uiTitle ?? uiOptions.title ?? title;
  const t = getTranslator(registry.formContext);
  const addLabel = addLabelBase
    ? t('common.addItemWithTitle', { item: addLabelBase })
    : t('common.add');
  const showOptionalDataControlInTitle = !readonly && !disabled;

  return (
    <fieldset
      className={`formpack-array ${className ?? ''}`}
      id={fieldPathId.$id}
    >
      <ArrayFieldTitleTemplate
        fieldPathId={fieldPathId}
        title={addLabelBase}
        required={required}
        schema={schema}
        uiSchema={uiSchema}
        registry={registry}
        optionalDataControl={
          showOptionalDataControlInTitle ? props.optionalDataControl : undefined
        }
      />
      <ArrayFieldDescriptionTemplate
        fieldPathId={fieldPathId}
        description={uiOptions.description || schema.description}
        schema={schema}
        uiSchema={uiSchema}
        registry={registry}
      />
      {!showOptionalDataControlInTitle ? props.optionalDataControl : undefined}
      <div className="formpack-array__items">{items}</div>
      {canAdd && (
        <div className="formpack-array__add">
          <ButtonTemplates.AddButton
            id={buttonId(fieldPathId, 'add')}
            className="formpack-array__add-button"
            onClick={onAddClick}
            disabled={disabled || readonly}
            uiSchema={uiSchema}
            registry={registry}
          >
            {addLabel}
          </ButtonTemplates.AddButton>
        </div>
      )}
    </fieldset>
  );
};

const getArrayItemTitle = (
  parentUiSchema: UiSchema | undefined,
  index: number,
  t: TFunction,
): string => {
  const parentTitle =
    parentUiSchema && typeof parentUiSchema['ui:title'] === 'string'
      ? parentUiSchema['ui:title']
      : undefined;
  const itemLabel = parentTitle ?? t('common.item');

  return t('common.itemWithIndex', { item: itemLabel, index: index + 1 });
};

const ArrayFieldItemTemplate = (props: ArrayFieldItemTemplateProps) => {
  const { children, buttonsProps, index, parentUiSchema, registry } = props;
  const { ButtonTemplates } = registry.templates;
  const t = getTranslator(registry.formContext);
  const itemTitle = getArrayItemTitle(parentUiSchema, index, t);

  return (
    <div className="formpack-array-item">
      <div className="formpack-array-item__header">
        <p className="formpack-array-item__title">{itemTitle}</p>
        {buttonsProps.hasRemove && (
          <ButtonTemplates.RemoveButton
            className="formpack-array-item__remove"
            onClick={buttonsProps.onRemoveItem}
            disabled={buttonsProps.disabled || buttonsProps.readonly}
            uiSchema={buttonsProps.uiSchema}
            registry={buttonsProps.registry}
          >
            {t('common.remove')}
          </ButtonTemplates.RemoveButton>
        )}
      </div>
      <div className="formpack-array-item__content">{children}</div>
    </div>
  );
};

const renderMarkdownIfString = (content: ReactNode) => {
  if (typeof content !== 'string') {
    return content;
  }

  return <MarkdownRenderer content={content} />;
};

const DescriptionFieldTemplate = ({
  id,
  description,
}: DescriptionFieldProps) => {
  if (!description) {
    return null;
  }

  return (
    <div id={id} className="field-description">
      {renderMarkdownIfString(description)}
    </div>
  );
};

const FieldHelpTemplate = ({ fieldPathId, help }: FieldHelpProps) => {
  if (!help) {
    return null;
  }

  return (
    <div id={helpId(fieldPathId)} className="help-block">
      {renderMarkdownIfString(help)}
    </div>
  );
};

/**
 * Templates for array actions to keep controls labeled and accessible.
 */
type FormpackTemplates = Partial<Omit<TemplatesType, 'ButtonTemplates'>> & {
  ButtonTemplates?: Partial<TemplatesType['ButtonTemplates']>;
};

export const formpackTemplates: FormpackTemplates = {
  ArrayFieldTemplate,
  ArrayFieldItemTemplate,
  DescriptionFieldTemplate,
  FieldHelpTemplate,
  // RATIONALE: Array item reordering and copying are disabled by design.
  // The UI prioritizes simplicity and predictable data entry over complex
  // array management. Most use cases involve append-only data entry.
  ButtonTemplates: {
    AddButton: ArrayAddButton,
    RemoveButton: ArrayRemoveButton,
    MoveUpButton: () => null,
    MoveDownButton: () => null,
    CopyButton: () => null,
  },
};
