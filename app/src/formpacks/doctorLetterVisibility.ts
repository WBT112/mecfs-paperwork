/**
 * Conditional visibility logic for doctor-letter decision tree.
 *
 * Decision tree structure:
 * - Q1 (full ME/CFS): always visible
 *   - If Q1 = Yes:
 *     - Q2 (cause known): visible
 *       - If Q2 = Yes:
 *         - Q3 (after infection): visible
 *           - If Q3 = Yes: Q4 (which infection) visible
 *           - If Q3 = No: Q5 (other cause) visible
 *       - If Q2 = No: no further questions (Case 11)
 *   - If Q1 = No:
 *     - Q6 (chronic fatigue): visible
 *       - If Q6 = Yes:
 *         - Q7 (PEM): visible
 *           - If Q7 = Yes: Q8 (cause) visible
 *           - If Q7 = No: no further questions (Case 0)
 *       - If Q6 = No: no further questions (Case 0)
 */

export type DecisionData = {
  q1?: 'yes' | 'no';
  q2?: 'yes' | 'no';
  q3?: 'yes' | 'no';
  q4?: string;
  q5?: string;
  q6?: 'yes' | 'no';
  q7?: 'yes' | 'no';
  q8?: string;
  resolvedCaseText?: string;
};

export type FieldVisibility = {
  q1: boolean;
  q2: boolean;
  q3: boolean;
  q4: boolean;
  q5: boolean;
  q6: boolean;
  q7: boolean;
  q8: boolean;
  resolvedCaseText: boolean;
};

/**
 * Determines which decision tree fields should be visible based on current answers.
 */
export function getFieldVisibility(decision: DecisionData): FieldVisibility {
  const visibility: FieldVisibility = {
    q1: true, // Always visible (root question)
    q2: false,
    q3: false,
    q4: false,
    q5: false,
    q6: false,
    q7: false,
    q8: false,
    resolvedCaseText: true, // Always visible (result display)
  };

  // Q1 branching
  if (decision.q1 === 'yes') {
    applyQ1TruePath(decision, visibility);
  } else if (decision.q1 === 'no') {
    applyQ1FalsePath(decision, visibility);
  } else {
    // q1 undefined - no further questions yet
  }

  return visibility;
}

/**
 * Apply visibility rules for Q1=yes path (full ME/CFS)
 */
function applyQ1TruePath(
  decision: DecisionData,
  visibility: FieldVisibility,
): void {
  visibility.q2 = true; // Show "Is cause known?"

  if (decision.q2 === 'yes') {
    visibility.q3 = true; // Show "After infection?"

    if (decision.q3 === 'yes') {
      visibility.q4 = true; // Show "Which infection?"
    } else if (decision.q3 === 'no') {
      visibility.q5 = true; // Show "Other cause?"
    } else {
      // q3 undefined - no further questions yet
    }
  } else {
    // q2 === 'no' or undefined - no further questions (Case 11 if 'no')
  }
}

/**
 * Apply visibility rules for Q1=no path (no full ME/CFS)
 */
function applyQ1FalsePath(
  decision: DecisionData,
  visibility: FieldVisibility,
): void {
  visibility.q6 = true; // Show "Chronic fatigue?"

  if (decision.q6 === 'yes') {
    visibility.q7 = true; // Show "PEM?"

    if (decision.q7 === 'yes') {
      visibility.q8 = true; // Show "Cause?"
    }
    // else: q7 === 'no' or undefined - no further questions (Case 0 if 'no')
  }
  // else: q6 === 'no' or undefined - no further questions (Case 0 if 'no')
}

/**
 * Clears hidden fields from decision data to prevent stale values
 * from affecting the decision tree resolution.
 *
 * RATIONALE: When a parent answer changes such that a child field becomes hidden,
 * we must clear that field's value to ensure the decision tree result is based
 * only on visible/relevant answers.
 */
export function clearHiddenFields(decision: DecisionData): DecisionData {
  const visibility = getFieldVisibility(decision);
  const cleaned: DecisionData = { ...decision };

  // Clear fields that are not visible
  if (!visibility.q2) {
    delete cleaned.q2;
  }
  if (!visibility.q3) {
    delete cleaned.q3;
  }
  if (!visibility.q4) {
    delete cleaned.q4;
  }
  if (!visibility.q5) {
    delete cleaned.q5;
  }
  if (!visibility.q6) {
    delete cleaned.q6;
  }
  if (!visibility.q7) {
    delete cleaned.q7;
  }
  if (!visibility.q8) {
    delete cleaned.q8;
  }

  return cleaned;
}
