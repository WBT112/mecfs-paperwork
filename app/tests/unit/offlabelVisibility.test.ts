import { describe, expect, it } from 'vitest';
import type { UiSchema } from '@rjsf/utils';
import { applyOfflabelVisibility } from '../../src/formpacks/offlabel-antrag/uiVisibility';

const buildUiSchema = (): UiSchema => ({
  request: {
    otherDrugName: {},
    otherIndication: {},
    otherTreatmentGoal: {},
    otherDose: {},
    otherDuration: {},
    otherMonitoring: {},
    standardOfCareTriedFreeText: {},
  },
});

describe('applyOfflabelVisibility', () => {
  it('hides manual medication fields for standard medications', () => {
    const uiSchema = buildUiSchema();
    const result = applyOfflabelVisibility(uiSchema, {
      request: { drug: 'ivabradine' },
    });
    const request = result.request as Record<string, unknown>;

    expect(
      (request.otherDrugName as Record<string, unknown>)['ui:widget'],
    ).toBe('hidden');
    expect(
      (request.otherIndication as Record<string, unknown>)['ui:widget'],
    ).toBe('hidden');
    expect(
      (request.otherTreatmentGoal as Record<string, unknown>)['ui:widget'],
    ).toBe('hidden');
    expect((request.otherDose as Record<string, unknown>)['ui:widget']).toBe(
      'hidden',
    );
    expect(
      (request.otherDuration as Record<string, unknown>)['ui:widget'],
    ).toBe('hidden');
    expect(
      (request.otherMonitoring as Record<string, unknown>)['ui:widget'],
    ).toBe('hidden');
    expect(
      (request.standardOfCareTriedFreeText as Record<string, unknown>)[
        'ui:widget'
      ],
    ).toBe('hidden');
  });

  it('shows manual medication fields for other', () => {
    const uiSchema = buildUiSchema();
    const result = applyOfflabelVisibility(uiSchema, {
      request: { drug: 'other' },
    });
    const request = result.request as Record<string, unknown>;

    expect(
      (request.otherDrugName as Record<string, unknown>)['ui:widget'],
    ).toBeUndefined();
    expect(
      (request.otherIndication as Record<string, unknown>)['ui:widget'],
    ).toBeUndefined();
    expect(
      (request.otherTreatmentGoal as Record<string, unknown>)['ui:widget'],
    ).toBeUndefined();
    expect((request.otherDose as Record<string, unknown>)['ui:widget']).toBe(
      undefined,
    );
    expect(
      (request.otherDuration as Record<string, unknown>)['ui:widget'],
    ).toBeUndefined();
    expect(
      (request.otherMonitoring as Record<string, unknown>)['ui:widget'],
    ).toBeUndefined();
    expect(
      (request.standardOfCareTriedFreeText as Record<string, unknown>)[
        'ui:widget'
      ],
    ).toBeUndefined();
  });
});
