import { readLocalStorage } from '../../lib/safeLocalStorage';
import type { FormpackCategory, FormpackManifest } from '../../formpacks/types';

const CATEGORY_ORDER: FormpackCategory[] = [
  'insurer',
  'doctor',
  'general',
  'other',
];

export const CATEGORY_I18N_KEYS: Record<FormpackCategory, string> = {
  insurer: 'formpackCategoryInsurer',
  doctor: 'formpackCategoryDoctor',
  general: 'formpackCategoryGeneral',
  other: 'formpackCategoryOther',
};

const LAST_ACTIVE_FORMPACK_KEY = 'mecfs-paperwork.lastActiveFormpackId';

/**
 * View model for a translated formpack card.
 *
 * @remarks
 * RATIONALE: The list page needs precomputed searchable strings so the UI can
 * stay declarative while search remains deterministic and locale-aware.
 */
export type TranslatedManifest = {
  manifest: FormpackManifest;
  title: string;
  description: string;
  searchBlob: string;
};

/**
 * Restores the last active formpack only when a matching active record marker
 * still exists.
 *
 * @returns The resumable formpack id or `null` when no valid resume target is available.
 */
export const readResumeFormpackId = (): string | null => {
  const formpackId = readLocalStorage(LAST_ACTIVE_FORMPACK_KEY);
  if (!formpackId) {
    return null;
  }

  const activeRecordId = readLocalStorage(
    `mecfs-paperwork.activeRecordId.${formpackId}`,
  );
  return activeRecordId ? formpackId : null;
};

/**
 * Builds translated card models used for rendering and full-text search.
 *
 * @param manifests - Visible formpack manifests.
 * @param translate - Translation function used for localized titles and descriptions.
 * @returns Localized card models with cached search text.
 */
export const buildTranslatedManifests = (
  manifests: FormpackManifest[],
  translate: (key: string, options?: Record<string, unknown>) => string,
): TranslatedManifest[] =>
  manifests.map((manifest) => {
    const namespace = `formpack:${manifest.id}`;
    const title = translate(manifest.titleKey, {
      ns: namespace,
      defaultValue: manifest.titleKey,
    });
    const description = translate(manifest.descriptionKey, {
      ns: namespace,
      defaultValue: manifest.descriptionKey,
    });
    const keywords = (manifest.meta?.keywords ?? []).join(' ');
    const searchBlob = `${title} ${description} ${keywords}`.toLowerCase();

    return { manifest, title, description, searchBlob };
  });

/**
 * Filters translated formpacks using AND-matched query tokens.
 *
 * @param items - Localized formpack card models.
 * @param query - Raw user-entered search query.
 * @returns Matching items, or the original list when the query is blank.
 */
export const filterFormpacksByQuery = (
  items: TranslatedManifest[],
  query: string,
): TranslatedManifest[] => {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return items;
  }

  return items.filter((item) =>
    tokens.every((token) => item.searchBlob.includes(token)),
  );
};

/**
 * Groups translated formpacks by their configured list category.
 *
 * @param items - Localized formpack card models.
 * @returns Category groups in the configured display order.
 */
export const groupFormpacksByCategory = (
  items: TranslatedManifest[],
): [FormpackCategory, TranslatedManifest[]][] => {
  const groups = new Map<FormpackCategory, TranslatedManifest[]>();

  for (const item of items) {
    const category = item.manifest.meta?.category ?? 'other';
    const list = groups.get(category);
    if (list) {
      list.push(item);
    } else {
      groups.set(category, [item]);
    }
  }

  return CATEGORY_ORDER.filter((category) => groups.has(category)).map(
    (category) => [category, groups.get(category)!],
  );
};

/**
 * Counts rendered formpack cards across all category groups.
 *
 * @param groups - Grouped formpack card models.
 * @returns Total number of rendered cards.
 */
export const countGroupedFormpacks = (
  groups: [FormpackCategory, TranslatedManifest[]][],
): number => groups.reduce((total, [, items]) => total + items.length, 0);
