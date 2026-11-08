import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFormpackListItems,
  buildRepresentativeLetterListItem,
  CATEGORY_I18N_KEYS,
  countGroupedHelpOffers,
  filterHelpOffersByQuery,
  groupHelpOffersByCategory,
  readResumeFormpackId,
} from '../../src/pages/formpack-list/formpackListHelpers';
import type { FormpackManifest } from '../../src/formpacks/types';

const insurerManifest: FormpackManifest = {
  id: 'formpack-insurer',
  version: '1.0.0',
  defaultLocale: 'de',
  locales: ['de'],
  titleKey: 'Insurer Pack',
  descriptionKey: 'Insurer description',
  exports: ['json'],
  visibility: 'public',
  meta: { category: 'insurer', keywords: ['kasse', 'antrag'] },
};

const otherManifest: FormpackManifest = {
  id: 'formpack-other',
  version: '1.0.0',
  defaultLocale: 'de',
  locales: ['de'],
  titleKey: 'Other Pack',
  descriptionKey: 'Other description',
  exports: ['json'],
  visibility: 'public',
};

const translate = (key: string): string => `${key} translated`;

describe('formpackListHelpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exposes stable i18n keys for each rendered category', () => {
    expect(CATEGORY_I18N_KEYS).toEqual({
      mailings: 'representativeLetter.entryCategory',
      insurer: 'formpackCategoryInsurer',
      doctor: 'formpackCategoryDoctor',
      general: 'formpackCategoryGeneral',
      other: 'formpackCategoryOther',
    });
  });

  it('builds searchable formpack list items including their category', () => {
    const items = buildFormpackListItems([insurerManifest], translate);

    expect(items).toEqual([
      {
        id: 'formpack-formpack-insurer',
        category: 'insurer',
        title: 'Insurer Pack translated',
        description: 'Insurer description translated',
        searchBlob:
          'insurer pack translated insurer description translated kasse antrag formpackcategoryinsurer translated',
        href: '/formpacks/formpack-insurer',
        ariaLabel: 'formpackOpenWithTitle translated',
        openLabel: 'formpackOpen translated',
        formpackId: 'formpack-insurer',
      },
    ]);
  });

  it('falls back to the other category and an empty keyword list', () => {
    const [item] = buildFormpackListItems([otherManifest], (key) => key);

    expect(item.category).toBe('other');
    expect(item.searchBlob).toBe(
      'other pack other description formpackcategoryother',
    );
  });

  it('builds the representative email as a regular searchable item', () => {
    expect(buildRepresentativeLetterListItem(translate)).toEqual({
      id: 'representative-letter',
      category: 'mailings',
      title: 'representativeLetter.entryTitle translated',
      description: 'representativeLetter.entryDescription translated',
      searchBlob:
        'representativeletter.entrytitle translated representativeletter.entrydescription translated representativeletter.entrycategory translated',
      href: '/tools/mail-pflegegesetz',
      ariaLabel: 'representativeLetter.entryAriaLabel translated',
      openLabel: 'representativeLetter.open translated',
    });
  });

  it('filters offers with AND-matched query tokens and keeps blank queries unchanged', () => {
    const items = buildFormpackListItems(
      [insurerManifest, otherManifest],
      (key) => key,
    );

    expect(filterHelpOffersByQuery(items, 'INSURER antrag')).toEqual([
      items[0],
    ]);
    expect(filterHelpOffersByQuery(items, '   ')).toBe(items);
  });

  it('groups offers by category order and appends to existing groups', () => {
    const formpacks = buildFormpackListItems(
      [otherManifest, insurerManifest, insurerManifest],
      (key) => key,
    );
    const representative = buildRepresentativeLetterListItem((key) => key);

    expect(groupHelpOffersByCategory([...formpacks, representative])).toEqual([
      ['mailings', [representative]],
      ['insurer', [formpacks[1], formpacks[2]]],
      ['other', [formpacks[0]]],
    ]);
  });

  it('counts all grouped help offers', () => {
    const items = buildFormpackListItems(
      [otherManifest, insurerManifest],
      (key) => key,
    );
    const groups = groupHelpOffersByCategory(items);

    expect(countGroupedHelpOffers(groups)).toBe(2);
  });

  it('restores the last active formpack only when an active record marker exists', () => {
    window.localStorage.setItem(
      'mecfs-paperwork.lastActiveFormpackId',
      insurerManifest.id,
    );

    expect(readResumeFormpackId()).toBeNull();

    window.localStorage.setItem(
      `mecfs-paperwork.activeRecordId.${insurerManifest.id}`,
      'record-1',
    );

    expect(readResumeFormpackId()).toBe(insurerManifest.id);
  });

  it('returns null when localStorage access fails', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    getItemSpy.mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readResumeFormpackId()).toBeNull();

    getItemSpy.mockRestore();
  });
});
