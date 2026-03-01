import {
  getVisibleMedicationKeys,
  isMedicationKey,
  resolveMedicationProfile,
} from './medications';

export type OfflabelFocusTarget =
  | 'request.otherDrugName'
  | 'request.selectedIndicationKey'
  | 'request.indicationFullyMetOrDoctorConfirms';

const resolveNormalizedDrug = (
  request: Record<string, unknown>,
  showDevMedications: boolean,
) => {
  const visibleMedicationKeys = getVisibleMedicationKeys(showDevMedications);
  const requestedDrug = isMedicationKey(request.drug) ? request.drug : null;

  if (requestedDrug && visibleMedicationKeys.includes(requestedDrug)) {
    return requestedDrug;
  }
  return null;
};

export const resolveOfflabelFocusTarget = (
  previousRequest: Record<string, unknown> | null,
  nextRequest: Record<string, unknown> | null,
  showDevMedications: boolean,
): OfflabelFocusTarget | null => {
  if (!previousRequest || !nextRequest) {
    return null;
  }

  const previousDrug = resolveNormalizedDrug(
    previousRequest,
    showDevMedications,
  );
  const nextDrug = resolveNormalizedDrug(nextRequest, showDevMedications);

  if (!nextDrug) {
    return null;
  }

  if (previousDrug === nextDrug) {
    return null;
  }

  const nextProfile = resolveMedicationProfile(nextDrug);
  if (nextProfile.isOther) {
    return 'request.otherDrugName';
  }
  if (nextProfile.indications.length > 1) {
    return 'request.selectedIndicationKey';
  }
  return 'request.indicationFullyMetOrDoctorConfirms';
};
