import type { FieldTemplateProps } from '@rjsf/utils';
import { InfoBox } from '../components/InfoBox';
import type { InfoBoxConfig } from '../formpacks/types';
import { getInfoBoxesForField } from '../formpacks/doctorLetterInfoBox';

interface DoctorLetterFieldTemplateProps extends FieldTemplateProps {
  formContext?: {
    t?: (key: string) => string;
    formpackId?: string;
    infoBoxes?: InfoBoxConfig[];
    formData?: Record<string, unknown>;
  };
}

/**
 * Custom field template for doctor-letter formpack that supports InfoBox rendering.
 * InfoBoxes are rendered directly under their anchored field when enabled and conditions match.
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
  } = props;

  const infoBoxes = formContext?.infoBoxes || [];
  const formData = formContext?.formData || {};
  const t = formContext?.t || ((key: string) => key);

  // Construct the field anchor from the field ID
  // RJSF IDs are like "root_decision_q1", we need "decision.q1"
  const fieldAnchor = id.replace(/^root_/, '').replace(/_/g, '.');

  // Get applicable infoBoxes for this field
  const applicableInfoBoxes = getInfoBoxesForField(
    fieldAnchor,
    infoBoxes,
    formData,
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
