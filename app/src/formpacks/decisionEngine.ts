export type DecisionAnswers = {
  q1?: boolean;
  q2?: boolean;
  q3?: boolean;
  q4?: 'EBV' | 'Influenza' | 'COVID-19' | 'Other infection';
  q5?: 'COVID-19 vaccination' | 'Other cause';
  q6?: boolean;
  q7?: boolean;
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

/**
 * Resolves decision tree answers to a case ID following the deterministic
 * decision tree specification.
 *
 * Decision tree flow:
 * Q1 (full ME/CFS) -> YES: Q2, NO: Q6
 * Q2 (cause known) -> YES: Q3, NO: Case 11
 * Q3 (after infection) -> YES: Q4, NO: Q5
 * Q4 (which infection) -> EBV: Case 1, Influenza: Case 2, COVID-19: Case 3, Other: Case 9
 * Q5 (other cause) -> COVID-19 vaccination: Case 4, Other: Case 10
 * Q6 (chronic fatigue) -> YES: Q7, NO: Case 0
 * Q7 (PEM) -> YES: Q8, NO: Case 0
 * Q8 (cause) -> No known: Case 12, EBV: Case 5, Influenza: Case 6, COVID-19: Case 7, Vaccination: Case 8, Other: Case 13
 */
export const resolveDecisionTree = (
  answers: DecisionAnswers,
): DecisionResult => {
  if (answers.q1 === true) {
    if (answers.q2 === false) {
      return { caseId: 11, caseKey: 'doctor-letter.case.11.paragraph' };
    }

    if (answers.q2 === true) {
      if (answers.q3 === true) {
        switch (answers.q4) {
          case 'EBV':
            return { caseId: 1, caseKey: 'doctor-letter.case.1.paragraph' };
          case 'Influenza':
            return { caseId: 2, caseKey: 'doctor-letter.case.2.paragraph' };
          case 'COVID-19':
            return { caseId: 3, caseKey: 'doctor-letter.case.3.paragraph' };
          case 'Other infection':
            return { caseId: 9, caseKey: 'doctor-letter.case.9.paragraph' };
        }
      }

      if (answers.q3 === false) {
        switch (answers.q5) {
          case 'COVID-19 vaccination':
            return { caseId: 4, caseKey: 'doctor-letter.case.4.paragraph' };
          case 'Other cause':
            return { caseId: 10, caseKey: 'doctor-letter.case.10.paragraph' };
        }
      }
    }
  }

  if (answers.q1 === false) {
    if (answers.q6 === false) {
      return { caseId: 0, caseKey: 'doctor-letter.case.0.paragraph' };
    }

    if (answers.q6 === true) {
      if (answers.q7 === false) {
        return { caseId: 0, caseKey: 'doctor-letter.case.0.paragraph' };
      }

      if (answers.q7 === true) {
        switch (answers.q8) {
          case 'No known cause':
            return { caseId: 12, caseKey: 'doctor-letter.case.12.paragraph' };
          case 'EBV':
            return { caseId: 5, caseKey: 'doctor-letter.case.5.paragraph' };
          case 'Influenza':
            return { caseId: 6, caseKey: 'doctor-letter.case.6.paragraph' };
          case 'COVID-19 infection':
            return { caseId: 7, caseKey: 'doctor-letter.case.7.paragraph' };
          case 'COVID-19 vaccination':
            return { caseId: 8, caseKey: 'doctor-letter.case.8.paragraph' };
          case 'Other cause':
            return { caseId: 13, caseKey: 'doctor-letter.case.13.paragraph' };
        }
      }
    }
  }

  return { caseId: 0, caseKey: 'doctor-letter.case.0.paragraph' };
};
