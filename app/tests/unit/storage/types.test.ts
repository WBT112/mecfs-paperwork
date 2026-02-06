import { describe, expect, it } from 'vitest';
import {
  RECORD_ENTRY_KEYS,
  SNAPSHOT_ENTRY_KEYS,
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
});
