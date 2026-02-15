import { describe, expect, it } from 'vitest';
import type { UiSchema } from '@rjsf/utils';
import { applyOfflabelVisibility } from '../../src/formpacks/offlabel-antrag/uiVisibility';

const buildUiSchema = (): UiSchema => ({
  request: {
    indicationFullyMetOrDoctorConfirms: { 'ui:widget': 'radio' },
    applySection2Abs1a: {},
    otherDrugName: {},
    otherIndication: {},
    otherTreatmentGoal: { 'ui:widget': 'textarea' },
    otherDose: { 'ui:widget': 'textarea' },
    otherDuration: { 'ui:widget': 'textarea' },
    otherMonitoring: { 'ui:widget': 'textarea' },
    standardOfCareTriedFreeText: { 'ui:widget': 'textarea' },
  },
});

describe('applyOfflabelVisibility', () => {
  it('returns unchanged ui schema when request node is missing', () => {
    const uiSchema: UiSchema = {};
    const result = applyOfflabelVisibility(uiSchema, {
      request: { drug: 'other' },
    });

    expect(result).toEqual(uiSchema);
  });

  it('handles non-record request form data without throwing', () => {
    const uiSchema = buildUiSchema();
    const result = applyOfflabelVisibility(uiSchema, {
      request: [],
    });
    const request = result.request as Record<string, unknown>;

    expect(
      (request.otherDrugName as Record<string, unknown>)['ui:widget'],
    ).toBe('hidden');
    expect(
      (request.indicationFullyMetOrDoctorConfirms as Record<string, unknown>)[
        'ui:widget'
      ],
    ).toBe('radio');
  });

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
    expect(
      (request.indicationFullyMetOrDoctorConfirms as Record<string, unknown>)[
        'ui:widget'
      ],
    ).toBe('radio');
    expect(
      (request.applySection2Abs1a as Record<string, unknown>)['ui:widget'],
    ).toBeUndefined();
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
    ).toBe('textarea');
    expect((request.otherDose as Record<string, unknown>)['ui:widget']).toBe(
      'textarea',
    );
    expect(
      (request.otherDuration as Record<string, unknown>)['ui:widget'],
    ).toBe('textarea');
    expect(
      (request.otherMonitoring as Record<string, unknown>)['ui:widget'],
    ).toBe('textarea');
    expect(
      (request.standardOfCareTriedFreeText as Record<string, unknown>)[
        'ui:widget'
      ],
    ).toBe('textarea');
    expect(
      (request.indicationFullyMetOrDoctorConfirms as Record<string, unknown>)[
        'ui:widget'
      ],
    ).toBe('hidden');
    expect(
      (request.applySection2Abs1a as Record<string, unknown>)['ui:widget'],
    ).toBe('hidden');
  });
});
