// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  getPathValue,
  setPathValueImmutable,
  setPathValueMutableSafe,
} from '../../src/lib/pathAccess';

const ARRAY_VALUE_PATH = 'items.1.value';
const NESTED_ARRAY_VALUE_PATH = 'nested.0.value';

describe('pathAccess', () => {
  describe('getPathValue', () => {
    it('reads nested object values', () => {
      const source = { a: { b: { c: 'value' } } };
      expect(getPathValue(source, 'a.b.c')).toBe('value');
    });

    it('reads array index segments', () => {
      const source = { list: [{ name: 'first' }, { name: 'second' }] };
      expect(getPathValue(source, 'list.1.name')).toBe('second');
    });

    it('returns undefined for empty or invalid paths', () => {
      const source = { a: { b: 1 } };
      expect(getPathValue(source, '')).toBeUndefined();
      expect(getPathValue(source, 'a.missing')).toBeUndefined();
      expect(getPathValue(source, 'a.b.0')).toBeUndefined();
    });
  });

  describe('setPathValueImmutable', () => {
    it('writes nested values without mutating source', () => {
      const source = { a: { b: 'old' } };
      const updated = setPathValueImmutable(source, 'a.b', 'new');

      expect(updated).toEqual({ a: { b: 'new' } });
      expect(source).toEqual({ a: { b: 'old' } });
    });

    it('supports array index paths', () => {
      const source = {
        items: [{ value: 'a' }, { value: 'b' }],
      } as Record<string, unknown>;

      const updated = setPathValueImmutable(
        source,
        ARRAY_VALUE_PATH,
        'updated',
      );

      expect(getPathValue(updated, ARRAY_VALUE_PATH)).toBe('updated');
      expect(getPathValue(source, ARRAY_VALUE_PATH)).toBe('b');
    });

    it('falls back to recursive cloning when structuredClone is unavailable', () => {
      const source = { nested: [{ value: 'a' }] } as Record<string, unknown>;
      const originalStructuredClone = globalThis.structuredClone;

      vi.stubGlobal('structuredClone', undefined);
      try {
        const updated = setPathValueImmutable(
          source,
          NESTED_ARRAY_VALUE_PATH,
          'updated',
        );

        expect(getPathValue(updated, NESTED_ARRAY_VALUE_PATH)).toBe('updated');
        expect(getPathValue(source, NESTED_ARRAY_VALUE_PATH)).toBe('a');
      } finally {
        vi.stubGlobal('structuredClone', originalStructuredClone);
      }
    });
  });

  describe('setPathValueMutableSafe', () => {
    it('sets nested values on mutable target', () => {
      const target: Record<string, unknown> = {};
      setPathValueMutableSafe(target, 'a.b.c', 123);

      expect(target).toEqual({ a: { b: { c: 123 } } });
    });

    it('creates intermediate containers for arrays and objects', () => {
      const target = { list: [] } as Record<string, unknown>;

      setPathValueMutableSafe(target, 'list.0.name', 'created');

      expect(getPathValue(target, 'list.0.name')).toBe('created');
    });

    it('ignores writes when path is empty or mismatched for arrays', () => {
      const target = { list: ['keep'] } as Record<string, unknown>;

      setPathValueMutableSafe(target, '', 'ignored');
      setPathValueMutableSafe(target, 'list.notAnIndex.value', 'ignored');

      expect(getPathValue(target, 'list.0')).toBe('keep');
      expect(getPathValue(target, 'list.notAnIndex.value')).toBeUndefined();
    });

    it('blocks prototype-pollution segments', () => {
      const target: Record<string, unknown> = {};

      setPathValueMutableSafe(target, '__proto__.polluted', true);
      setPathValueMutableSafe(target, 'constructor.prototype.polluted', true);

      expect(target).toEqual({});
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });
});
