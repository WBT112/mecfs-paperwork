import type { FormpackCategory, FormpackManifest } from '../../formpacks/types';
import { readLocalStorage } from '../../lib/safeLocalStorage';

/** Categories shown on the help-offer overview. */
export type HelpOfferCategory = 'mailings' | FormpackCategory;

const CATEGORY_ORDER: HelpOfferCategory[] = [
  'mailings',
  'insurer',
  'doctor',
  'general',
  'other',
];

/** Translation keys for the labels of all help-offer categories. */
export const CATEGORY_I18N_KEYS: Record<HelpOfferCategory, string> = {
  mailings: 'representativeLetter.entryCategory',
  insurer: 'formpackCategoryInsurer',
  doctor: 'formpackCategoryDoctor',
  general: 'formpackCategoryGeneral',
  other: 'formpackCategoryOther',
};

const LAST_ACTIVE_FORMPACK_KEY = 'mecfs-paperwork.lastActiveFormpackId';

/** View model for a searchable help-offer card. */
export type HelpOfferListItem = {
  id: string;
  category: HelpOfferCategory;
  title: string;
  description: string;
  searchBlob: string;
  href: string;
  ariaLabel: string;
  openLabel: string;
  formpackId?: string;
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

const createSearchBlob = (...parts: string[]): string =>
  parts.join(' ').toLocaleLowerCase();

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
 * Builds localized list items for the formpack catalog.
 *
 * @param manifests - Visible formpack manifests.
 * @param translate - Translation function used for localized card content.
 * @returns Searchable help-offer items for the supplied formpacks.
 */
export const buildFormpackListItems = (
  manifests: FormpackManifest[],
  translate: Translate,
): HelpOfferListItem[] =>
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
    const category = manifest.meta?.category ?? 'other';
    const keywords = manifest.meta?.keywords ?? [];

    return {
      id: `formpack-${manifest.id}`,
      category,
      title,
      description,
      searchBlob: createSearchBlob(
        title,
        description,
        ...keywords,
        translate(CATEGORY_I18N_KEYS[category]),
      ),
      href: `/formpacks/${manifest.id}`,
      ariaLabel: translate('formpackOpenWithTitle', { title }),
      openLabel: translate('formpackOpen'),
      formpackId: manifest.id,
    };
  });

/**
 * Builds the representative-email entry for the shared help-offer list.
 *
 * @param translate - Translation function used for localized card content.
 * @returns The searchable representative-email list item.
 */
export const buildRepresentativeLetterListItem = (
  translate: Translate,
): HelpOfferListItem => {
  const title = translate('representativeLetter.entryTitle');
  const description = translate('representativeLetter.entryDescription');
  const category = translate(CATEGORY_I18N_KEYS.mailings);

  return {
    id: 'representative-letter',
    category: 'mailings',
    title,
    description,
    searchBlob: createSearchBlob(title, description, category),
    href: '/tools/mail-pflegegesetz',
    ariaLabel: translate('representativeLetter.entryAriaLabel'),
    openLabel: translate('representativeLetter.open'),
  };
};

/**
 * Filters help offers using AND-matched query tokens.
 *
 * @param items - Localized help-offer card models.
 * @param query - Raw user-entered search query.
 * @returns Matching items, or the original list when the query is blank.
 */
export const filterHelpOffersByQuery = (
  items: HelpOfferListItem[],
  query: string,
): HelpOfferListItem[] => {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return items;
  }

  return items.filter((item) =>
    tokens.every((token) => item.searchBlob.includes(token)),
  );
};

/**
 * Groups help offers by their configured list category.
 *
 * @param items - Localized help-offer card models.
 * @returns Non-empty category groups in the configured display order.
 */
export const groupHelpOffersByCategory = (
  items: HelpOfferListItem[],
): [HelpOfferCategory, HelpOfferListItem[]][] => {
  const groups = new Map<HelpOfferCategory, HelpOfferListItem[]>();

  for (const item of items) {
    const list = groups.get(item.category);
    if (list) {
      list.push(item);
    } else {
      groups.set(item.category, [item]);
    }
  }

  return CATEGORY_ORDER.filter((category) => groups.has(category)).map(
    (category) => [category, groups.get(category)!],
  );
};

/**
 * Counts rendered cards across all category groups.
 *
 * @param groups - Grouped help-offer card models.
 * @returns Total number of rendered cards.
 */
export const countGroupedHelpOffers = (
  groups: [HelpOfferCategory, HelpOfferListItem[]][],
): number => groups.reduce((total, [, items]) => total + items.length, 0);
