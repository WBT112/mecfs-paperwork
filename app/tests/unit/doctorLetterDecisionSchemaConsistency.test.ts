import { describe, expect, it } from 'vitest';
import schemaJson from '../../public/formpacks/doctor-letter/schema.json';
import {
  Q4_OPTIONS,
  Q5_OPTIONS,
  Q8_OPTIONS,
} from '../../src/formpacks/decisionEngine';

type SchemaEnum = {
  enum?: string[];
};

type DoctorLetterSchema = {
  properties?: {
    decision?: {
      properties?: Record<string, SchemaEnum>;
    };
  };
};

const schema = schemaJson as DoctorLetterSchema;

const getDecisionEnum = (field: string): string[] => {
  const value = schema.properties?.decision?.properties?.[field]?.enum;
  return Array.isArray(value) ? value : [];
};

describe('doctor-letter decision schema consistency', () => {
  it('keeps q4 options aligned with the decision engine', () => {
    expect(getDecisionEnum('q4')).toEqual([...Q4_OPTIONS]);
  });

  it('keeps q5 options aligned with the decision engine', () => {
    expect(getDecisionEnum('q5')).toEqual([...Q5_OPTIONS]);
  });

  it('keeps q8 options aligned with the decision engine', () => {
    expect(getDecisionEnum('q8')).toEqual([...Q8_OPTIONS]);
  });
});
