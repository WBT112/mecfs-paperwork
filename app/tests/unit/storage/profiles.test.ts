import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ProfileData, ProfileEntry } from '../../../src/storage/types';

const PROFILE_ID = 'default';
const FIXED_TIMESTAMP = '2024-01-01T00:00:00.000Z';

const mockDb = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../../src/storage/db', () => ({
  openStorage: vi.fn(() => Promise.resolve(mockDb)),
}));

describe('profiles storage', () => {
  beforeEach(() => {
    mockDb.get.mockReset();
    mockDb.put.mockReset();
    mockDb.delete.mockReset();
  });

  describe('getProfile', () => {
    it('returns the profile entry when it exists', async () => {
      const { getProfile } = await import('../../../src/storage/profiles');

      const entry: ProfileEntry = {
        id: PROFILE_ID,
        data: { patient: { firstName: 'Max' } },
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
      };
      mockDb.get.mockResolvedValue(entry);

      const result = await getProfile(PROFILE_ID);

      expect(result).toEqual(entry);
      expect(mockDb.get).toHaveBeenCalledWith('profiles', PROFILE_ID);
    });

    it('returns null when the profile does not exist', async () => {
      const { getProfile } = await import('../../../src/storage/profiles');

      mockDb.get.mockResolvedValue(undefined);

      const result = await getProfile(PROFILE_ID);

      expect(result).toBeNull();
    });
  });

  describe('upsertProfile', () => {
    it('creates a new profile when none exists', async () => {
      const { upsertProfile } = await import('../../../src/storage/profiles');

      mockDb.get.mockResolvedValue(undefined);
      mockDb.put.mockResolvedValue(undefined);

      const partial: ProfileData = {
        patient: { firstName: 'Max', lastName: 'Mustermann' },
      };

      const result = await upsertProfile(PROFILE_ID, partial);

      expect(result.id).toBe(PROFILE_ID);
      expect(result.data.patient?.firstName).toBe('Max');
      expect(result.data.patient?.lastName).toBe('Mustermann');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockDb.put).toHaveBeenCalledWith('profiles', result);
    });

    it('merges into an existing profile without overwriting with empty values', async () => {
      const { upsertProfile } = await import('../../../src/storage/profiles');

      const existing: ProfileEntry = {
        id: PROFILE_ID,
        data: {
          patient: { firstName: 'Existing', city: 'Berlin' },
          doctor: { name: 'Dr. Alt' },
        },
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
      };
      mockDb.get.mockResolvedValue(existing);
      mockDb.put.mockResolvedValue(undefined);

      const partial: ProfileData = {
        patient: { firstName: 'Neu', lastName: 'Nachname', city: '' },
      };

      const result = await upsertProfile(PROFILE_ID, partial);

      // firstName overwritten with new non-empty value
      expect(result.data.patient?.firstName).toBe('Neu');
      // lastName added
      expect(result.data.patient?.lastName).toBe('Nachname');
      // city NOT overwritten (partial has empty string)
      expect(result.data.patient?.city).toBe('Berlin');
      // doctor preserved from existing
      expect(result.data.doctor?.name).toBe('Dr. Alt');
      // createdAt preserved from existing
      expect(result.createdAt).toBe(existing.createdAt);
    });

    it('preserves existing categories not present in partial', async () => {
      const { upsertProfile } = await import('../../../src/storage/profiles');

      const existing: ProfileEntry = {
        id: PROFILE_ID,
        data: {
          insurer: { name: 'AOK', city: 'Hamburg' },
        },
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
      };
      mockDb.get.mockResolvedValue(existing);
      mockDb.put.mockResolvedValue(undefined);

      const partial: ProfileData = {
        doctor: { name: 'Dr. Neu' },
      };

      const result = await upsertProfile(PROFILE_ID, partial);

      expect(result.data.insurer?.name).toBe('AOK');
      expect(result.data.insurer?.city).toBe('Hamburg');
      expect(result.data.doctor?.name).toBe('Dr. Neu');
    });

    it('ignores whitespace-only values in partial', async () => {
      const { upsertProfile } = await import('../../../src/storage/profiles');

      mockDb.get.mockResolvedValue(undefined);
      mockDb.put.mockResolvedValue(undefined);

      const partial: ProfileData = {
        patient: { firstName: '   ', lastName: 'Valid' },
      };

      const result = await upsertProfile(PROFILE_ID, partial);

      expect(result.data.patient?.firstName).toBeUndefined();
      expect(result.data.patient?.lastName).toBe('Valid');
    });
  });

  describe('deleteProfile', () => {
    it('deletes a stored profile entry by id', async () => {
      const { deleteProfile } = await import('../../../src/storage/profiles');

      mockDb.delete.mockResolvedValue(undefined);

      await deleteProfile(PROFILE_ID);

      expect(mockDb.delete).toHaveBeenCalledWith('profiles', PROFILE_ID);
    });
  });

  describe('hasUsableProfileData', () => {
    it('returns false for empty profile data', async () => {
      const { hasUsableProfileData } =
        await import('../../../src/storage/profiles');
      expect(hasUsableProfileData({})).toBe(false);
    });

    it('returns false when all values are whitespace', async () => {
      const { hasUsableProfileData } =
        await import('../../../src/storage/profiles');
      expect(hasUsableProfileData({ patient: { firstName: '  ' } })).toBe(
        false,
      );
    });

    it('returns true when at least one non-empty string exists', async () => {
      const { hasUsableProfileData } =
        await import('../../../src/storage/profiles');
      expect(hasUsableProfileData({ doctor: { name: 'Dr. Test' } })).toBe(true);
    });

    it('returns false for empty category objects', async () => {
      const { hasUsableProfileData } =
        await import('../../../src/storage/profiles');
      expect(hasUsableProfileData({ patient: {}, doctor: {} })).toBe(false);
    });

    it('skips non-object category values at runtime', async () => {
      const { hasUsableProfileData } =
        await import('../../../src/storage/profiles');
      // Force a non-object category to test the runtime guard
      const data = { patient: 'not-an-object' } as unknown as ProfileData;
      expect(hasUsableProfileData(data)).toBe(false);
    });

    it('skips null category values at runtime', async () => {
      const { hasUsableProfileData } =
        await import('../../../src/storage/profiles');
      const data = { patient: null } as unknown as ProfileData;
      expect(hasUsableProfileData(data)).toBe(false);
    });
  });
});
