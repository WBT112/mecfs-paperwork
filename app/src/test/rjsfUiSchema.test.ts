import { describe, it, expect } from 'vitest';
import { applyArrayUiSchemaDefaults } from '../lib/rjsfUiSchema';
import type { RJSFSchema } from '@rjsf/utils';

describe('applyArrayUiSchemaDefaults', () => {
  it('should return uiSchema if schema is not an object', () => {
    const schema = true;
    const uiSchema = { foo: 'bar' };
    const result = applyArrayUiSchemaDefaults(schema as any, uiSchema);
    expect(result).toBe(uiSchema);
  });

  it('should handle object schema with no properties', () => {
    const schema: RJSFSchema = {
      type: 'object',
    };
    const result = applyArrayUiSchemaDefaults(schema, {});
    expect(result).toEqual({});
  });

  it('should set orderable to false on array types', () => {
    const schema: RJSFSchema = {
      type: 'array',
      items: { type: 'string' },
    };
    const result = applyArrayUiSchemaDefaults(schema, {});
    expect(result['ui:options']?.orderable).toBe(false);
  });

  it('should not override existing orderable option', () => {
    const schema: RJSFSchema = {
      type: 'array',
      items: { type: 'string' },
    };
    const uiSchema = { 'ui:options': { orderable: true } };
    const result = applyArrayUiSchemaDefaults(schema, uiSchema);
    expect(result['ui:options']?.orderable).toBe(true);
  });

  it('should set item label to false', () => {
    const schema: RJSFSchema = {
      type: 'array',
      items: { type: 'string' },
    };
    const result = applyArrayUiSchemaDefaults(schema, {});
    expect((result.items as any)?.['ui:options']?.label).toBe(false);
  });

  it('should not override existing item label option', () => {
    const schema: RJSFSchema = {
      type: 'array',
      items: { type: 'string' },
    };
    const uiSchema = { items: { 'ui:options': { label: true } } };
    const result = applyArrayUiSchemaDefaults(schema, uiSchema);
    expect((result.items as any)?.['ui:options']?.label).toBe(true);
  });

  it('should handle array with no items property', () => {
    const schema: RJSFSchema = { type: 'array' };
    const result = applyArrayUiSchemaDefaults(schema, {});
    expect(result).toEqual({});
  });

  it('should handle non-object items in array schema', () => {
    const schema: RJSFSchema = { type: 'array', items: true };
    const result = applyArrayUiSchemaDefaults(schema, {});
    expect(result['ui:options']?.orderable).toBe(false);
    expect(result.items).toBeUndefined();
  });

  it('should recursively apply defaults to nested objects', () => {
    const schema: RJSFSchema = {
      type: 'object',
      properties: {
        nested: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    };
    const result = applyArrayUiSchemaDefaults(schema, {});
    expect(result.nested?.['ui:options']?.orderable).toBe(false);
  });
});
