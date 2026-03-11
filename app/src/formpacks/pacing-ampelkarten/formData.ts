import { getPathValue } from '../../lib/pathAccess';
import { isRecord } from '../../lib/utils';
import { buildPacingAmpelkartenPreset } from './presets';

type FormDataState = Record<string, unknown>;

const hasOwnKey = (value: unknown, key: string): boolean =>
  isRecord(value) && Object.hasOwn(value, key);

const resolvePacingPresetVariant = (value: unknown): 'adult' | 'child' =>
  value === 'child' ? 'child' : 'adult';

const resolvePacingPresetLocale = (locale: string): 'de' | 'en' =>
  locale === 'en' ? 'en' : 'de';

const mergePacingTopLevelSection = (
  current: FormDataState,
  incoming: FormDataState,
  fallback: FormDataState,
  key: 'sender' | 'adult' | 'child',
): unknown => {
  if (hasOwnKey(incoming, key)) {
    return incoming[key];
  }

  if (hasOwnKey(current, key)) {
    return current[key];
  }

  return fallback[key];
};

/**
 * Merges pacing ampelkarten form updates while preserving hidden variant data.
 *
 * @param current - Current form data stored in component state.
 * @param incoming - Next form data emitted by RJSF for the visible fields.
 * @param locale - Active app locale used to hydrate missing default sections.
 * @returns Form data with the selected variant metadata merged and missing sections restored.
 * @remarks
 * RATIONALE: RJSF change events can omit currently hidden sections. The pacing
 * form keeps adult and child presets side by side, so switching variants must
 * not discard the hidden section. When a section is absent in both current and
 * incoming state, locale-specific defaults are injected.
 */
export const mergePacingFormData = (
  current: FormDataState,
  incoming: FormDataState,
  locale: string,
): FormDataState => {
  const variant = resolvePacingPresetVariant(
    getPathValue(incoming, 'meta.variant'),
  );
  const fallback = buildPacingAmpelkartenPreset(
    resolvePacingPresetLocale(locale),
    variant,
  ) as unknown as FormDataState;

  return {
    ...current,
    ...incoming,
    meta: {
      ...(isRecord(current.meta) ? current.meta : {}),
      ...(isRecord(incoming.meta) ? incoming.meta : {}),
      variant,
    },
    sender: mergePacingTopLevelSection(current, incoming, fallback, 'sender'),
    adult: mergePacingTopLevelSection(current, incoming, fallback, 'adult'),
    child: mergePacingTopLevelSection(current, incoming, fallback, 'child'),
  };
};
