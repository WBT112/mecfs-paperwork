import { describe, expect, it } from 'vitest';
import {
  getFieldVisibility,
  clearHiddenFields,
  type DecisionData,
} from '../../src/formpacks/doctorLetterVisibility';

describe('doctorLetterVisibility', () => {
  describe('getFieldVisibility', () => {
    it('shows only q1 and resolvedCaseText when no answers provided', () => {
      const visibility = getFieldVisibility({});
      expect(visibility).toEqual({
        q1: true,
        q2: false,
        q3: false,
        q4: false,
        q5: false,
        q6: false,
        q7: false,
        q8: false,
        resolvedCaseText: true,
      });
    });

    describe('Q1=true path (full ME/CFS)', () => {
      it('shows q2 when q1 is true', () => {
        const visibility = getFieldVisibility({ q1: true });
        expect(visibility.q2).toBe(true);
        expect(visibility.q6).toBe(false);
      });

      it('shows q3 when q1=true and q2=true', () => {
        const visibility = getFieldVisibility({ q1: true, q2: true });
        expect(visibility.q3).toBe(true);
        expect(visibility.q4).toBe(false);
        expect(visibility.q5).toBe(false);
      });

      it('shows q4 when q1=true, q2=true, and q3=true', () => {
        const visibility = getFieldVisibility({
          q1: true,
          q2: true,
          q3: true,
        });
        expect(visibility.q4).toBe(true);
        expect(visibility.q5).toBe(false);
      });

      it('shows q5 when q1=true, q2=true, and q3=false', () => {
        const visibility = getFieldVisibility({
          q1: true,
          q2: true,
          q3: false,
        });
        expect(visibility.q5).toBe(true);
        expect(visibility.q4).toBe(false);
      });

      it('hides follow-ups when q1=true but q2=false', () => {
        const visibility = getFieldVisibility({ q1: true, q2: false });
        expect(visibility.q3).toBe(false);
        expect(visibility.q4).toBe(false);
        expect(visibility.q5).toBe(false);
      });
    });

    describe('Q1=false path (no full ME/CFS)', () => {
      it('shows q6 when q1 is false', () => {
        const visibility = getFieldVisibility({ q1: false });
        expect(visibility.q6).toBe(true);
        expect(visibility.q2).toBe(false);
      });

      it('shows q7 when q1=false and q6=true', () => {
        const visibility = getFieldVisibility({ q1: false, q6: true });
        expect(visibility.q7).toBe(true);
        expect(visibility.q8).toBe(false);
      });

      it('shows q8 when q1=false, q6=true, and q7=true', () => {
        const visibility = getFieldVisibility({
          q1: false,
          q6: true,
          q7: true,
        });
        expect(visibility.q8).toBe(true);
      });

      it('hides follow-ups when q1=false but q6=false', () => {
        const visibility = getFieldVisibility({ q1: false, q6: false });
        expect(visibility.q7).toBe(false);
        expect(visibility.q8).toBe(false);
      });

      it('hides q8 when q1=false, q6=true, but q7=false', () => {
        const visibility = getFieldVisibility({
          q1: false,
          q6: true,
          q7: false,
        });
        expect(visibility.q8).toBe(false);
      });
    });

    describe('path branching', () => {
      it('never shows both q2 and q6', () => {
        const testCases: DecisionData[] = [
          { q1: true },
          { q1: false },
          { q1: true, q2: true },
          { q1: false, q6: true },
        ];

        testCases.forEach((data) => {
          const visibility = getFieldVisibility(data);
          expect(visibility.q2 && visibility.q6).toBe(false);
        });
      });

      it('never shows both q4 and q5', () => {
        const testCases: DecisionData[] = [
          { q1: true, q2: true, q3: true },
          { q1: true, q2: true, q3: false },
        ];

        testCases.forEach((data) => {
          const visibility = getFieldVisibility(data);
          expect(visibility.q4 && visibility.q5).toBe(false);
        });
      });
    });
  });

  describe('clearHiddenFields', () => {
    it('preserves only visible fields', () => {
      const decision: DecisionData = {
        q1: true,
        q2: true,
        q3: true,
        q4: 'COVID-19',
        resolvedCaseText: 'Some result',
      };
      const cleaned = clearHiddenFields(decision);
      expect(cleaned).toEqual(decision);
    });

    it('clears q2-q5 when q1 is false', () => {
      const decision: DecisionData = {
        q1: false,
        q2: true,
        q3: true,
        q4: 'COVID-19',
        q6: true,
        resolvedCaseText: 'Some result',
      };
      const cleaned = clearHiddenFields(decision);
      expect(cleaned.q2).toBeUndefined();
      expect(cleaned.q3).toBeUndefined();
      expect(cleaned.q4).toBeUndefined();
      expect(cleaned.q6).toBe(true);
    });

    it('clears q6-q8 when q1 is true', () => {
      const decision: DecisionData = {
        q1: true,
        q2: true,
        q6: true,
        q7: true,
        q8: 'EBV',
        resolvedCaseText: 'Some result',
      };
      const cleaned = clearHiddenFields(decision);
      expect(cleaned.q6).toBeUndefined();
      expect(cleaned.q7).toBeUndefined();
      expect(cleaned.q8).toBeUndefined();
      expect(cleaned.q2).toBe(true);
    });

    it('clears q3-q5 when q2 is false', () => {
      const decision: DecisionData = {
        q1: true,
        q2: false,
        q3: true,
        q4: 'COVID-19',
        q5: 'Other cause',
        resolvedCaseText: 'Some result',
      };
      const cleaned = clearHiddenFields(decision);
      expect(cleaned.q3).toBeUndefined();
      expect(cleaned.q4).toBeUndefined();
      expect(cleaned.q5).toBeUndefined();
    });

    it('clears q5 when q3 is true (keeps q4 path)', () => {
      const decision: DecisionData = {
        q1: true,
        q2: true,
        q3: true,
        q4: 'COVID-19',
        q5: 'Other cause',
        resolvedCaseText: 'Some result',
      };
      const cleaned = clearHiddenFields(decision);
      expect(cleaned.q4).toBe('COVID-19');
      expect(cleaned.q5).toBeUndefined();
    });

    it('clears q4 when q3 is false (keeps q5 path)', () => {
      const decision: DecisionData = {
        q1: true,
        q2: true,
        q3: false,
        q4: 'COVID-19',
        q5: 'Other cause',
        resolvedCaseText: 'Some result',
      };
      const cleaned = clearHiddenFields(decision);
      expect(cleaned.q4).toBeUndefined();
      expect(cleaned.q5).toBe('Other cause');
    });

    it('clears q7-q8 when q6 is false', () => {
      const decision: DecisionData = {
        q1: false,
        q6: false,
        q7: true,
        q8: 'EBV',
        resolvedCaseText: 'Some result',
      };
      const cleaned = clearHiddenFields(decision);
      expect(cleaned.q7).toBeUndefined();
      expect(cleaned.q8).toBeUndefined();
    });

    it('clears q8 when q7 is false', () => {
      const decision: DecisionData = {
        q1: false,
        q6: true,
        q7: false,
        q8: 'EBV',
        resolvedCaseText: 'Some result',
      };
      const cleaned = clearHiddenFields(decision);
      expect(cleaned.q8).toBeUndefined();
      expect(cleaned.q7).toBe(false);
    });

    it('preserves resolvedCaseText', () => {
      const decision: DecisionData = {
        q1: true,
        q2: false,
        q3: true,
        resolvedCaseText: 'Important result text',
      };
      const cleaned = clearHiddenFields(decision);
      expect(cleaned.resolvedCaseText).toBe('Important result text');
    });
  });

  describe('integration: visibility + clearing', () => {
    it('clearing produces data that generates same visibility', () => {
      const decision: DecisionData = {
        q1: true,
        q2: true,
        q3: false,
        q4: 'COVID-19', // Should be cleared
        q5: 'Other cause',
        q6: true, // Should be cleared
        resolvedCaseText: 'Result',
      };

      const cleaned = clearHiddenFields(decision);
      const visibility1 = getFieldVisibility(decision);
      const visibility2 = getFieldVisibility(cleaned);

      // Both should produce the same visibility
      expect(visibility1).toEqual(visibility2);
    });
  });
});
