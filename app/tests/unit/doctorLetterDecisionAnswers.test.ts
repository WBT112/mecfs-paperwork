// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  isCompletedCase0Path,
  normalizeDecisionAnswers,
} from '../../src/formpacks/doctor-letter/decisionAnswers';

describe('doctor-letter decision answer normalization', () => {
  it('normalizes yes/no strings and booleans consistently', () => {
    const fromStrings = normalizeDecisionAnswers({
      q1: 'yes',
      q2: 'no',
      q3: 'yes',
      q6: 'no',
      q7: 'yes',
    });
    const fromBooleans = normalizeDecisionAnswers({
      q1: true,
      q2: false,
      q3: true,
      q6: false,
      q7: true,
    });

    expect(fromBooleans).toEqual(fromStrings);
  });

  it('keeps only valid enum answers for q4/q5/q8', () => {
    const normalized = normalizeDecisionAnswers({
      q4: 'COVID-19',
      q5: 'Medication: Fluoroquinolones',
      q8: 'No known cause',
      q4Invalid: 'ignored',
      q5Invalid: 123,
      q8Invalid: 'unknown',
    });

    expect(normalized.q4).toBe('COVID-19');
    expect(normalized.q5).toBe('Medication: Fluoroquinolones');
    expect(normalized.q8).toBe('No known cause');
    expect(
      normalizeDecisionAnswers({
        q4: 'invalid',
        q5: 'invalid',
        q8: 'invalid',
      }),
    ).toEqual({
      q1: undefined,
      q2: undefined,
      q3: undefined,
      q4: undefined,
      q5: undefined,
      q6: undefined,
      q7: undefined,
      q8: undefined,
    });
  });

  it('detects completed case-0 paths', () => {
    expect(
      isCompletedCase0Path({
        q1: 'no',
        q6: 'no',
      }),
    ).toBe(true);
    expect(
      isCompletedCase0Path({
        q1: false,
        q6: true,
        q7: false,
      }),
    ).toBe(true);
  });

  it('returns false for incomplete case-0 paths', () => {
    expect(
      isCompletedCase0Path({
        q1: 'no',
        q6: 'yes',
      }),
    ).toBe(false);
    expect(
      isCompletedCase0Path({
        q1: 'yes',
        q2: 'no',
      }),
    ).toBe(false);
  });
});
