import { describe, it, expect, vi } from 'vitest';

// Mock the generated funding URL module.
// It's defined here so we can mutate it in tests.
vi.mock('../../../src/lib/funding.generated', () => ({
  FUNDING_URL: null as string | null,
}));

// The module under test must be imported *after* the mock.
import { getSponsorUrl } from '../../../src/lib/funding';
import * as fundingGenerated from '../../../src/lib/funding.generated';

describe('funding', () => {
  describe('getSponsorUrl', () => {
    it('should return null if FUNDING_URL is null', () => {
      // @ts-expect-error - Allow writing to read-only mock
      fundingGenerated.FUNDING_URL = null;
      expect(getSponsorUrl()).toBeNull();
    });

    it('should return null if FUNDING_URL is an empty string', () => {
      // @ts-expect-error - Allow writing to read-only mock
      fundingGenerated.FUNDING_URL = '';
      expect(getSponsorUrl()).toBeNull();
    });

    it('should return null if FUNDING_URL is a whitespace string', () => {
      // @ts-expect-error - Allow writing to read-only mock
      fundingGenerated.FUNDING_URL = '   ';
      expect(getSponsorUrl()).toBeNull();
    });

    it('should return the URL string if it is valid', () => {
      const testUrl = 'https://example.com/sponsor';
      // @ts-expect-error - Allow writing to read-only mock
      fundingGenerated.FUNDING_URL = testUrl;
      expect(getSponsorUrl()).toBe(testUrl);
    });

    it('should return a trimmed URL if it has leading/trailing whitespace', () => {
      const testUrl = 'https://example.com/sponsor';
      // @ts-expect-error - Allow writing to read-only mock
      fundingGenerated.FUNDING_URL = `  ${testUrl}  `;
      expect(getSponsorUrl()).toBe(testUrl);
    });
  });
});
