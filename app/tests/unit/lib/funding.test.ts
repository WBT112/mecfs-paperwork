import { describe, it, expect, vi } from 'vitest';
import * as fundingGenerated from '../../../src/lib/funding.generated';
import { getSponsorUrl } from '../../../src/lib/funding';

// Mock the generated funding URL module.
vi.mock('../../../src/lib/funding.generated');

describe('funding', () => {
  describe('getSponsorUrl', () => {
    it('should return null if FUNDING_URL is null', () => {
      vi.spyOn(fundingGenerated, 'FUNDING_URL', 'get').mockReturnValue(null);
      expect(getSponsorUrl()).toBeNull();
    });

    it('should return null if FUNDING_URL is an empty string', () => {
      vi.spyOn(fundingGenerated, 'FUNDING_URL', 'get').mockReturnValue('');
      expect(getSponsorUrl()).toBeNull();
    });

    it('should return null if FUNDING_URL is a whitespace string', () => {
      vi.spyOn(fundingGenerated, 'FUNDING_URL', 'get').mockReturnValue('   ');
      expect(getSponsorUrl()).toBeNull();
    });

    it('should return the URL string if it is valid', () => {
      const testUrl = 'https://example.com/sponsor';
      vi.spyOn(fundingGenerated, 'FUNDING_URL', 'get').mockReturnValue(testUrl);
      expect(getSponsorUrl()).toBe(testUrl);
    });

    it('should return a trimmed URL if it has leading/trailing whitespace', () => {
      const testUrl = 'https://example.com/sponsor';
      vi.spyOn(fundingGenerated, 'FUNDING_URL', 'get').mockReturnValue(
        `  ${testUrl}  `,
      );
      expect(getSponsorUrl()).toBe(testUrl);
    });
  });
});
