import { describe, expect, it, vi } from 'vitest';
import {
  readLocalStorage,
  writeLocalStorage,
} from '../../../src/lib/safeLocalStorage';

describe('safeLocalStorage', () => {
  it('reads persisted values', () => {
    window.localStorage.setItem('key', 'value');

    expect(readLocalStorage('key')).toBe('value');
  });

  it('returns null when reading throws', () => {
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });

    expect(readLocalStorage('key')).toBeNull();

    getItemSpy.mockRestore();
  });

  it('writes values and reports success', () => {
    expect(writeLocalStorage('key', 'value')).toBe(true);
    expect(window.localStorage.getItem('key')).toBe('value');
  });

  it('returns false when writing throws', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });

    expect(writeLocalStorage('key', 'value')).toBe(false);

    setItemSpy.mockRestore();
  });
});
