import i18n from '../i18n';
import type { SupportedLocale } from '../i18n/locale';
import { isRecord } from '../lib/utils';

/**
 * Sets a nested value on an object based on a dotted key path.
 * Example: setNested(t, "notfallpass.section.person.title", "Person") =>
 *   t.notfallpass.section.person.title = "Person"
 */
export const setNested = (
  target: Record<string, unknown>,
  dottedKey: string,
  value: string,
): void => {
  if (!isRecord(target)) return;
  const segments = dottedKey.split('.').filter(Boolean);
  if (!segments.length) return;

  let cursor: Record<string, unknown> = target;

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const isLeaf = i === segments.length - 1;

    if (isLeaf) {
      cursor[segment] = value;
      return;
    }

    const next = cursor[segment];
    if (!isRecord(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
};

const getNested = (
  target: Record<string, unknown>,
  dottedKey: string,
): Record<string, unknown> | undefined => {
  if (!isRecord(target)) return undefined;
  const segments = dottedKey.split('.').filter(Boolean);
  if (!segments.length) return undefined;

  let cursor: Record<string, unknown> = target;

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const next = cursor[segment];
    if (!isRecord(next)) {
      return undefined;
    }
    cursor = next;
  }

  return cursor;
};

export type I18nTemplateContext = {
  /**
   * A nested translation object that can be used in docx-templates like:
   *   {{t.notfallpass.title}}
   *   {{t.notfallpass.section.person.title}}
   */
  t: Record<string, unknown>;
};

/**
 * Builds a nested i18n translation context for docx-templates.
 *
 * - Reads translations from i18next resource bundle for namespace `formpack:<formpackId>`.
 * - Takes only flat string keys, ignores non-string values (hardening).
 * - Optionally filters keys by prefix. If prefix is provided, only keys that start with `${prefix}.`
 *   are included (example prefix: "notfallpass" or "notfallpass.export").
 *
 * Notes:
 * - This assumes your resource bundle for `formpack:<formpackId>` is a flat key/value map.
 * - If your translations are nested objects instead of flat keys, adjust the extraction logic.
 */
export const buildI18nContext = (
  formpackId: string,
  locale: SupportedLocale,
  prefix?: string,
): I18nTemplateContext => {
  const namespace = `formpack:${formpackId}`;

  let resources: unknown = null;
  try {
    resources = i18n.getResourceBundle(locale, namespace);
  } catch {
    // Hardening: fail closed, do not throw here; caller can proceed without i18n.
    return { t: {} };
  }

  if (!isRecord(resources)) {
    return { t: {} };
  }

  const tObj: Record<string, unknown> = {};
  const prefixFilter = prefix ? `${prefix}.` : null;

  // RATIONALE: Sort entries for deterministic output ordering
  for (const [key, value] of Object.entries(resources).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (prefixFilter && !key.startsWith(prefixFilter)) continue;
    if (typeof value !== 'string') continue;

    setNested(tObj, key, value);
  }

  const aliasSource =
    (prefix && getNested(tObj, prefix)) || getNested(tObj, formpackId);
  if (aliasSource && !('__PACK_ID__' in tObj)) {
    tObj.__PACK_ID__ = aliasSource;
  }

  return { t: tObj };
};
