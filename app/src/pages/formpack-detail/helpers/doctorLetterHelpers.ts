import { isRecord } from '../../../lib/utils';
import {
  getFieldVisibility,
  resolveDecisionTree,
  type DecisionData,
} from '../../../formpacks';
import {
  isCompletedCase0Path,
  normalizeDecisionAnswers,
} from '../../../formpacks/doctor-letter/decisionAnswers';
import type { UiSchema } from '@rjsf/utils';

const DECISION_VISIBILITY_FIELDS = [
  'q2',
  'q3',
  'q4',
  'q5',
  'q6',
  'q7',
  'q8',
] as const;

function applyFieldVisibility(
  decisionUiSchema: Record<string, unknown>,
  visibility: ReturnType<typeof getFieldVisibility>,
): void {
  for (const field of DECISION_VISIBILITY_FIELDS) {
    if (!visibility[field]) {
      if (!isRecord(decisionUiSchema[field])) {
        decisionUiSchema[field] = {};
      }
      const fieldSchema = decisionUiSchema[field] as Record<string, unknown>;
      fieldSchema['ui:widget'] = 'hidden';
    }
  }
}

function shouldHideCase0Result(decision: DecisionData): boolean {
  const result = resolveDecisionTree(normalizeDecisionAnswers(decision));
  const isCase0 = result.caseId === 0;

  if (!isCase0) {
    return false;
  }

  return !isCompletedCase0Path(decision);
}

/**
 * Applies doctor-letter visibility rules to a cloned UI schema instance.
 *
 * @param normalizedUiSchema - Locale-resolved base UI schema.
 * @param decisionData - Current decision subtree from the form data.
 * @returns A visibility-adjusted UI schema for the doctor-letter workflow.
 */
function buildDoctorLetterConditionalUiSchema(
  normalizedUiSchema: UiSchema,
  decisionData: unknown,
): UiSchema {
  const decision = (isRecord(decisionData) ? decisionData : {}) as DecisionData;
  const visibility = getFieldVisibility(decision);
  const clonedUiSchema = structuredClone(normalizedUiSchema);

  if (!isRecord(clonedUiSchema.decision)) {
    return normalizedUiSchema;
  }

  const decisionUiSchema = clonedUiSchema.decision;

  applyFieldVisibility(decisionUiSchema, visibility);

  if (
    shouldHideCase0Result(decision) &&
    isRecord(decisionUiSchema.resolvedCaseText)
  ) {
    const resultSchema = decisionUiSchema.resolvedCaseText;
    resultSchema['ui:widget'] = 'hidden';
  }

  return clonedUiSchema;
}

/**
 * Collects doctor-letter-specific visibility helpers for the detail page.
 */
export const doctorLetterHelpers = {
  applyFieldVisibility,
  buildDoctorLetterConditionalUiSchema,
  shouldHideCase0Result,
};
