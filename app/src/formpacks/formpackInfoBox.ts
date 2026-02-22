import type { InfoBoxConfig } from './types';
import { getPathValue } from '../lib/pathAccess';

export type { InfoBoxConfig } from './types';

/**
 * Evaluates whether an infoBox should be shown based on its showIf conditions.
 */
export function shouldShowInfoBox(
  infoBox: InfoBoxConfig,
  formData: Record<string, unknown>,
): boolean {
  if (!infoBox.enabled) {
    return false;
  }

  // If no showIf conditions, just use enabled flag
  if (!infoBox.showIf || infoBox.showIf.length === 0) {
    return true;
  }

  // Evaluate all showIf conditions (all must be true)
  return infoBox.showIf.every((condition) => {
    const value = getPathValue(formData, condition.path);

    switch (condition.op) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      default:
        return false;
    }
  });
}

/**
 * Gets the infoBoxes that should be displayed for a given field anchor.
 */
export function getInfoBoxesForField(
  anchor: string,
  infoBoxes: InfoBoxConfig[],
  formData: Record<string, unknown>,
): InfoBoxConfig[] {
  return infoBoxes.filter(
    (box) => box.anchor === anchor && shouldShowInfoBox(box, formData),
  );
}

/**
 * Gets all visible infoBoxes from a formpack manifest based on form data.
 */
export function getVisibleInfoBoxes(
  manifest: { ui?: { infoBoxes?: InfoBoxConfig[] } },
  formData: Record<string, unknown>,
): InfoBoxConfig[] {
  const infoBoxes = manifest.ui?.infoBoxes || [];
  return infoBoxes.filter((box) => shouldShowInfoBox(box, formData));
}
