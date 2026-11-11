// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  resolveDecisionTree,
  type DecisionAnswers,
} from '../../src/formpacks/decisionEngine';

const CASE_0_KEY = 'doctor-letter.case.0.paragraph';

describe('resolveDecisionTree', () => {
  describe('Q1=true path (full ME/CFS)', () => {
    it.each([
      {
        name: 'resolves to Case 11 when Q1=true, Q2=false (cause unknown)',
        answers: {
          q1: 'yes',
          q2: 'no',
        },
        caseId: 11,
        caseKey: 'doctor-letter.case.11.paragraph',
      },
      {
        name: 'resolves to Case 1 when Q1=true, Q2=true, Q3=true, Q4=EBV',
        answers: {
          q1: 'yes',
          q2: 'yes',
          q3: 'yes',
          q4: 'EBV',
        },
        caseId: 1,
        caseKey: 'doctor-letter.case.1.paragraph',
      },
      {
        name: 'resolves to Case 2 when Q1=true, Q2=true, Q3=true, Q4=Influenza',
        answers: {
          q1: 'yes',
          q2: 'yes',
          q3: 'yes',
          q4: 'Influenza',
        },
        caseId: 2,
        caseKey: 'doctor-letter.case.2.paragraph',
      },
      {
        name: 'resolves to Case 3 when Q1=true, Q2=true, Q3=true, Q4=COVID-19',
        answers: {
          q1: 'yes',
          q2: 'yes',
          q3: 'yes',
          q4: 'COVID-19',
        },
        caseId: 3,
        caseKey: 'doctor-letter.case.3.paragraph',
      },
      {
        name: 'resolves to Case 9 when Q1=true, Q2=true, Q3=true, Q4=Other infection',
        answers: {
          q1: 'yes',
          q2: 'yes',
          q3: 'yes',
          q4: 'Other infection',
        },
        caseId: 9,
        caseKey: 'doctor-letter.case.9.paragraph',
      },
      {
        name: 'resolves to Case 4 when Q1=true, Q2=true, Q3=false, Q5=COVID-19 vaccination',
        answers: {
          q1: 'yes',
          q2: 'yes',
          q3: 'no',
          q5: 'COVID-19 vaccination',
        },
        caseId: 4,
        caseKey: 'doctor-letter.case.4.paragraph',
      },
      {
        name: 'resolves to Case 14 when Q1=true, Q2=true, Q3=false, Q5=Medication: Fluoroquinolones',
        answers: {
          q1: 'yes',
          q2: 'yes',
          q3: 'no',
          q5: 'Medication: Fluoroquinolones',
        },
        caseId: 14,
        caseKey: 'doctor-letter.case.14.paragraph',
      },
      {
        name: 'resolves to Case 10 when Q1=true, Q2=true, Q3=false, Q5=Other cause',
        answers: {
          q1: 'yes',
          q2: 'yes',
          q3: 'no',
          q5: 'Other cause',
        },
        caseId: 10,
        caseKey: 'doctor-letter.case.10.paragraph',
      },
    ])('$name', ({ answers, caseId, caseKey }) => {
      const result = resolveDecisionTree(answers as DecisionAnswers);
      expect(result.caseId).toBe(caseId);
      expect(result.caseKey).toBe(caseKey);
    });
  });

  describe('Q1=false path (no full ME/CFS)', () => {
    it.each([
      {
        name: 'resolves to Case 0 when Q1=false, Q6=false (no chronic fatigue)',
        answers: {
          q1: 'no',
          q6: 'no',
        },
        caseId: 0,
        caseKey: CASE_0_KEY,
      },
      {
        name: 'resolves to Case 0 when Q1=false, Q6=true, Q7=false (no PEM)',
        answers: {
          q1: 'no',
          q6: 'yes',
          q7: 'no',
        },
        caseId: 0,
        caseKey: CASE_0_KEY,
      },
      {
        name: 'resolves to Case 12 when Q1=false, Q6=true, Q7=true, Q8=No known cause',
        answers: {
          q1: 'no',
          q6: 'yes',
          q7: 'yes',
          q8: 'No known cause',
        },
        caseId: 12,
        caseKey: 'doctor-letter.case.12.paragraph',
      },
      {
        name: 'resolves to Case 5 when Q1=false, Q6=true, Q7=true, Q8=EBV',
        answers: {
          q1: 'no',
          q6: 'yes',
          q7: 'yes',
          q8: 'EBV',
        },
        caseId: 5,
        caseKey: 'doctor-letter.case.5.paragraph',
      },
      {
        name: 'resolves to Case 6 when Q1=false, Q6=true, Q7=true, Q8=Influenza',
        answers: {
          q1: 'no',
          q6: 'yes',
          q7: 'yes',
          q8: 'Influenza',
        },
        caseId: 6,
        caseKey: 'doctor-letter.case.6.paragraph',
      },
      {
        name: 'resolves to Case 7 when Q1=false, Q6=true, Q7=true, Q8=COVID-19 infection',
        answers: {
          q1: 'no',
          q6: 'yes',
          q7: 'yes',
          q8: 'COVID-19 infection',
        },
        caseId: 7,
        caseKey: 'doctor-letter.case.7.paragraph',
      },
      {
        name: 'resolves to Case 8 when Q1=false, Q6=true, Q7=true, Q8=COVID-19 vaccination',
        answers: {
          q1: 'no',
          q6: 'yes',
          q7: 'yes',
          q8: 'COVID-19 vaccination',
        },
        caseId: 8,
        caseKey: 'doctor-letter.case.8.paragraph',
      },
      {
        name: 'resolves to Case 13 when Q1=false, Q6=true, Q7=true, Q8=Other cause',
        answers: {
          q1: 'no',
          q6: 'yes',
          q7: 'yes',
          q8: 'Other cause',
        },
        caseId: 13,
        caseKey: 'doctor-letter.case.13.paragraph',
      },
    ])('$name', ({ answers, caseId, caseKey }) => {
      const result = resolveDecisionTree(answers as DecisionAnswers);
      expect(result.caseId).toBe(caseId);
      expect(result.caseKey).toBe(caseKey);
    });
  });

  describe('edge cases and defaults', () => {
    it.each([
      {
        name: 'resolves to Case 0 when no answers provided',
        answers: {},
        caseId: 0,
        caseKey: CASE_0_KEY,
      },
      {
        name: 'resolves to Case 0 when Q1=true but no Q2 provided',
        answers: {
          q1: 'yes',
        },
        caseId: 0,
        caseKey: CASE_0_KEY,
      },
      {
        name: 'resolves to Case 0 when Q1=true, Q2=true but Q3 is missing',
        answers: {
          q1: 'yes',
          q2: 'yes',
        },
        caseId: 0,
        caseKey: CASE_0_KEY,
      },
      {
        name: 'resolves to Case 0 when Q1=true, Q2=true, Q3=true but no Q4 provided',
        answers: {
          q1: 'yes',
          q2: 'yes',
          q3: 'yes',
        },
        caseId: 0,
        caseKey: CASE_0_KEY,
      },
      {
        name: 'resolves to Case 0 when Q1=true, Q2=true, Q3=false but no Q5 provided',
        answers: {
          q1: 'yes',
          q2: 'yes',
          q3: 'no',
        },
        caseId: 0,
        caseKey: CASE_0_KEY,
      },
      {
        name: 'resolves to Case 0 when Q1=false, Q6=true, Q7=true but no Q8 provided',
        answers: {
          q1: 'no',
          q6: 'yes',
          q7: 'yes',
        },
        caseId: 0,
        caseKey: CASE_0_KEY,
      },
      {
        name: 'resolves to Case 0 when Q1=false but Q6 is missing',
        answers: {
          q1: 'no',
        },
        caseId: 0,
        caseKey: CASE_0_KEY,
      },
      {
        name: 'resolves to Case 0 when Q1=false, Q6=true but Q7 is missing',
        answers: {
          q1: 'no',
          q6: 'yes',
        },
        caseId: 0,
        caseKey: CASE_0_KEY,
      },
    ])('$name', ({ answers, caseId, caseKey }) => {
      const result = resolveDecisionTree(answers as DecisionAnswers);
      expect(result.caseId).toBe(caseId);
      expect(result.caseKey).toBe(caseKey);
    });
  });

  describe('determinism and stability', () => {
    it('returns same result for identical inputs', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
        q4: 'COVID-19',
      };
      const result1 = resolveDecisionTree(answers);
      const result2 = resolveDecisionTree(answers);
      expect(result1).toEqual(result2);
    });

    it('returns different results for different inputs', () => {
      const answers1: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
        q4: 'EBV',
      };
      const answers2: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
        q4: 'Influenza',
      };
      const result1 = resolveDecisionTree(answers1);
      const result2 = resolveDecisionTree(answers2);
      expect(result1.caseId).not.toBe(result2.caseId);
    });
  });
});
