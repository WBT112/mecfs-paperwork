import type { FieldTemplateProps } from '@rjsf/utils';
import type { TFunction } from 'i18next';
import { isRecord } from './utils';
import { InfoBox } from '../components/InfoBox';
import { getInfoBoxesForField } from '../formpacks/formpackInfoBox';
import type { InfoBoxConfig } from '../formpacks/types';
import { OFFLABEL_ANTRAG_FORMPACK_ID } from '../formpacks/formpackIds';

type FormpackFieldTemplateProps = Omit<FieldTemplateProps, 'fieldPathId'> & {
  fieldPathId?: FieldTemplateProps['fieldPathId'];
};

type FieldTemplateFormContext = {
  t?: TFunction;
  formpackId?: string;
  infoBoxes?: InfoBoxConfig[];
  formData?: Record<string, unknown>;
};

const isTranslator = (value: unknown): value is TFunction =>
  typeof value === 'function';

const defaultTranslator = ((key: string) => key) as TFunction;

const getFieldTemplateFormContext = (
  formContext: unknown,
): FieldTemplateFormContext => {
  if (!isRecord(formContext)) {
    return {};
  }

  return {
    t: isTranslator(formContext.t) ? formContext.t : undefined,
    formpackId:
      typeof formContext.formpackId === 'string'
        ? formContext.formpackId
        : undefined,
    infoBoxes: Array.isArray(formContext.infoBoxes)
      ? (formContext.infoBoxes as InfoBoxConfig[])
      : undefined,
    formData: isRecord(formContext.formData) ? formContext.formData : undefined,
  };
};

/**
 * Custom field template for formpacks that supports InfoBox rendering.
 * InfoBoxes are rendered directly under their anchored field when enabled.
 */
export function FormpackFieldTemplate(props: FormpackFieldTemplateProps) {
  const {
    id,
    classNames,
    style,
    label,
    displayLabel,
    schema,
    help,
    required,
    description,
    errors,
    children,
    hidden,
    uiSchema,
    registry,
    fieldPathId,
  } = props;

  if (hidden || uiSchema?.['ui:widget'] === 'hidden') {
    return null;
  }

  const formContext = getFieldTemplateFormContext(registry.formContext);
  const infoBoxes = formContext.infoBoxes ?? [];
  const formData = formContext.formData ?? {};
  const t = formContext.t ?? defaultTranslator;
  const namespace = `formpack:${formContext.formpackId ?? 'doctor-letter'}`;
  const schemaType = schema.type;
  const isContainerType =
    schemaType === 'object' ||
    schemaType === 'array' ||
    (Array.isArray(schemaType) &&
      schemaType.some((type) => type === 'object' || type === 'array'));
  const shouldRenderLabel =
    Boolean(label) && displayLabel !== false && !isContainerType;

  // Construct the field anchor from the field ID
  // RJSF IDs are like "root_decision_q1", we need "decision.q1"
  const pathSegments = Array.isArray(fieldPathId?.path)
    ? fieldPathId.path.filter((segment) => segment !== 'root' && segment !== '')
    : [];
  const fieldAnchor =
    pathSegments.length > 0
      ? pathSegments.join('.')
      : id.replace(/^root_/, '').replaceAll('_', '.');
  const isDecisionQuestion = /^decision\.q\d+/.test(fieldAnchor);

  // Get applicable infoBoxes for this field (only if enabled, anchored, and showIf matches)
  const applicableInfoBoxes = getInfoBoxesForField(
    fieldAnchor,
    infoBoxes,
    formData,
  );
  const isOfflabelRequestContainer =
    formContext.formpackId === OFFLABEL_ANTRAG_FORMPACK_ID &&
    fieldAnchor === 'request';
  const flowStatusInfoBoxes = applicableInfoBoxes.filter((infoBox) =>
    infoBox.id.startsWith('offlabel-flow-status-'),
  );
  const regularInfoBoxes = applicableInfoBoxes.filter(
    (infoBox) => !infoBox.id.startsWith('offlabel-flow-status-'),
  );

  const renderInfoBox = (infoBox: InfoBoxConfig, className = '') => (
    <InfoBox
      key={infoBox.id}
      message={t(infoBox.i18nKey, {
        ns: namespace,
        defaultValue: infoBox.i18nKey,
      })}
      format={infoBox.format ?? 'text'}
      className={className}
    />
  );

  return (
    <div className={classNames} style={style}>
      {shouldRenderLabel && (
        <label htmlFor={id} className="control-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {description}
      {children}
      {errors}
      {help}
      {regularInfoBoxes.map((infoBox) => renderInfoBox(infoBox))}
      {isOfflabelRequestContainer &&
        flowStatusInfoBoxes.map((infoBox) =>
          renderInfoBox(infoBox, 'info-box--offlabel-flow-status'),
        )}
      {isDecisionQuestion && (
        <div className="formpack-decision-divider" aria-hidden="true" />
      )}
    </div>
  );
}
