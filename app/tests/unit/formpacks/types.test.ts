import { describe, expect, it } from 'vitest';
import {
  FORMPACK_CATEGORIES,
  FORMPACK_EXPORT_TYPES,
  FORMPACK_VISIBILITIES,
  isFormpackCategory,
  isFormpackExportType,
  isFormpackVisibility,
} from '../../../src/formpacks/types';

const validExportType = 'docx';
const invalidExportType = 'txt';
const validVisibility = 'public';
const invalidVisibility = 'hidden';

describe('formpack type helpers', () => {
  it('exposes the supported export types', () => {
    expect(FORMPACK_EXPORT_TYPES).toEqual(['docx', 'json', 'pdf']);
  });

  it('validates export types', () => {
    expect(isFormpackExportType(validExportType)).toBe(true);
    expect(isFormpackExportType(invalidExportType)).toBe(false);
    expect(isFormpackExportType(42)).toBe(false);
  });

  it('exposes the supported visibilities', () => {
    expect(FORMPACK_VISIBILITIES).toEqual(['public', 'dev']);
  });

  it('validates visibilities', () => {
    expect(isFormpackVisibility(validVisibility)).toBe(true);
    expect(isFormpackVisibility(invalidVisibility)).toBe(false);
    expect(isFormpackVisibility(null)).toBe(false);
  });

  it('exposes the supported categories', () => {
    expect(FORMPACK_CATEGORIES).toEqual([
      'insurer',
      'doctor',
      'general',
      'other',
    ]);
  });

  it('validates categories', () => {
    expect(isFormpackCategory('insurer')).toBe(true);
    expect(isFormpackCategory('doctor')).toBe(true);
    expect(isFormpackCategory('general')).toBe(true);
    expect(isFormpackCategory('other')).toBe(true);
    expect(isFormpackCategory('unknown')).toBe(false);
    expect(isFormpackCategory(123)).toBe(false);
  });
});
