import type { UiSchema } from '@rjsf/utils';
import { getPathValue } from '../../lib/pathAccess';
import { isRecord } from '../../lib/utils';
import type { SupportedLocale } from '../../i18n/locale';
import {
  getMedicationIndications,
  hasMultipleMedicationIndications,
  resolveMedicationProfile,
} from './medications';

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
  locale: SupportedLocale = 'de',
): UiSchema => {
  const selectedDrug = getPathValue(formData, 'request.drug');
  const isOtherDrug = selectedDrug === 'other';
  const medicationProfile = resolveMedicationProfile(selectedDrug);
  const indicationOptions = getMedicationIndications(selectedDrug, locale);
  const shouldShowIndicationSelector =
    !isOtherDrug && hasMultipleMedicationIndications(medicationProfile);

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
  applyFieldVisibility('selectedIndicationKey', !shouldShowIndicationSelector);
  applyFieldVisibility('otherIndication', !isOtherDrug);
  applyFieldVisibility('otherTreatmentGoal', !isOtherDrug, 'textarea');
  applyFieldVisibility('otherDose', !isOtherDrug, 'textarea');
  applyFieldVisibility('otherDuration', !isOtherDrug, 'textarea');
  applyFieldVisibility('otherMonitoring', !isOtherDrug, 'textarea');
  applyFieldVisibility('standardOfCareTriedFreeText', !isOtherDrug, 'textarea');

  const selectedIndicationNode = isRecord(requestUiSchema.selectedIndicationKey)
    ? requestUiSchema.selectedIndicationKey
    : {};
  selectedIndicationNode['ui:enumNames'] = indicationOptions.map(
    ({ label }) => label,
  );
  const baseUiOptions = isRecord(selectedIndicationNode['ui:options'])
    ? (selectedIndicationNode['ui:options'] as UiNode)
    : {};
  selectedIndicationNode['ui:options'] = {
    ...baseUiOptions,
    enumOptions: indicationOptions.map(({ key, label }) => ({
      value: key,
      label,
    })),
  };
  requestUiSchema.selectedIndicationKey = selectedIndicationNode;

  return clonedUiSchema;
};
