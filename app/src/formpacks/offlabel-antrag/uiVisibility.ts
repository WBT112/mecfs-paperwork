import type { UiSchema } from '@rjsf/utils';
import { isRecord } from '../../lib/utils';

type FormDataState = Record<string, unknown>;
type UiNode = Record<string, unknown>;

const getValueByPath = (source: unknown, dottedPath: string): unknown => {
  if (!dottedPath) {
    return source;
  }

  return dottedPath.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current) && !Array.isArray(current)) {
      return undefined;
    }

    if (isRecord(current)) {
      return current[segment];
    }

    const index = Number(segment);
    if (Number.isNaN(index)) {
      return undefined;
    }

    return current[index];
  }, source);
};

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
  const selectedDrug = getValueByPath(formData, 'request.drug');
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
