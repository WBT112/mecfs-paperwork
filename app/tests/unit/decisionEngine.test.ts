// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  resolveDecisionTree,
  type DecisionAnswers,
} from '../../src/formpacks/decisionEngine';

const CASE_0_KEY = 'doctor-letter.case.0.paragraph';

describe('resolveDecisionTree', () => {
  describe('Q1=true path (full ME/CFS)', () => {
    it('resolves to Case 11 when Q1=true, Q2=false (cause unknown)', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'no',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(11);
      expect(result.caseKey).toBe('doctor-letter.case.11.paragraph');
    });

    it('resolves to Case 1 when Q1=true, Q2=true, Q3=true, Q4=EBV', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
        q4: 'EBV',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(1);
      expect(result.caseKey).toBe('doctor-letter.case.1.paragraph');
    });

    it('resolves to Case 2 when Q1=true, Q2=true, Q3=true, Q4=Influenza', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
        q4: 'Influenza',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(2);
      expect(result.caseKey).toBe('doctor-letter.case.2.paragraph');
    });

    it('resolves to Case 3 when Q1=true, Q2=true, Q3=true, Q4=COVID-19', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
        q4: 'COVID-19',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(3);
      expect(result.caseKey).toBe('doctor-letter.case.3.paragraph');
    });

    it('resolves to Case 9 when Q1=true, Q2=true, Q3=true, Q4=Other infection', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
        q4: 'Other infection',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(9);
      expect(result.caseKey).toBe('doctor-letter.case.9.paragraph');
    });

    it('resolves to Case 4 when Q1=true, Q2=true, Q3=false, Q5=COVID-19 vaccination', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'no',
        q5: 'COVID-19 vaccination',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(4);
      expect(result.caseKey).toBe('doctor-letter.case.4.paragraph');
    });

    it('resolves to Case 14 when Q1=true, Q2=true, Q3=false, Q5=Medication: Fluoroquinolones', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'no',
        q5: 'Medication: Fluoroquinolones',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(14);
      expect(result.caseKey).toBe('doctor-letter.case.14.paragraph');
    });

    it('resolves to Case 10 when Q1=true, Q2=true, Q3=false, Q5=Other cause', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'no',
        q5: 'Other cause',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(10);
      expect(result.caseKey).toBe('doctor-letter.case.10.paragraph');
    });
  });

  describe('Q1=false path (no full ME/CFS)', () => {
    it('resolves to Case 0 when Q1=false, Q6=false (no chronic fatigue)', () => {
      const answers: DecisionAnswers = {
        q1: 'no',
        q6: 'no',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(0);
      expect(result.caseKey).toBe(CASE_0_KEY);
    });

    it('resolves to Case 0 when Q1=false, Q6=true, Q7=false (no PEM)', () => {
      const answers: DecisionAnswers = {
        q1: 'no',
        q6: 'yes',
        q7: 'no',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(0);
      expect(result.caseKey).toBe(CASE_0_KEY);
    });

    it('resolves to Case 12 when Q1=false, Q6=true, Q7=true, Q8=No known cause', () => {
      const answers: DecisionAnswers = {
        q1: 'no',
        q6: 'yes',
        q7: 'yes',
        q8: 'No known cause',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(12);
      expect(result.caseKey).toBe('doctor-letter.case.12.paragraph');
    });

    it('resolves to Case 5 when Q1=false, Q6=true, Q7=true, Q8=EBV', () => {
      const answers: DecisionAnswers = {
        q1: 'no',
        q6: 'yes',
        q7: 'yes',
        q8: 'EBV',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(5);
      expect(result.caseKey).toBe('doctor-letter.case.5.paragraph');
    });

    it('resolves to Case 6 when Q1=false, Q6=true, Q7=true, Q8=Influenza', () => {
      const answers: DecisionAnswers = {
        q1: 'no',
        q6: 'yes',
        q7: 'yes',
        q8: 'Influenza',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(6);
      expect(result.caseKey).toBe('doctor-letter.case.6.paragraph');
    });

    it('resolves to Case 7 when Q1=false, Q6=true, Q7=true, Q8=COVID-19 infection', () => {
      const answers: DecisionAnswers = {
        q1: 'no',
        q6: 'yes',
        q7: 'yes',
        q8: 'COVID-19 infection',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(7);
      expect(result.caseKey).toBe('doctor-letter.case.7.paragraph');
    });

    it('resolves to Case 8 when Q1=false, Q6=true, Q7=true, Q8=COVID-19 vaccination', () => {
      const answers: DecisionAnswers = {
        q1: 'no',
        q6: 'yes',
        q7: 'yes',
        q8: 'COVID-19 vaccination',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(8);
      expect(result.caseKey).toBe('doctor-letter.case.8.paragraph');
    });

    it('resolves to Case 13 when Q1=false, Q6=true, Q7=true, Q8=Other cause', () => {
      const answers: DecisionAnswers = {
        q1: 'no',
        q6: 'yes',
        q7: 'yes',
        q8: 'Other cause',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(13);
      expect(result.caseKey).toBe('doctor-letter.case.13.paragraph');
    });
  });

  describe('edge cases and defaults', () => {
    it('resolves to Case 0 when no answers provided', () => {
      const answers: DecisionAnswers = {};
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(0);
      expect(result.caseKey).toBe(CASE_0_KEY);
    });

    it('resolves to Case 0 when Q1=true but no Q2 provided', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(0);
      expect(result.caseKey).toBe(CASE_0_KEY);
    });

    it('resolves to Case 0 when Q1=true, Q2=true but Q3 is missing', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(0);
      expect(result.caseKey).toBe(CASE_0_KEY);
    });

    it('resolves to Case 0 when Q1=true, Q2=true, Q3=true but no Q4 provided', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(0);
      expect(result.caseKey).toBe(CASE_0_KEY);
    });

    it('resolves to Case 0 when Q1=true, Q2=true, Q3=false but no Q5 provided', () => {
      const answers: DecisionAnswers = {
        q1: 'yes',
        q2: 'yes',
        q3: 'no',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(0);
      expect(result.caseKey).toBe(CASE_0_KEY);
    });

    it('resolves to Case 0 when Q1=false, Q6=true, Q7=true but no Q8 provided', () => {
      const answers: DecisionAnswers = {
        q1: 'no',
        q6: 'yes',
        q7: 'yes',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(0);
      expect(result.caseKey).toBe(CASE_0_KEY);
    });

    it('resolves to Case 0 when Q1=false but Q6 is missing', () => {
      const answers: DecisionAnswers = {
        q1: 'no',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(0);
      expect(result.caseKey).toBe(CASE_0_KEY);
    });

    it('resolves to Case 0 when Q1=false, Q6=true but Q7 is missing', () => {
      const answers: DecisionAnswers = {
        q1: 'no',
        q6: 'yes',
      };
      const result = resolveDecisionTree(answers);
      expect(result.caseId).toBe(0);
      expect(result.caseKey).toBe(CASE_0_KEY);
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
