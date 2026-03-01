// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  getPathValue,
  setPathValueImmutable,
  setPathValueMutableSafe,
} from '../../src/lib/pathAccess';

const LIST_ITEM_NAME_PATH = 'list.0.name';
const CREATED_VALUE = 'created';

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

      setPathValueMutableSafe(target, LIST_ITEM_NAME_PATH, CREATED_VALUE);

      expect(getPathValue(target, LIST_ITEM_NAME_PATH)).toBe(CREATED_VALUE);
    });

    it('writes directly to array leaf indexes', () => {
      const target = { list: [] } as Record<string, unknown>;

      setPathValueMutableSafe(target, 'list.0', 'first');

      expect(getPathValue(target, 'list.0')).toBe('first');
    });

    it('creates array containers when the next path segment is numeric', () => {
      const target = {} as Record<string, unknown>;

      setPathValueMutableSafe(target, LIST_ITEM_NAME_PATH, CREATED_VALUE);

      expect(getPathValue(target, LIST_ITEM_NAME_PATH)).toBe(CREATED_VALUE);
    });

    it('replaces non-object array entries with nested containers', () => {
      const target = { list: [5] } as Record<string, unknown>;

      setPathValueMutableSafe(target, 'list.0.value', 'created');

      expect(getPathValue(target, 'list.0.value')).toBe('created');
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

    it('ignores writes when target is not a record at runtime', () => {
      const target = 1;

      // @ts-expect-error - runtime hardening for invalid caller input
      setPathValueMutableSafe(target, 'a.b', 'ignored');

      expect(target).toBe(1);
    });
  });
});
