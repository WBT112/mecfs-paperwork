import { describe, it, expect } from 'vitest';
import { setNested } from '../../src/export/buildI18nContext';

describe('setNested', () => {
  it('should set a value on a deeply nested path', () => {
    const target = {};
    setNested(target, 'a.b.c', 'value');
    expect(target).toEqual({ a: { b: { c: 'value' } } });
  });

  it('should not create properties for an empty key', () => {
    const target = {};
    setNested(target, '', 'value');
    expect(target).toEqual({});
  });

  it('should handle keys with extra dots by filtering empty segments', () => {
    const target = {};
    setNested(target, 'a..b.c', 'value');
    expect(target).toEqual({ a: { b: { c: 'value' } } });
  });

  it('should add a new leaf to an existing branch', () => {
    const target = { a: { b: { c: 'value1' } } };
    setNested(target, 'a.b.d', 'value2');
    expect(target).toEqual({ a: { b: { c: 'value1', d: 'value2' } } });
  });

  it('should overwrite a primitive value with an object if a more specific key is provided', () => {
    const target = { a: { b: 'old-value' } };
    setNested(target, 'a.b.c', 'new-value');
    expect(target).toEqual({ a: { b: { c: 'new-value' } } });
  });

  it('should not fail if the target is not an object (though TS types should prevent this)', () => {
    const target = 'not-an-object';
    // @ts-expect-error - Testing invalid input
    setNested(target, 'a.b.c', 'value');
    expect(target).toBe('not-an-object');
  });
});
