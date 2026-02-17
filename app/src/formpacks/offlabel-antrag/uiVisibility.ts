import type { UiSchema } from '@rjsf/utils';
import { getPathValue } from '../../lib/pathAccess';
import { isRecord } from '../../lib/utils';

type FormDataState = Record<string, unknown>;
type UiNode = Record<string, unknown>;

const setWidgetVisibility = (
  node: UiNode,
  isHidden: boolean,
  visibleWidget?: string,
): void => {
  if (isHidden) {
    node['ui:widget'] = 'hidden';
    return;
  }
  if (visibleWidget) {
    node['ui:widget'] = visibleWidget;
    return;
  }
  delete node['ui:widget'];
};

export const applyOfflabelVisibility = (
  uiSchema: UiSchema,
  formData: FormDataState,
): UiSchema => {
  const selectedDrug = getPathValue(formData, 'request.drug');
  const isOtherDrug = selectedDrug === 'other';

  if (!isRecord(uiSchema.request)) {
    return uiSchema;
  }

  const clonedUiSchema = structuredClone(uiSchema);
  const requestUiSchema = clonedUiSchema.request as UiNode;
  const applyFieldVisibility = (
    key: string,
    hideField: boolean,
    visibleWidget?: string,
  ): void => {
    const currentNode = requestUiSchema[key];
    const fieldUiNode = isRecord(currentNode) ? currentNode : {};
    setWidgetVisibility(fieldUiNode, hideField, visibleWidget);
    requestUiSchema[key] = fieldUiNode;
  };

  applyFieldVisibility(
    'indicationFullyMetOrDoctorConfirms',
    isOtherDrug,
    'radio',
  );
  applyFieldVisibility('applySection2Abs1a', isOtherDrug);
  applyFieldVisibility('otherDrugName', !isOtherDrug);
  applyFieldVisibility('otherIndication', !isOtherDrug);
  applyFieldVisibility('otherTreatmentGoal', !isOtherDrug, 'textarea');
  applyFieldVisibility('otherDose', !isOtherDrug, 'textarea');
  applyFieldVisibility('otherDuration', !isOtherDrug, 'textarea');
  applyFieldVisibility('otherMonitoring', !isOtherDrug, 'textarea');
  applyFieldVisibility('standardOfCareTriedFreeText', !isOtherDrug, 'textarea');

  return clonedUiSchema;
};
