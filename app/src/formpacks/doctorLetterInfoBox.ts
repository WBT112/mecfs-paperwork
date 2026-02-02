import type { InfoBoxConfig } from './types';

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
    const value = getNestedValue(formData, condition.path);

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
 * Gets a nested value from an object using a path like "decision.q1"
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
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
