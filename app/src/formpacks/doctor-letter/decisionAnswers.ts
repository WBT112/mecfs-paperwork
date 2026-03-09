import {
  Q4_OPTIONS,
  Q5_OPTIONS,
  Q8_OPTIONS,
  type DecisionAnswers,
} from '../decisionEngine';

type Q4Answer = NonNullable<DecisionAnswers['q4']>;
type Q5Answer = NonNullable<DecisionAnswers['q5']>;
type Q8Answer = NonNullable<DecisionAnswers['q8']>;

const YES_NO_VALUES = new Set(['yes', 'no']);
const Q4_VALUES = new Set<Q4Answer>(Q4_OPTIONS);
const Q5_VALUES = new Set<Q5Answer>(Q5_OPTIONS);
const Q8_VALUES = new Set<Q8Answer>(Q8_OPTIONS);

const normalizeYesNo = (value: unknown): 'yes' | 'no' | undefined => {
  if (value === true || value === 'yes') {
    return 'yes';
  }
  if (value === false || value === 'no') {
    return 'no';
  }
  return undefined;
};

const normalizeEnumValue = <T extends string>(
  value: unknown,
  validValues: Set<T>,
): T | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  return validValues.has(value as T) ? (value as T) : undefined;
};

export const normalizeDecisionAnswers = (
  raw: Record<string, unknown>,
): DecisionAnswers => ({
  q1: normalizeYesNo(raw.q1),
  q2: normalizeYesNo(raw.q2),
  q3: normalizeYesNo(raw.q3),
  q4: normalizeEnumValue<Q4Answer>(raw.q4, Q4_VALUES),
  q5: normalizeEnumValue<Q5Answer>(raw.q5, Q5_VALUES),
  q6: normalizeYesNo(raw.q6),
  q7: normalizeYesNo(raw.q7),
  q8: normalizeEnumValue<Q8Answer>(raw.q8, Q8_VALUES),
});

export const isCompletedCase0Path = (raw: Record<string, unknown>): boolean => {
  const answers = normalizeDecisionAnswers(raw);
  if (!YES_NO_VALUES.has(answers.q1 ?? '')) {
    return false;
  }
  return (
    (answers.q1 === 'no' && answers.q6 === 'no') ||
    (answers.q1 === 'no' && answers.q6 === 'yes' && answers.q7 === 'no')
  );
};
