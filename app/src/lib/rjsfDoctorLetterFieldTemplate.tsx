import type { FieldTemplateProps } from '@rjsf/utils';
import { InfoBox } from '../components/InfoBox';
import type { InfoBoxConfig } from '../formpacks/types';

interface DoctorLetterFieldTemplateProps extends FieldTemplateProps {
  formContext?: {
    t?: (key: string) => string;
    formpackId?: string;
    infoBoxes?: InfoBoxConfig[];
  };
}

/**
 * Custom field template for doctor-letter formpack that supports InfoBox rendering.
 * InfoBoxes are rendered directly under their anchored field when enabled.
 */
export function DoctorLetterFieldTemplate(
  props: DoctorLetterFieldTemplateProps,
) {
  const {
    id,
    classNames,
    style,
    label,
    help,
    required,
    description,
    errors,
    children,
    formContext,
    hidden,
    uiSchema,
  } = props;

  if (hidden || uiSchema?.['ui:widget'] === 'hidden') {
    return null;
  }

  const infoBoxes = formContext?.infoBoxes || [];
  const t = formContext?.t || ((key: string) => key);

  // Construct the field anchor from the field ID
  // RJSF IDs are like "root_decision_q1", we need "decision.q1"
  const fieldAnchor = id.replace(/^root_/, '').replace(/_/g, '.');

  // Get applicable infoBoxes for this field (only if enabled and anchor matches)
  const applicableInfoBoxes = infoBoxes.filter(
    (infoBox) => infoBox.enabled && infoBox.anchor === fieldAnchor,
  );

  return (
    <div className={classNames} style={style}>
      {label && (
        <label htmlFor={id} className="control-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {description}
      {children}
      {errors}
      {help}
      {applicableInfoBoxes.map((infoBox) => (
        <InfoBox key={infoBox.id} message={t(infoBox.i18nKey)} />
      ))}
    </div>
  );
}
