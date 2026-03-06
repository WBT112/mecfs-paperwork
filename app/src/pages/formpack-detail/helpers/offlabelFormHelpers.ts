import type { SupportedLocale } from '../../../i18n/locale';
import { getPathValue } from '../../../lib/pathAccess';
import { isRecord } from '../../../lib/utils';
import {
  getMedicationIndications,
  getVisibleMedicationKeys,
  getVisibleMedicationOptions,
  isMedicationKey,
  resolveMedicationProfile,
} from '../../../formpacks/offlabel-antrag/medications';
import type { OfflabelFocusTarget } from '../../../formpacks/offlabel-antrag/focusTarget';
import type { RJSFSchema } from '@rjsf/utils';

type FormDataState = Record<string, unknown>;

const OFFLABEL_FOCUS_SELECTOR_BY_TARGET: Record<OfflabelFocusTarget, string> = {
  'request.otherDrugName':
    '#root_request_otherDrugName, [name="root_request_otherDrugName"]',
  'request.selectedIndicationKey':
    '#root_request_selectedIndicationKey, [name="root_request_selectedIndicationKey"]',
  'request.indicationFullyMetOrDoctorConfirms':
    '#root_request_indicationFullyMetOrDoctorConfirms_0, input[name="root_request_indicationFullyMetOrDoctorConfirms"]',
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

function hasSameStringArray(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (const [index, entry] of left.entries()) {
    if (entry !== right[index]) {
      return false;
    }
  }

  return true;
}

const normalizeOfflabelRequest = (
  request: Record<string, unknown>,
  showDevMedications: boolean,
): Record<string, unknown> => {
  const visibleMedicationKeys = getVisibleMedicationKeys(showDevMedications);
  const requestedDrug = isMedicationKey(request.drug) ? request.drug : null;
  const normalizedDrug =
    requestedDrug && visibleMedicationKeys.includes(requestedDrug)
      ? requestedDrug
      : null;

  if (!normalizedDrug) {
    const {
      drug: _unusedDrug,
      selectedIndicationKey: _unusedIndication,
      indicationFullyMetOrDoctorConfirms: _unusedIndicationConfirmation,
      applySection2Abs1a: _unusedSection2Fallback,
      ...rest
    } = request;
    return rest;
  }

  const profile = resolveMedicationProfile(normalizedDrug);
  const requestedIndicationKey =
    typeof request.selectedIndicationKey === 'string'
      ? request.selectedIndicationKey
      : '';
  const hasMultipleIndications = profile.indications.length > 1;
  const fallbackIndicationKey = hasMultipleIndications
    ? ''
    : (profile.indications[0]?.key ?? '');
  const hasValidIndication =
    requestedIndicationKey.length > 0 &&
    profile.indications.some((entry) => entry.key === requestedIndicationKey);
  const normalizedIndicationKey = hasValidIndication
    ? requestedIndicationKey
    : fallbackIndicationKey;

  if (profile.isOther) {
    const {
      selectedIndicationKey: _unused,
      indicationFullyMetOrDoctorConfirms: _unusedIndicationConfirmation,
      applySection2Abs1a: _unusedSection2Fallback,
      ...otherRequest
    } = request;
    return {
      ...otherRequest,
      drug: normalizedDrug,
    };
  }

  const hasCompletedIndicationStep = normalizedIndicationKey.length > 0;
  const requestedIndicationConfirmation =
    request.indicationFullyMetOrDoctorConfirms;
  const hasSelectedIndicationConfirmation =
    requestedIndicationConfirmation === 'yes' ||
    requestedIndicationConfirmation === 'no';

  const normalizedRequest: Record<string, unknown> = {
    ...request,
    drug: normalizedDrug,
    selectedIndicationKey: normalizedIndicationKey,
  };

  if (!hasCompletedIndicationStep) {
    const {
      indicationFullyMetOrDoctorConfirms: _unusedIndicationConfirmation,
      applySection2Abs1a: _unusedSection2Fallback,
      ...withoutIndicationConfirmation
    } = normalizedRequest;
    return withoutIndicationConfirmation;
  }

  if (!hasSelectedIndicationConfirmation) {
    const {
      indicationFullyMetOrDoctorConfirms: _unusedIndicationConfirmation,
      ...withoutIndicationConfirmation
    } = normalizedRequest;
    if (typeof request.applySection2Abs1a !== 'boolean') {
      const {
        applySection2Abs1a: _unusedSection2Fallback,
        ...withoutFallback
      } = withoutIndicationConfirmation;
      return withoutFallback;
    }
    return withoutIndicationConfirmation;
  }

  if (typeof request.applySection2Abs1a !== 'boolean') {
    const { applySection2Abs1a: _unusedSection2Fallback, ...withoutFallback } =
      normalizedRequest;
    return withoutFallback;
  }

  return {
    ...normalizedRequest,
  };
};

const buildOfflabelFormSchema = (
  schema: RJSFSchema,
  formData: FormDataState,
  showDevMedications: boolean,
  locale: SupportedLocale = 'de',
): RJSFSchema => {
  if (!isRecord(schema.properties)) {
    return schema;
  }

  const requestSchemaNode = (schema.properties as Record<string, unknown>)
    .request;
  if (!isRecord(requestSchemaNode) || !isRecord(requestSchemaNode.properties)) {
    return schema;
  }

  const requestProperties = requestSchemaNode.properties;
  const selectedIndicationSchemaNode = requestProperties.selectedIndicationKey;
  const selectedDrugSchemaNode = requestProperties.drug;
  if (
    !isRecord(selectedIndicationSchemaNode) ||
    !isRecord(selectedDrugSchemaNode)
  ) {
    return schema;
  }

  const visibleMedicationKeys = getVisibleMedicationOptions(
    locale,
    showDevMedications,
  ).map(({ key }) => key);
  const normalizedRequest = normalizeOfflabelRequest(
    {
      drug: getPathValue(formData, 'request.drug'),
    },
    showDevMedications,
  );
  const scopedIndicationEnum = getMedicationIndications(
    normalizedRequest.drug,
    locale,
  ).map((indication) => indication.key);
  const currentIndicationEnum = toStringArray(
    selectedIndicationSchemaNode.enum,
  );
  const nextIndicationEnum =
    scopedIndicationEnum.length > 0
      ? scopedIndicationEnum
      : currentIndicationEnum;
  const currentDrugEnum = toStringArray(selectedDrugSchemaNode.enum);

  if (
    hasSameStringArray(currentDrugEnum, visibleMedicationKeys) &&
    hasSameStringArray(currentIndicationEnum, nextIndicationEnum)
  ) {
    return schema;
  }

  const clonedSchema = structuredClone(schema);
  if (!isRecord(clonedSchema.properties)) {
    return schema;
  }
  const clonedRequestSchemaNode = (
    clonedSchema.properties as Record<string, unknown>
  ).request;
  if (
    !isRecord(clonedRequestSchemaNode) ||
    !isRecord(clonedRequestSchemaNode.properties)
  ) {
    return schema;
  }
  const clonedRequestProperties = clonedRequestSchemaNode.properties;
  const clonedSelectedIndicationNode =
    clonedRequestProperties.selectedIndicationKey;
  const clonedSelectedDrugNode = clonedRequestProperties.drug;
  if (
    !isRecord(clonedSelectedIndicationNode) ||
    !isRecord(clonedSelectedDrugNode)
  ) {
    return schema;
  }

  clonedSelectedDrugNode.enum = [...visibleMedicationKeys];
  clonedSelectedIndicationNode.enum = [...nextIndicationEnum];
  return clonedSchema;
};

/**
 * Collects offlabel request normalization and schema helpers for the detail page.
 */
export const offlabelFormHelpers = {
  buildOfflabelFormSchema,
  hasSameStringArray,
  normalizeOfflabelRequest,
  OFFLABEL_FOCUS_SELECTOR_BY_TARGET,
  toStringArray,
};
