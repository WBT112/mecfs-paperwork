import type { UiSchema } from '@rjsf/utils';
import { getPathValue } from '../../lib/pathAccess';
import { isRecord } from '../../lib/utils';
import type { SupportedLocale } from '../../i18n/locale';
import {
  getMedicationIndications,
  getVisibleMedicationOptions,
  hasMultipleMedicationIndications,
  resolveMedicationProfile,
} from './medications';

type FormDataState = Record<string, unknown>;
type UiNode = {
  'ui:widget'?: string;
  'ui:enumNames'?: string[];
  'ui:options'?: Record<string, unknown>;
  [key: string]: unknown;
};

const OFFLABEL_SELECT_EMPTY_LABELS = {
  de: {
    drug: '[Medikament wählen]',
    indication: '[Indikation wählen]',
  },
  en: {
    drug: '[Select medication]',
    indication: '[Select indication]',
  },
} as const;

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

/**
 * Applies off-label visibility toggles and localized enum options.
 *
 * @param uiSchema - UI schema to transform.
 * @param formData - Form data subset used by visibility rules.
 * @param locale - Active locale for enum labels.
 * @param showDevMedications - Enables development-only medication options.
 * @returns Either the original `uiSchema` (when `request` is missing/invalid)
 * or a cloned and transformed schema.
 * @remarks `uiSchema` is never mutated in either return path.
 */
export const applyOfflabelVisibility = (
  uiSchema: UiSchema,
  formData: FormDataState,
  locale: SupportedLocale = 'de',
  showDevMedications = false,
): UiSchema => {
  const selectedDrug = getPathValue(formData, 'request.drug');
  const selectedIndicationKey = getPathValue(
    formData,
    'request.selectedIndicationKey',
  );
  const medicationProfile = resolveMedicationProfile(selectedDrug);
  const indicationOptions = getMedicationIndications(selectedDrug, locale);
  const medicationOptions = getVisibleMedicationOptions(
    locale,
    showDevMedications,
  );
  const hasSelectedMedication = medicationOptions.some(
    (option) => option.key === selectedDrug,
  );
  const isOtherDrug = hasSelectedMedication && selectedDrug === 'other';
  const hasSelectedIndication =
    typeof selectedIndicationKey === 'string' &&
    indicationOptions.some((option) => option.key === selectedIndicationKey);
  const hasSingleMedicationIndication =
    !isOtherDrug && medicationProfile.indications.length === 1;
  const shouldShowIndicationSelector =
    hasSelectedMedication &&
    !isOtherDrug &&
    hasMultipleMedicationIndications(medicationProfile);
  const isIndicationStepComplete =
    hasSelectedMedication &&
    !isOtherDrug &&
    (hasSingleMedicationIndication || hasSelectedIndication);
  const indicationConfirmation = getPathValue(
    formData,
    'request.indicationFullyMetOrDoctorConfirms',
  );
  const hasIndicationConfirmation =
    indicationConfirmation === 'yes' || indicationConfirmation === 'no';
  const shouldShowSection2Fallback =
    isIndicationStepComplete && hasIndicationConfirmation;

  if (!isRecord(uiSchema.request)) {
    return uiSchema;
  }

  const clonedUiSchema: UiSchema = {
    ...uiSchema,
    request: structuredClone(uiSchema.request),
  };
  const requestUiSchema = clonedUiSchema.request as UiNode;
  const ensureFieldUiNode = (key: string): UiNode => {
    const currentNode = requestUiSchema[key];
    const fieldUiNode = isRecord(currentNode) ? currentNode : {};
    requestUiSchema[key] = fieldUiNode;
    return fieldUiNode;
  };

  const ensureFieldUiOptionsNode = (fieldUiNode: UiNode): UiNode => {
    const currentOptions = fieldUiNode['ui:options'];
    return isRecord(currentOptions) ? (currentOptions as UiNode) : {};
  };

  const applyFieldVisibility = (
    key: string,
    hideField: boolean,
    visibleWidget?: string,
  ): void => {
    const fieldUiNode = ensureFieldUiNode(key);
    setWidgetVisibility(fieldUiNode, hideField, visibleWidget);
  };

  applyFieldVisibility(
    'indicationFullyMetOrDoctorConfirms',
    !isIndicationStepComplete,
    'radio',
  );
  applyFieldVisibility('applySection2Abs1a', !shouldShowSection2Fallback);
  applyFieldVisibility('otherDrugName', !isOtherDrug);
  applyFieldVisibility('selectedIndicationKey', !shouldShowIndicationSelector);
  applyFieldVisibility('otherIndication', !isOtherDrug);
  applyFieldVisibility('otherTreatmentGoal', !isOtherDrug, 'textarea');
  applyFieldVisibility('otherDose', !isOtherDrug, 'textarea');
  applyFieldVisibility('otherDuration', !isOtherDrug, 'textarea');
  applyFieldVisibility('otherMonitoring', !isOtherDrug, 'textarea');
  applyFieldVisibility('otherEvidenceReference', !isOtherDrug, 'textarea');
  applyFieldVisibility('standardOfCareTriedFreeText', !isOtherDrug, 'textarea');

  const selectedDrugNode = ensureFieldUiNode('drug');
  selectedDrugNode['ui:enumNames'] = medicationOptions.map(
    ({ label }) => label,
  );
  const drugUiOptions = ensureFieldUiOptionsNode(selectedDrugNode);
  selectedDrugNode['ui:options'] = {
    ...drugUiOptions,
    enumOptions: medicationOptions.map(({ key, label }) => ({
      value: key,
      label,
    })),
    emptyValueLabel: OFFLABEL_SELECT_EMPTY_LABELS[locale].drug,
  };
  requestUiSchema.drug = selectedDrugNode;

  const selectedIndicationNode = ensureFieldUiNode('selectedIndicationKey');
  selectedIndicationNode['ui:enumNames'] = indicationOptions.map(
    ({ label }) => label,
  );
  const baseUiOptions = ensureFieldUiOptionsNode(selectedIndicationNode);
  selectedIndicationNode['ui:options'] = {
    ...baseUiOptions,
    enumOptions: indicationOptions.map(({ key, label }) => ({
      value: key,
      label,
    })),
    emptyValueLabel: OFFLABEL_SELECT_EMPTY_LABELS[locale].indication,
  };
  requestUiSchema.selectedIndicationKey = selectedIndicationNode;

  return clonedUiSchema;
};
