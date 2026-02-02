export type DecisionAnswers = {
  q1?: 'yes' | 'no';
  q2?: 'yes' | 'no';
  q3?: 'yes' | 'no';
  q4?: 'EBV' | 'Influenza' | 'COVID-19' | 'Other infection';
  q5?: 'COVID-19 vaccination' | 'Medication: Fluoroquinolones' | 'Other cause';
  q6?: 'yes' | 'no';
  q7?: 'yes' | 'no';
  q8?:
    | 'No known cause'
    | 'EBV'
    | 'Influenza'
    | 'COVID-19 infection'
    | 'COVID-19 vaccination'
    | 'Other cause';
};

export type DecisionResult = {
  caseId: number;
  caseKey: string;
};

const CASE_0_KEY = 'doctor-letter.case.0.paragraph';

const createResult = (caseId: number, caseKey: string): DecisionResult => ({
  caseId,
  caseKey,
});

const resolveQ4 = (q4?: DecisionAnswers['q4']): DecisionResult | null => {
  switch (q4) {
    case 'EBV':
      return createResult(1, 'doctor-letter.case.1.paragraph');
    case 'Influenza':
      return createResult(2, 'doctor-letter.case.2.paragraph');
    case 'COVID-19':
      return createResult(3, 'doctor-letter.case.3.paragraph');
    case 'Other infection':
      return createResult(9, 'doctor-letter.case.9.paragraph');
    case undefined:
      return null;
    default:
      return null;
  }
};

const resolveQ5 = (q5?: DecisionAnswers['q5']): DecisionResult | null => {
  switch (q5) {
    case 'COVID-19 vaccination':
      return createResult(4, 'doctor-letter.case.4.paragraph');
    case 'Medication: Fluoroquinolones':
      return createResult(14, 'doctor-letter.case.14.paragraph');
    case 'Other cause':
      return createResult(10, 'doctor-letter.case.10.paragraph');
    case undefined:
      return null;
    default:
      return null;
  }
};

const resolveQ8 = (q8?: DecisionAnswers['q8']): DecisionResult | null => {
  switch (q8) {
    case 'No known cause':
      return createResult(12, 'doctor-letter.case.12.paragraph');
    case 'EBV':
      return createResult(5, 'doctor-letter.case.5.paragraph');
    case 'Influenza':
      return createResult(6, 'doctor-letter.case.6.paragraph');
    case 'COVID-19 infection':
      return createResult(7, 'doctor-letter.case.7.paragraph');
    case 'COVID-19 vaccination':
      return createResult(8, 'doctor-letter.case.8.paragraph');
    case 'Other cause':
      return createResult(13, 'doctor-letter.case.13.paragraph');
    case undefined:
      return null;
    default:
      return null;
  }
};

const resolveQ1True = (answers: DecisionAnswers): DecisionResult | null => {
  if (answers.q2 === 'no') {
    return createResult(11, 'doctor-letter.case.11.paragraph');
  }

  if (answers.q2 === 'yes') {
    if (answers.q3 === 'yes') {
      return resolveQ4(answers.q4);
    }
    if (answers.q3 === 'no') {
      return resolveQ5(answers.q5);
    }
  }

  return null;
};

const resolveQ1False = (answers: DecisionAnswers): DecisionResult | null => {
  if (answers.q6 === 'no') {
    return createResult(0, CASE_0_KEY);
  }

  if (answers.q6 === 'yes') {
    if (answers.q7 === 'no') {
      return createResult(0, CASE_0_KEY);
    }
    if (answers.q7 === 'yes') {
      return resolveQ8(answers.q8);
    }
  }

  return null;
};

/**
 * Resolves decision tree answers to a case ID following the deterministic
 * decision tree specification.
 *
 * Decision tree flow:
 * Q1 (full ME/CFS) -> YES: Q2, NO: Q6
 * Q2 (cause known) -> YES: Q3, NO: Case 11
 * Q3 (after infection) -> YES: Q4, NO: Q5
 * Q4 (which infection) -> EBV: Case 1, Influenza: Case 2, COVID-19: Case 3, Other: Case 9
 * Q5 (other cause) -> COVID-19 vaccination: Case 4, Fluoroquinolones: Case 14, Other: Case 10
 * Q6 (chronic fatigue) -> YES: Q7, NO: Case 0
 * Q7 (PEM) -> YES: Q8, NO: Case 0
 * Q8 (cause) -> No known: Case 12, EBV: Case 5, Influenza: Case 6, COVID-19: Case 7, Vaccination: Case 8, Other: Case 13
 */
export const resolveDecisionTree = (
  answers: DecisionAnswers,
): DecisionResult => {
  if (answers.q1 === 'yes') {
    const result = resolveQ1True(answers);
    if (result) {
      return result;
    }
  }

  if (answers.q1 === 'no') {
    const result = resolveQ1False(answers);
    if (result) {
      return result;
    }
  }

  return createResult(0, CASE_0_KEY);
};
