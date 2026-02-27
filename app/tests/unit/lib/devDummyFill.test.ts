import { describe, expect, it } from 'vitest';
import { buildRandomDummyPatch } from '../../../src/lib/devDummyFill';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

const RECOMMENDED_ATTACHMENT_LINES = new Set([
  '- Arztbefunde',
  '- Ärztliche Stellungnahme zum Off-Label-Antrag',
  '- Pflegegrad-Bescheid',
  '- GdB-Bescheid',
  '- Rentenbescheid',
  '- Medikamentenplan / Unverträglichkeiten',
  '- Symptom-/Funktionsprotokoll',
  '- Reha-/Klinikbericht',
]);

describe('buildRandomDummyPatch', () => {
  const collectFieldValues = (
    fieldName: string,
    fieldSchema: RJSFSchema,
  ): Set<string> => {
    const values = new Set<string>();

    for (let index = 0; index < 10; index += 1) {
      const rngValue = (index + 0.01) / 10;
      const patch = buildRandomDummyPatch(
        {
          type: 'object',
          properties: {
            [fieldName]: fieldSchema,
          },
        } as RJSFSchema,
        {} as UiSchema,
        { rng: () => rngValue },
      );
      values.add(String(patch[fieldName]));
    }

    return values;
  };

  it('returns an empty patch when schema is null', () => {
    expect(buildRandomDummyPatch(null, null)).toEqual({});
  });

  it('returns an empty patch for non-object root schemas', () => {
    const schema = { type: 'string' } as RJSFSchema;
    expect(buildRandomDummyPatch(schema, {} as UiSchema)).toEqual({});
  });

  it('picks enum values including an explicit empty option', () => {
    const schema = {
      type: 'object',
      properties: {
        decision: {
          type: 'string',
          enum: ['yes', 'no'],
        },
      },
    } as RJSFSchema;
    const uiSchema = {
      decision: {
        'ui:widget': 'radio',
      },
    } as UiSchema;

    const low = buildRandomDummyPatch(schema, uiSchema, {
      rng: () => 0,
    });
    const middle = buildRandomDummyPatch(schema, uiSchema, {
      rng: () => 0.5,
    });
    const high = buildRandomDummyPatch(schema, uiSchema, {
      rng: () => 0.99,
    });

    expect(['yes', 'no', '']).toContain(low.decision);
    expect(['yes', 'no', '']).toContain(middle.decision);
    expect(['yes', 'no', '']).toContain(high.decision);
    expect(high.decision).toBe('');
  });

  it('skips hidden and readonly fields', () => {
    const schema = {
      type: 'object',
      properties: {
        visible: { type: 'string' },
        hiddenField: { type: 'string' },
        readonlySchemaField: { type: 'string', readOnly: true },
        readonlyUiField: { type: 'string' },
      },
    } as RJSFSchema;
    const uiSchema = {
      hiddenField: { 'ui:widget': 'hidden' },
      readonlyUiField: { 'ui:readonly': true },
    } as UiSchema;

    const patch = buildRandomDummyPatch(schema, uiSchema, {
      rng: () => 0,
    });

    expect(typeof patch.visible).toBe('string');
    expect(patch.hiddenField).toBeUndefined();
    expect(patch.readonlySchemaField).toBeUndefined();
    expect(patch.readonlyUiField).toBeUndefined();
  });

  it('generates array lengths between 1 and 3 by default', () => {
    const schema = {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    } as RJSFSchema;

    const minPatch = buildRandomDummyPatch(schema, {} as UiSchema, {
      rng: () => 0,
    });
    const maxPatch = buildRandomDummyPatch(schema, {} as UiSchema, {
      rng: () => 0.99,
    });

    expect(Array.isArray(minPatch.contacts)).toBe(true);
    expect(Array.isArray(maxPatch.contacts)).toBe(true);
    expect((minPatch.contacts as unknown[]).length).toBe(1);
    expect((maxPatch.contacts as unknown[]).length).toBe(3);
  });

  it('produces different values with different rng sequences', () => {
    const schema = {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        decision: {
          type: 'string',
          enum: ['yes', 'no'],
        },
      },
    } as RJSFSchema;
    const uiSchema = {
      decision: {
        'ui:widget': 'radio',
      },
    } as UiSchema;

    const first = buildRandomDummyPatch(schema, uiSchema, {
      rng: () => 0,
    });
    const second = buildRandomDummyPatch(schema, uiSchema, {
      rng: () => 0.99,
    });

    expect(first).not.toEqual(second);
  });

  it('does not duplicate an already empty enum option', () => {
    const schema = {
      type: 'object',
      properties: {
        choice: {
          type: 'string',
          enum: ['x', ''],
        },
      },
    } as RJSFSchema;

    const low = buildRandomDummyPatch(schema, {} as UiSchema, {
      rng: () => 0,
    });
    const high = buildRandomDummyPatch(schema, {} as UiSchema, {
      rng: () => 0.99,
    });

    expect(low.choice).toBe('x');
    expect(high.choice).toBe('');
  });

  it('supports dates, booleans, numbers, integer truncation, and nullable type arrays', () => {
    const schema = {
      type: 'object',
      properties: {
        birthDate: { type: 'string', format: 'date' },
        consent: { type: 'boolean' },
        visits: { type: 'integer' },
        score: { type: 'number' },
        nullableText: { type: ['null', 'string'] },
      },
    } as RJSFSchema;

    const patch = buildRandomDummyPatch(schema, {} as UiSchema, {
      rng: () => 0.75,
    });

    expect(typeof patch.birthDate).toBe('string');
    expect((patch.birthDate as string).match(/^\d{4}-\d{2}-\d{2}$/)).not.toBe(
      null,
    );
    expect(typeof patch.consent).toBe('boolean');
    expect(Number.isInteger(patch.visits)).toBe(true);
    expect(typeof patch.score).toBe('number');
    expect(typeof patch.nullableText).toBe('string');
  });

  it('handles tuple-style array item schemas and ui item schema arrays', () => {
    const schema = {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          items: [{ type: 'string' }],
        },
      },
    } as RJSFSchema;
    const uiSchema = {
      contacts: {
        items: [{ 'ui:widget': 'text' }],
      },
    } as UiSchema;

    const patch = buildRandomDummyPatch(schema, uiSchema, {
      rng: () => 0.99,
      arrayMin: 2,
      arrayMax: 2,
    });

    expect(Array.isArray(patch.contacts)).toBe(true);
    expect((patch.contacts as unknown[]).length).toBe(2);
    expect(
      (patch.contacts as unknown[]).every((entry) => typeof entry === 'string'),
    ).toBe(true);
  });

  it('falls back to default array bounds when options are invalid', () => {
    const schema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    } as RJSFSchema;

    const patch = buildRandomDummyPatch(schema, {} as UiSchema, {
      rng: () => 0.99,
      arrayMin: 0,
      arrayMax: 0,
    });

    expect(Array.isArray(patch.tags)).toBe(true);
    expect((patch.tags as unknown[]).length).toBe(3);
  });

  it('returns empty arrays for array schemas without a usable item schema', () => {
    const schema = {
      type: 'object',
      properties: {
        brokenA: { type: 'array', items: [] },
        brokenB: { type: 'array' },
      },
    } as RJSFSchema;

    const patch = buildRandomDummyPatch(schema, {} as UiSchema, {
      rng: () => Number.NaN,
    });

    expect(patch.brokenA).toEqual([]);
    expect(patch.brokenB).toEqual([]);
  });

  it('uses dedicated 10-value pools for common identity fields', () => {
    const firstNameValues = collectFieldValues('firstName', { type: 'string' });
    const lastNameValues = collectFieldValues('lastName', { type: 'string' });
    const postalCodeValues = collectFieldValues('postalCode', {
      type: 'string',
    });

    expect(firstNameValues.size).toBe(10);
    expect(lastNameValues.size).toBe(10);
    expect(postalCodeValues.size).toBe(10);
    expect([...postalCodeValues].every((entry) => /^\d{5}$/.test(entry))).toBe(
      true,
    );
  });

  it('covers field-specific pools for contact and medication-like paths', () => {
    const schema = {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        insuranceNumber: { type: 'string' },
        practice: { type: 'string' },
        insurer: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
        medicationName: { type: 'string' },
        symptomDetails: { type: 'string' },
        fallbackName: { type: 'string' },
      },
    } as RJSFSchema;

    const patch = buildRandomDummyPatch(schema, {} as UiSchema, {
      rng: () => 0.2,
    });

    expect(typeof patch.street).toBe('string');
    expect(typeof patch.city).toBe('string');
    expect(typeof patch.phone).toBe('string');
    expect(typeof patch.email).toBe('string');
    expect(typeof patch.insuranceNumber).toBe('string');
    expect(typeof patch.practice).toBe('string');
    expect((patch.insurer as Record<string, unknown>).name).toEqual(
      expect.any(String),
    );
    expect(typeof patch.medicationName).toBe('string');
    expect(typeof patch.symptomDetails).toBe('string');
    expect(typeof patch.fallbackName).toBe('string');
  });

  it('generates format=email values from the dedicated email pool', () => {
    const patch = buildRandomDummyPatch(
      {
        type: 'object',
        properties: {
          contactEmail: { type: 'string', format: 'email' },
        },
      } as RJSFSchema,
      {} as UiSchema,
      { rng: () => 0.4 },
    );

    expect(String(patch.contactEmail)).toContain('@');
  });

  it('fills attachmentsFreeText with 0-8 recommended checkbox lines and no free-text filler', () => {
    const schema = {
      type: 'object',
      properties: {
        attachmentsFreeText: { type: 'string' },
      },
    } as RJSFSchema;

    const emptyPatch = buildRandomDummyPatch(schema, {} as UiSchema, {
      rng: () => 0,
    });
    expect(emptyPatch.attachmentsFreeText).toBe('');

    const fullPatch = buildRandomDummyPatch(schema, {} as UiSchema, {
      rng: () => 0.99,
    });
    const lines = String(fullPatch.attachmentsFreeText)
      .split('\n')
      .filter((line) => line.length > 0);

    expect(lines).toHaveLength(8);
    expect(new Set(lines).size).toBe(8);
    expect(lines.every((line) => RECOMMENDED_ATTACHMENT_LINES.has(line))).toBe(
      true,
    );
  });

  it('ignores invalid object-property schema entries and unknown schema types', () => {
    const patch = buildRandomDummyPatch(
      {
        type: 'object',
        properties: {
          invalidNode: 'string' as unknown as RJSFSchema,
          nestedObject: { type: 'object' },
          unknownType: { type: ['null'] },
        },
      } as RJSFSchema,
      {} as UiSchema,
      { rng: () => 0.25 },
    );

    expect(patch).toEqual({});
  });
});
