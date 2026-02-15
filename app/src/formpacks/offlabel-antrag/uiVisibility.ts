import type { UiSchema } from '@rjsf/utils';
import { isRecord } from '../../lib/utils';

type FormDataState = Record<string, unknown>;

const getValueByPath = (
  source: unknown,
  dottedPath: string,
): unknown | undefined => {
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
  node: Record<string, unknown>,
  isHidden: boolean,
): void => {
  if (isHidden) {
    node['ui:widget'] = 'hidden';
    return;
  }
  delete node['ui:widget'];
};

export const applyOfflabelVisibility = (
  uiSchema: UiSchema,
  formData: FormDataState,
): UiSchema => {
  const clonedUiSchema = structuredClone(uiSchema);
  const selectedDrug = getValueByPath(formData, 'request.drug');
  const isOtherDrug = selectedDrug === 'other';

  if (!isRecord(clonedUiSchema.request)) {
    return clonedUiSchema;
  }

  const requestUiSchema = clonedUiSchema.request;
  const indicationUi = isRecord(
    requestUiSchema.indicationFullyMetOrDoctorConfirms,
  )
    ? requestUiSchema.indicationFullyMetOrDoctorConfirms
    : {};
  setWidgetVisibility(indicationUi, isOtherDrug);
  requestUiSchema.indicationFullyMetOrDoctorConfirms = indicationUi;

  const section2Ui = isRecord(requestUiSchema.applySection2Abs1a)
    ? requestUiSchema.applySection2Abs1a
    : {};
  setWidgetVisibility(section2Ui, isOtherDrug);
  requestUiSchema.applySection2Abs1a = section2Ui;

  const otherDrugNameUi = isRecord(requestUiSchema.otherDrugName)
    ? requestUiSchema.otherDrugName
    : {};
  setWidgetVisibility(otherDrugNameUi, !isOtherDrug);
  requestUiSchema.otherDrugName = otherDrugNameUi;

  const otherIndicationUi = isRecord(requestUiSchema.otherIndication)
    ? requestUiSchema.otherIndication
    : {};
  setWidgetVisibility(otherIndicationUi, !isOtherDrug);
  requestUiSchema.otherIndication = otherIndicationUi;

  const otherTreatmentGoalUi = isRecord(requestUiSchema.otherTreatmentGoal)
    ? requestUiSchema.otherTreatmentGoal
    : {};
  setWidgetVisibility(otherTreatmentGoalUi, !isOtherDrug);
  requestUiSchema.otherTreatmentGoal = otherTreatmentGoalUi;

  const otherDoseUi = isRecord(requestUiSchema.otherDose)
    ? requestUiSchema.otherDose
    : {};
  setWidgetVisibility(otherDoseUi, !isOtherDrug);
  requestUiSchema.otherDose = otherDoseUi;

  const otherDurationUi = isRecord(requestUiSchema.otherDuration)
    ? requestUiSchema.otherDuration
    : {};
  setWidgetVisibility(otherDurationUi, !isOtherDrug);
  requestUiSchema.otherDuration = otherDurationUi;

  const otherMonitoringUi = isRecord(requestUiSchema.otherMonitoring)
    ? requestUiSchema.otherMonitoring
    : {};
  setWidgetVisibility(otherMonitoringUi, !isOtherDrug);
  requestUiSchema.otherMonitoring = otherMonitoringUi;

  const standardOfCareUi = isRecord(requestUiSchema.standardOfCareTriedFreeText)
    ? requestUiSchema.standardOfCareTriedFreeText
    : {};
  setWidgetVisibility(standardOfCareUi, !isOtherDrug);
  requestUiSchema.standardOfCareTriedFreeText = standardOfCareUi;

  return clonedUiSchema;
};
