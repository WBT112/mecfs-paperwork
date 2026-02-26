// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  shouldShowInfoBox,
  getVisibleInfoBoxes,
  type InfoBoxConfig,
} from '../../src/formpacks/formpackInfoBox';

const TEST_ANCHOR = 'decision.q1';
const TEST_I18N_KEY = 'test.key';
const TEST_BOX_ID = 'test-box';
const BOX1_ID = 'box1';
const DECISION_PATH_Q1 = 'decision.q1';
const DECISION_PATH_Q2 = 'decision.q2';

describe('formpackInfoBox', () => {
  describe('shouldShowInfoBox', () => {
    it('returns true when enabled and no showIf conditions', () => {
      const config: InfoBoxConfig = {
        id: TEST_BOX_ID,
        anchor: TEST_ANCHOR,
        enabled: true,
        i18nKey: TEST_I18N_KEY,
      };
      expect(shouldShowInfoBox(config, {})).toBe(true);
    });

    it('returns false when disabled', () => {
      const config: InfoBoxConfig = {
        id: TEST_BOX_ID,
        anchor: TEST_ANCHOR,
        enabled: false,
        i18nKey: TEST_I18N_KEY,
      };
      expect(shouldShowInfoBox(config, {})).toBe(false);
    });

    it('returns true when enabled and showIf condition matches (eq)', () => {
      const config: InfoBoxConfig = {
        id: TEST_BOX_ID,
        anchor: TEST_ANCHOR,
        enabled: true,
        i18nKey: TEST_I18N_KEY,
        showIf: [{ path: DECISION_PATH_Q1, op: 'eq', value: 'yes' }],
      };
      const formData = { decision: { q1: 'yes' } };
      expect(shouldShowInfoBox(config, formData)).toBe(true);
    });

    it('returns false when enabled but showIf condition does not match (eq)', () => {
      const config: InfoBoxConfig = {
        id: TEST_BOX_ID,
        anchor: TEST_ANCHOR,
        enabled: true,
        i18nKey: TEST_I18N_KEY,
        showIf: [{ path: DECISION_PATH_Q1, op: 'eq', value: 'yes' }],
      };
      const formData = { decision: { q1: 'no' } };
      expect(shouldShowInfoBox(config, formData)).toBe(false);
    });

    it('returns true when enabled and showIf condition matches (neq)', () => {
      const config: InfoBoxConfig = {
        id: TEST_BOX_ID,
        anchor: TEST_ANCHOR,
        enabled: true,
        i18nKey: TEST_I18N_KEY,
        showIf: [{ path: DECISION_PATH_Q1, op: 'neq', value: 'no' }],
      };
      const formData = { decision: { q1: 'yes' } };
      expect(shouldShowInfoBox(config, formData)).toBe(true);
    });

    it('returns false when enabled but showIf condition does not match (neq)', () => {
      const config: InfoBoxConfig = {
        id: TEST_BOX_ID,
        anchor: TEST_ANCHOR,
        enabled: true,
        i18nKey: TEST_I18N_KEY,
        showIf: [{ path: DECISION_PATH_Q1, op: 'neq', value: 'no' }],
      };
      const formData = { decision: { q1: 'no' } };
      expect(shouldShowInfoBox(config, formData)).toBe(false);
    });

    it('returns true when all showIf conditions match', () => {
      const config: InfoBoxConfig = {
        id: TEST_BOX_ID,
        anchor: TEST_ANCHOR,
        enabled: true,
        i18nKey: TEST_I18N_KEY,
        showIf: [
          { path: DECISION_PATH_Q1, op: 'eq', value: 'yes' },
          { path: DECISION_PATH_Q2, op: 'eq', value: 'no' },
        ],
      };
      const formData = { decision: { q1: 'yes', q2: 'no' } };
      expect(shouldShowInfoBox(config, formData)).toBe(true);
    });

    it('returns false when any showIf condition does not match', () => {
      const config: InfoBoxConfig = {
        id: TEST_BOX_ID,
        anchor: TEST_ANCHOR,
        enabled: true,
        i18nKey: TEST_I18N_KEY,
        showIf: [
          { path: DECISION_PATH_Q1, op: 'eq', value: 'yes' },
          { path: DECISION_PATH_Q2, op: 'eq', value: 'no' },
        ],
      };
      const formData = { decision: { q1: 'yes', q2: 'yes' } };
      expect(shouldShowInfoBox(config, formData)).toBe(false);
    });

    it('handles missing nested paths gracefully', () => {
      const config: InfoBoxConfig = {
        id: TEST_BOX_ID,
        anchor: TEST_ANCHOR,
        enabled: true,
        i18nKey: TEST_I18N_KEY,
        showIf: [{ path: 'decision.missing.path', op: 'eq', value: 'test' }],
      };
      expect(shouldShowInfoBox(config, {})).toBe(false);
    });

    it('returns false for unsupported operators', () => {
      const config: InfoBoxConfig = {
        id: TEST_BOX_ID,
        anchor: TEST_ANCHOR,
        enabled: true,
        i18nKey: TEST_I18N_KEY,
        showIf: [
          { path: DECISION_PATH_Q1, op: 'invalid' as never, value: 'x' },
        ],
      };

      expect(shouldShowInfoBox(config, { decision: { q1: 'x' } })).toBe(false);
    });

    it('handles undefined form data', () => {
      const config: InfoBoxConfig = {
        id: TEST_BOX_ID,
        anchor: TEST_ANCHOR,
        enabled: true,
        i18nKey: TEST_I18N_KEY,
        showIf: [{ path: DECISION_PATH_Q1, op: 'eq', value: 'yes' }],
      };
      expect(shouldShowInfoBox(config, undefined as any)).toBe(false);
    });
  });

  describe('getVisibleInfoBoxes', () => {
    it('returns empty array when no infoBoxes in manifest', () => {
      const manifest: any = { id: 'test' };
      expect(getVisibleInfoBoxes(manifest, {})).toEqual([]);
    });

    it('returns empty array when infoBoxes array is empty', () => {
      const manifest: any = { id: 'test', ui: { infoBoxes: [] } };
      expect(getVisibleInfoBoxes(manifest, {})).toEqual([]);
    });

    it('returns only enabled infoBoxes with no conditions', () => {
      const manifest: any = {
        id: 'test',
        ui: {
          infoBoxes: [
            {
              id: BOX1_ID,
              anchor: 'field1',
              enabled: true,
              i18nKey: 'key1',
            },
            {
              id: 'box2',
              anchor: 'field2',
              enabled: false,
              i18nKey: 'key2',
            },
          ],
        },
      };
      const result = getVisibleInfoBoxes(manifest, {});
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BOX1_ID);
    });

    it('returns infoBoxes that match their showIf conditions', () => {
      const manifest: any = {
        id: 'test',
        ui: {
          infoBoxes: [
            {
              id: BOX1_ID,
              anchor: TEST_ANCHOR,
              enabled: true,
              i18nKey: 'key1',
              showIf: [{ path: DECISION_PATH_Q1, op: 'eq', value: 'yes' }],
            },
            {
              id: 'box2',
              anchor: 'decision.q2',
              enabled: true,
              i18nKey: 'key2',
              showIf: [{ path: DECISION_PATH_Q1, op: 'eq', value: 'no' }],
            },
          ],
        },
      };
      const formData = { decision: { q1: 'yes' } };
      const result = getVisibleInfoBoxes(manifest, formData);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BOX1_ID);
    });

    it('handles mix of conditional and unconditional infoBoxes', () => {
      const manifest: any = {
        id: 'test',
        ui: {
          infoBoxes: [
            {
              id: BOX1_ID,
              anchor: 'field1',
              enabled: true,
              i18nKey: 'key1',
            },
            {
              id: 'box2',
              anchor: 'field2',
              enabled: true,
              i18nKey: 'key2',
              showIf: [{ path: DECISION_PATH_Q1, op: 'eq', value: 'yes' }],
            },
          ],
        },
      };
      const formData = { decision: { q1: 'no' } };
      const result = getVisibleInfoBoxes(manifest, formData);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BOX1_ID);
    });
  });
});
