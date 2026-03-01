import { describe, expect, it } from 'vitest';
import {
  getDoctorLetterExportDefaults,
  hasDoctorLetterDecisionAnswers,
} from '../../../src/export/doctorLetterDefaults';

describe('doctorLetterDefaults', () => {
  it('returns locale-specific default placeholders', () => {
    const deDefaults = getDoctorLetterExportDefaults('de');
    const enDefaults = getDoctorLetterExportDefaults('en');

    expect(deDefaults.patient.lastName).toBe('Mustermann');
    expect(enDefaults.patient.lastName).toBe('Example');
  });

  it('falls back to english defaults for unsupported locale values', () => {
    const defaults = getDoctorLetterExportDefaults('fr' as never);
    expect(defaults.decision.fallbackCaseText).toContain('PLEASE ANSWER');
  });

  it('detects decision answers for non-empty strings and booleans', () => {
    expect(
      hasDoctorLetterDecisionAnswers({
        decision: { q1: 'yes' },
      }),
    ).toBe(true);

    expect(
      hasDoctorLetterDecisionAnswers({
        decision: { q2: true },
      }),
    ).toBe(true);
  });

  it('returns false for missing, empty, or unsupported decision answer values', () => {
    expect(hasDoctorLetterDecisionAnswers(undefined)).toBe(false);
    expect(hasDoctorLetterDecisionAnswers({ decision: {} })).toBe(false);
    expect(hasDoctorLetterDecisionAnswers({ decision: { q1: '   ' } })).toBe(
      false,
    );
    expect(hasDoctorLetterDecisionAnswers({ decision: { q1: 1 } })).toBe(false);
  });
});
