import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTranslatedManifests,
  CATEGORY_I18N_KEYS,
  countGroupedFormpacks,
  filterFormpacksByQuery,
  groupFormpacksByCategory,
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

describe('formpackListHelpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exposes stable i18n keys for each rendered category', () => {
    expect(CATEGORY_I18N_KEYS).toEqual({
      insurer: 'formpackCategoryInsurer',
      doctor: 'formpackCategoryDoctor',
      general: 'formpackCategoryGeneral',
      other: 'formpackCategoryOther',
    });
  });

  it('builds translated manifests with cached search blobs', () => {
    const translated = buildTranslatedManifests(
      [insurerManifest],
      (key) => `${key} translated`,
    );

    expect(translated).toEqual([
      expect.objectContaining({
        manifest: insurerManifest,
        title: 'Insurer Pack translated',
        description: 'Insurer description translated',
        searchBlob:
          'insurer pack translated insurer description translated kasse antrag',
      }),
    ]);
  });

  it('filters manifests with AND-matched query tokens and keeps blank queries unchanged', () => {
    const translated = buildTranslatedManifests(
      [insurerManifest, otherManifest],
      (key) => key,
    );

    expect(filterFormpacksByQuery(translated, 'insurer antrag')).toEqual([
      translated[0],
    ]);
    expect(filterFormpacksByQuery(translated, '   ')).toEqual(translated);
  });

  it('groups manifests by category order and falls back to other', () => {
    const translated = buildTranslatedManifests(
      [otherManifest, insurerManifest],
      (key) => key,
    );

    expect(groupFormpacksByCategory(translated)).toEqual([
      ['insurer', [translated[1]]],
      ['other', [translated[0]]],
    ]);
  });

  it('counts all grouped manifests', () => {
    const translated = buildTranslatedManifests(
      [otherManifest, insurerManifest],
      (key) => key,
    );
    const groups = groupFormpacksByCategory(translated);

    expect(countGroupedFormpacks(groups)).toBe(2);
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
