import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock implementation that will be updated per test
let mockFundingUrl: string | null = null;

// Mock the generated funding module.
vi.mock('../../../src/lib/funding.generated', () => ({
  get FUNDING_URL() {
    return mockFundingUrl;
  },
}));

// The module under test must be imported *after* the mock.
import { getSponsorUrl } from '../../../src/lib/funding';

describe('funding', () => {
  describe('getSponsorUrl', () => {
    beforeEach(() => {
      mockFundingUrl = null;
    });

    it('should return null if FUNDING_URL is null', () => {
      expect(getSponsorUrl()).toBeNull();
    });

    it('should return null if FUNDING_URL is an empty string', () => {
      mockFundingUrl = '';
      expect(getSponsorUrl()).toBeNull();
    });

    it('should return null if FUNDING_URL is a whitespace string', () => {
      mockFundingUrl = '   ';
      expect(getSponsorUrl()).toBeNull();
    });

    it('should return the URL string if it is valid', () => {
      const testUrl = 'https://example.com/sponsor';
      mockFundingUrl = testUrl;
      expect(getSponsorUrl()).toBe(testUrl);
    });

    it('should return a trimmed URL if it has leading/trailing whitespace', () => {
      const testUrl = 'https://example.com/sponsor';
      mockFundingUrl = `  ${testUrl}  `;
      expect(getSponsorUrl()).toBe(testUrl);
    });
  });
});
