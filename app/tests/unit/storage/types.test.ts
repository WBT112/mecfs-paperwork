import { describe, expect, it } from 'vitest';
import {
  FORMPACK_META_ENTRY_KEYS,
  PROFILE_ENTRY_KEYS,
  RECORD_ENTRY_KEYS,
  SNAPSHOT_ENTRY_KEYS,
  isFormpackMetaEntry,
  isProfileEntry,
  isRecordEntry,
  isSnapshotEntry,
} from '../../../src/storage/types';

const baseRecordEntry = {
  id: 'record-1',
  formpackId: 'doctor-letter',
  locale: 'de',
  data: { foo: 'bar' },
  createdAt: '2026-02-02T00:00:00.000Z',
  updatedAt: '2026-02-02T01:00:00.000Z',
};

const baseSnapshotEntry = {
  id: 'snapshot-1',
  recordId: 'record-1',
  data: { foo: 'bar' },
  createdAt: '2026-02-02T02:00:00.000Z',
};

const baseFormpackMetaEntry = {
  id: 'doctor-letter',
  versionOrHash: '1.0.0',
  version: '1.0.0',
  hash: 'abc',
  updatedAt: '2026-02-02T03:00:00.000Z',
};

const baseProfileEntry = {
  id: 'profile-1',
  data: {
    patient: { firstName: 'Max' },
    doctor: { name: 'Dr. Ada' },
    insurer: { name: 'Musterkasse' },
  },
  createdAt: '2026-02-02T03:00:00.000Z',
  updatedAt: '2026-02-02T03:30:00.000Z',
};

describe('storage type helpers', () => {
  it('exposes record entry keys', () => {
    expect(RECORD_ENTRY_KEYS).toEqual([
      'id',
      'formpackId',
      'title',
      'locale',
      'data',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('exposes snapshot entry keys', () => {
    expect(SNAPSHOT_ENTRY_KEYS).toEqual([
      'id',
      'recordId',
      'label',
      'data',
      'createdAt',
    ]);
  });

  it('exposes formpack metadata entry keys', () => {
    expect(FORMPACK_META_ENTRY_KEYS).toEqual([
      'id',
      'versionOrHash',
      'version',
      'hash',
      'updatedAt',
    ]);
  });

  it('exposes profile entry keys', () => {
    expect(PROFILE_ENTRY_KEYS).toEqual([
      'id',
      'data',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('validates record entries', () => {
    expect(isRecordEntry(baseRecordEntry)).toBe(true);
    expect(isRecordEntry({ ...baseRecordEntry, title: 'Example' })).toBe(true);
    expect(isRecordEntry({ ...baseRecordEntry, locale: 'fr' })).toBe(false);
    expect(isRecordEntry({ ...baseRecordEntry, data: [] })).toBe(false);
    expect(isRecordEntry({ ...baseRecordEntry, title: 42 })).toBe(false);
    expect(isRecordEntry(null)).toBe(false);
  });

  it('validates snapshot entries', () => {
    expect(isSnapshotEntry(baseSnapshotEntry)).toBe(true);
    expect(isSnapshotEntry({ ...baseSnapshotEntry, label: 'Draft' })).toBe(
      true,
    );
    expect(isSnapshotEntry({ ...baseSnapshotEntry, data: [] })).toBe(false);
    expect(isSnapshotEntry({ ...baseSnapshotEntry, label: 123 })).toBe(false);
    expect(isSnapshotEntry('nope')).toBe(false);
  });

  it('validates formpack metadata entries', () => {
    expect(isFormpackMetaEntry(baseFormpackMetaEntry)).toBe(true);
    expect(
      isFormpackMetaEntry({ ...baseFormpackMetaEntry, version: undefined }),
    ).toBe(true);
    expect(isFormpackMetaEntry(null)).toBe(false);
    expect(isFormpackMetaEntry({ ...baseFormpackMetaEntry, hash: 123 })).toBe(
      false,
    );
    expect(
      isFormpackMetaEntry({ ...baseFormpackMetaEntry, updatedAt: [] }),
    ).toBe(false);
  });

  it('validates profile entries', () => {
    expect(isProfileEntry(baseProfileEntry)).toBe(true);
    expect(isProfileEntry({ ...baseProfileEntry, data: 'invalid' })).toBe(
      false,
    );
    expect(isProfileEntry({ ...baseProfileEntry, createdAt: 123 })).toBe(false);
    expect(isProfileEntry({ ...baseProfileEntry, updatedAt: 456 })).toBe(false);
    expect(isProfileEntry(null)).toBe(false);
  });
});
