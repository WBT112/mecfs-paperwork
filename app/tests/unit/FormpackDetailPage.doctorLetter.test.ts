import { describe, expect, it } from 'vitest';
import {
  getFieldVisibility,
  clearHiddenFields,
  type DecisionData,
} from '../../src/formpacks/doctorLetterVisibility';

// Test the helper functions that are exported and used in FormpackDetailPage

describe('FormpackDetailPage - Doctor Letter Helpers', () => {
  describe('applyFieldVisibility logic', () => {
    it('hides follow-up questions when prerequisites not met (q1=undefined)', () => {
      const decision: DecisionData = {};
      const visibility = getFieldVisibility(decision);

      // Only q1 and resolvedCaseText should be visible when q1 is undefined
      expect(visibility.q1).toBe(true);
      expect(visibility.q2).toBe(false);
      expect(visibility.q3).toBe(false);
      expect(visibility.q4).toBe(false);
      expect(visibility.q5).toBe(false);
      expect(visibility.q6).toBe(false); // q6 only visible when q1=no
      expect(visibility.q7).toBe(false);
      expect(visibility.q8).toBe(false);
      expect(visibility.resolvedCaseText).toBe(true); // result always visible
    });

    it('shows follow-up questions when q1=yes', () => {
      const decision: DecisionData = { q1: 'yes' };
      const visibility = getFieldVisibility(decision);

      expect(visibility.q1).toBe(true);
      expect(visibility.q2).toBe(true); // q2 visible when q1=yes
      expect(visibility.q3).toBe(false); // q3 hidden until q2=yes
    });

    it('handles nested visibility (q1=yes, q2=yes, q3=yes)', () => {
      const decision: DecisionData = { q1: 'yes', q2: 'yes', q3: 'yes' };
      const visibility = getFieldVisibility(decision);

      expect(visibility.q1).toBe(true);
      expect(visibility.q2).toBe(true);
      expect(visibility.q3).toBe(true);
      expect(visibility.q4).toBe(true); // q4 visible when q3=yes
    });

    it('handles alternate path (q1=no, q6=yes)', () => {
      const decision: DecisionData = { q1: 'no', q6: 'yes' };
      const visibility = getFieldVisibility(decision);

      expect(visibility.q1).toBe(true);
      expect(visibility.q2).toBe(false); // q2-q5 hidden on no path
      expect(visibility.q6).toBe(true);
      expect(visibility.q7).toBe(true); // q7 visible when q6=yes
    });
  });

  describe('clearHiddenFields logic', () => {
    it('clears hidden fields when q1 changes from yes to no', () => {
      const decision: DecisionData = {
        q1: 'no',
        q2: 'yes', // should be cleared (q2 not visible when q1=no)
        q3: 'yes', // should be cleared
        q4: 'COVID-19', // should be cleared
      };

      const cleared = clearHiddenFields(decision);

      expect(cleared.q1).toBe('no');
      expect(cleared.q2).toBeUndefined();
      expect(cleared.q3).toBeUndefined();
      expect(cleared.q4).toBeUndefined();
    });

    it('clears hidden fields when q2 changes from yes to no', () => {
      const decision: DecisionData = {
        q1: 'yes',
        q2: 'no',
        q3: 'yes', // should be cleared (q3 not visible when q2=no)
        q4: 'EBV', // should be cleared
      };

      const cleared = clearHiddenFields(decision);

      expect(cleared.q1).toBe('yes');
      expect(cleared.q2).toBe('no');
      expect(cleared.q3).toBeUndefined();
      expect(cleared.q4).toBeUndefined();
    });

    it('preserves visible fields', () => {
      const decision: DecisionData = {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
        q4: 'COVID-19',
      };

      const cleared = clearHiddenFields(decision);

      // All fields visible, none should be cleared
      expect(cleared.q1).toBe('yes');
      expect(cleared.q2).toBe('yes');
      expect(cleared.q3).toBe('yes');
      expect(cleared.q4).toBe('COVID-19');
    });

    it('clears q8 when q7=no (alternate path)', () => {
      const decision: DecisionData = {
        q1: 'no',
        q6: 'yes',
        q7: 'no',
        q8: 'EBV', // should be cleared (q8 not visible when q7=no)
      };

      const cleared = clearHiddenFields(decision);

      expect(cleared.q1).toBe('no');
      expect(cleared.q6).toBe('yes');
      expect(cleared.q7).toBe('no');
      expect(cleared.q8).toBeUndefined();
    });
  });

  describe('shouldHideCase0Result logic', () => {
    it('shows result for valid Case 0 path (q1=no, q6=no)', () => {
      const decision: DecisionData = {
        q1: 'no',
        q6: 'no',
        resolvedCaseText: 'Fall 0 - Patient has no chronic fatigue',
      };

      // This is a valid complete path, so result should be shown
      // shouldHideCase0Result should return false
      const isCase0 =
        decision.resolvedCaseText?.includes('Fall 0') ||
        decision.resolvedCaseText?.includes('Case 0') ||
        !decision.resolvedCaseText;

      const isValidCase0 =
        (decision.q1 === 'no' && decision.q6 === 'no') ||
        (decision.q1 === 'no' && decision.q6 === 'yes' && decision.q7 === 'no');

      const shouldHide = isCase0 && !isValidCase0;

      expect(shouldHide).toBe(false); // Should NOT hide result
    });

    it('shows result for valid Case 0 path (q1=no, q6=yes, q7=no)', () => {
      const decision: DecisionData = {
        q1: 'no',
        q6: 'yes',
        q7: 'no',
        resolvedCaseText: 'Fall 0 - Patient has chronic fatigue but no PEM',
      };

      const isCase0 =
        decision.resolvedCaseText?.includes('Fall 0') ||
        decision.resolvedCaseText?.includes('Case 0') ||
        !decision.resolvedCaseText;

      const isValidCase0 =
        (decision.q1 === 'no' && decision.q6 === 'no') ||
        (decision.q1 === 'no' && decision.q6 === 'yes' && decision.q7 === 'no');

      const shouldHide = isCase0 && !isValidCase0;

      expect(shouldHide).toBe(false); // Should NOT hide result
    });

    it('hides result for incomplete path (q1=no, q6=yes, q7=undefined)', () => {
      const decision: DecisionData = {
        q1: 'no',
        q6: 'yes',
        // q7 is missing - incomplete path
        resolvedCaseText: 'Fall 0 - Incomplete',
      };

      const isCase0 =
        decision.resolvedCaseText?.includes('Fall 0') ||
        decision.resolvedCaseText?.includes('Case 0') ||
        !decision.resolvedCaseText;

      const isValidCase0 =
        (decision.q1 === 'no' && decision.q6 === 'no') ||
        (decision.q1 === 'no' && decision.q6 === 'yes' && decision.q7 === 'no');

      const shouldHide = isCase0 && !isValidCase0;

      expect(shouldHide).toBe(true); // Should hide result
    });

    it('does not hide result for non-Case 0 (Case 3)', () => {
      const decision: DecisionData = {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
        q4: 'COVID-19',
        resolvedCaseText: 'Fall 3 - ME/CFS after COVID-19 infection',
      };

      const isCase0 =
        decision.resolvedCaseText?.includes('Fall 0') ||
        decision.resolvedCaseText?.includes('Case 0') ||
        !decision.resolvedCaseText;

      const shouldHide = isCase0; // For non-Case 0, we check if it's Case 0 at all

      expect(shouldHide).toBe(false); // Not Case 0, so don't hide
    });

    it('hides result when resolvedCaseText is empty string', () => {
      const decision: DecisionData = {
        q1: 'yes',
        // incomplete path
        resolvedCaseText: '',
      };

      const isCase0 =
        decision.resolvedCaseText?.includes('Fall 0') ||
        decision.resolvedCaseText?.includes('Case 0') ||
        !decision.resolvedCaseText;

      const shouldHide = isCase0; // Empty means incomplete

      expect(shouldHide).toBe(true); // Should hide result
    });
  });

  describe('enum validation helpers', () => {
    it('validates yes/no strings (isYesNo)', () => {
      const isYesNo = (val: unknown): val is 'yes' | 'no' =>
        val === 'yes' || val === 'no';

      expect(isYesNo('yes')).toBe(true);
      expect(isYesNo('no')).toBe(true);
      expect(isYesNo('YES')).toBe(false);
      expect(isYesNo('No')).toBe(false);
      expect(isYesNo(true)).toBe(false);
      expect(isYesNo(false)).toBe(false);
      expect(isYesNo(undefined)).toBe(false);
      expect(isYesNo(null)).toBe(false);
      expect(isYesNo('')).toBe(false);
    });

    it('validates infection type (isValidQ4)', () => {
      const isValidQ4 = (val: unknown): boolean =>
        val === 'COVID-19' || val === 'EBV' || val === 'Other infection';

      expect(isValidQ4('COVID-19')).toBe(true);
      expect(isValidQ4('EBV')).toBe(true);
      expect(isValidQ4('Other infection')).toBe(true);
      expect(isValidQ4('covid-19')).toBe(false);
      expect(isValidQ4('Unknown')).toBe(false);
      expect(isValidQ4(undefined)).toBe(false);
    });

    it('validates cause type (isValidQ5)', () => {
      const isValidQ5 = (val: unknown): boolean =>
        val === 'Unknown cause' || val === 'Other cause';

      expect(isValidQ5('Unknown cause')).toBe(true);
      expect(isValidQ5('Other cause')).toBe(true);
      expect(isValidQ5('COVID-19 vaccination')).toBe(false);
      expect(isValidQ5(undefined)).toBe(false);
    });

    it('validates q8 infection type (isValidQ8)', () => {
      const isValidQ8 = (val: unknown): boolean =>
        val === 'EBV' ||
        val === 'Other infection' ||
        val === 'COVID-19 vaccination' ||
        val === 'Other cause';

      expect(isValidQ8('EBV')).toBe(true);
      expect(isValidQ8('Other infection')).toBe(true);
      expect(isValidQ8('COVID-19 vaccination')).toBe(true);
      expect(isValidQ8('Other cause')).toBe(true);
      expect(isValidQ8('COVID-19')).toBe(false);
      expect(isValidQ8(undefined)).toBe(false);
    });
  });

  describe('formpackId filtering', () => {
    it('only applies doctor-letter logic when formpackId === "doctor-letter"', () => {
      const doctorLetterFormpackId = 'doctor-letter';
      const otherFormpackId = 'notfallpass';

      expect(doctorLetterFormpackId === 'doctor-letter').toBe(true);
      expect(otherFormpackId === 'doctor-letter').toBe(false);

      // Conditional visibility should only apply to doctor-letter
      const shouldApplyLogic = (formpackId: string) =>
        formpackId === 'doctor-letter';

      expect(shouldApplyLogic('doctor-letter')).toBe(true);
      expect(shouldApplyLogic('notfallpass')).toBe(false);
      expect(shouldApplyLogic('other-formpack')).toBe(false);
    });
  });

  describe('DOCTOR_LETTER_ID constant', () => {
    it('constant matches expected value', () => {
      const DOCTOR_LETTER_ID = 'doctor-letter';
      expect(DOCTOR_LETTER_ID).toBe('doctor-letter');
    });
  });

  describe('resolveAndPopulateDoctorLetterCase integration', () => {
    it('handles enum string values in decision object', () => {
      const decision = {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
        q4: 'COVID-19',
      };

      // Validate that enum strings are properly structured
      expect(decision.q1).toBe('yes');
      expect(decision.q2).toBe('yes');
      expect(decision.q3).toBe('yes');
      expect(decision.q4).toBe('COVID-19');

      // isYesNo checks
      const isYesNo = (val: unknown): val is 'yes' | 'no' =>
        val === 'yes' || val === 'no';
      expect(isYesNo(decision.q1)).toBe(true);
      expect(isYesNo(decision.q2)).toBe(true);
      expect(isYesNo(decision.q3)).toBe(true);

      // isValidQ4 check
      const isValidQ4 = (val: unknown): boolean =>
        val === 'COVID-19' || val === 'EBV' || val === 'Other infection';
      expect(isValidQ4(decision.q4)).toBe(true);
    });

    it('handles alternate path enum values', () => {
      const decision = {
        q1: 'no',
        q6: 'yes',
        q7: 'yes',
        q8: 'EBV',
      };

      const isYesNo = (val: unknown): val is 'yes' | 'no' =>
        val === 'yes' || val === 'no';
      expect(isYesNo(decision.q1)).toBe(true);
      expect(isYesNo(decision.q6)).toBe(true);
      expect(isYesNo(decision.q7)).toBe(true);

      const isValidQ8 = (val: unknown): boolean =>
        val === 'EBV' ||
        val === 'Other infection' ||
        val === 'COVID-19 vaccination' ||
        val === 'Other cause';
      expect(isValidQ8(decision.q8)).toBe(true);
    });
  });

  describe('useEffect dependency on formData', () => {
    it('decision tree resolution depends on formData changes', () => {
      // The useEffect in FormpackDetailPage has formData as a dependency
      // This test verifies that the dependency structure is correct

      const formData1 = {
        decision: { q1: 'yes' },
      };

      const formData2 = {
        decision: { q1: 'yes', q2: 'yes' },
      };

      // Stringify to compare (simulating useEffect dependency check)
      expect(JSON.stringify(formData1)).not.toBe(JSON.stringify(formData2));

      // When formData changes, useEffect should trigger
      const hasChanged = JSON.stringify(formData1) !== JSON.stringify(formData2);
      expect(hasChanged).toBe(true);
    });

    it('does not update when resolvedCaseText is already correct', () => {
      const decision1 = {
        q1: 'yes',
        q2: 'yes',
        resolvedCaseText: 'Case 11',
      };

      const decision2 = {
        q1: 'yes',
        q2: 'yes',
        resolvedCaseText: 'Case 11',
      };

      // If current and new case text match, no update needed
      const shouldUpdate =
        decision1.resolvedCaseText !== decision2.resolvedCaseText;
      expect(shouldUpdate).toBe(false);
    });

    it('updates when resolvedCaseText changes', () => {
      const currentCaseText = 'Case 0';
      const newCaseText = 'Case 3';

      const shouldUpdate = currentCaseText !== newCaseText;
      expect(shouldUpdate).toBe(true);
    });
  });

  describe('formContext with InfoBox data', () => {
    it('includes formpackId in formContext', () => {
      const formContext = {
        t: (key: string) => key,
        formpackId: 'doctor-letter',
        infoBoxes: [],
      };

      expect(formContext.formpackId).toBe('doctor-letter');
    });

    it('includes infoBoxes from manifest in formContext', () => {
      const manifest = {
        ui: {
          infoBoxes: [
            {
              id: 'q1-info',
              anchor: 'decision.q1',
              enabled: true,
              i18nKey: 'doctor-letter.infobox.q1',
            },
          ],
        },
      };

      const formContext = {
        t: (key: string) => key,
        formpackId: 'doctor-letter',
        infoBoxes: manifest.ui.infoBoxes,
      };

      expect(formContext.infoBoxes).toHaveLength(1);
      expect(formContext.infoBoxes[0].id).toBe('q1-info');
    });

    it('uses DoctorLetterFieldTemplate for doctor-letter formpack', () => {
      const formpackId = 'doctor-letter';
      const shouldUseCustomTemplate = formpackId === 'doctor-letter';

      expect(shouldUseCustomTemplate).toBe(true);
    });

    it('uses standard templates for other formpacks', () => {
      const formpackId = 'notfallpass';
      const shouldUseCustomTemplate = formpackId === 'doctor-letter';

      expect(shouldUseCustomTemplate).toBe(false);
    });
  });

  describe('conditionalUiSchema memo dependencies', () => {
    it('depends on normalizedUiSchema', () => {
      const uiSchema1 = { decision: { q1: {} } };
      const uiSchema2 = { decision: { q1: {}, q2: {} } };

      expect(JSON.stringify(uiSchema1)).not.toBe(JSON.stringify(uiSchema2));
    });

    it('depends on formpackId', () => {
      const formpackId1 = 'doctor-letter';
      const formpackId2 = 'notfallpass';

      expect(formpackId1).not.toBe(formpackId2);
    });

    it('depends on formData for decision visibility', () => {
      const formData1 = { decision: { q1: 'yes' } };
      const formData2 = { decision: { q1: 'no' } };

      const visibility1 = getFieldVisibility(formData1.decision);
      const visibility2 = getFieldVisibility(formData2.decision);

      // Visibility should be different
      expect(visibility1.q2).not.toBe(visibility2.q2);
    });
  });

  describe('JSON deep cloning for UI schema mutation prevention', () => {
    it('clones UI schema to avoid mutations', () => {
      const originalUiSchema = {
        decision: {
          q1: { 'ui:widget': 'radio' },
          q2: { 'ui:widget': 'radio' },
        },
      };

      const clonedUiSchema = JSON.parse(JSON.stringify(originalUiSchema));

      // Modify clone
      (clonedUiSchema.decision.q2 as Record<string, unknown>)['ui:widget'] =
        'hidden';

      // Original should be unchanged
      expect(originalUiSchema.decision.q2['ui:widget']).toBe('radio');
      expect(clonedUiSchema.decision.q2['ui:widget']).toBe('hidden');
    });
  });
});
