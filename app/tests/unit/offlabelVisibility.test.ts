// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { UiSchema } from '@rjsf/utils';
import { applyOfflabelVisibility } from '../../src/formpacks/offlabel-antrag/uiVisibility';

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
};

const buildUiSchema = (): UiSchema => ({
  request: {
    drug: {},
    indicationFullyMetOrDoctorConfirms: { 'ui:widget': 'radio' },
    applySection2Abs1a: {},
    selectedIndicationKey: {},
    otherDrugName: {},
    otherIndication: {},
    otherTreatmentGoal: { 'ui:widget': 'textarea' },
    otherDose: { 'ui:widget': 'textarea' },
    otherDuration: { 'ui:widget': 'textarea' },
    otherMonitoring: { 'ui:widget': 'textarea' },
    otherEvidenceReference: { 'ui:widget': 'textarea' },
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
      (request.selectedIndicationKey as Record<string, unknown>)['ui:widget'],
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
      (request.otherEvidenceReference as Record<string, unknown>)['ui:widget'],
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

  it('shows selected indication selector only for medications with multiple indications', () => {
    const uiSchema = buildUiSchema();
    const result = applyOfflabelVisibility(
      uiSchema,
      { request: { drug: 'agomelatin' } },
      'de',
    );
    const request = result.request as Record<string, unknown>;
    const selectedIndication = request.selectedIndicationKey as Record<
      string,
      unknown
    >;
    const selectedIndicationOptions = selectedIndication[
      'ui:options'
    ] as Record<string, unknown>;
    const enumOptions = selectedIndicationOptions.enumOptions as Array<
      Record<string, string>
    >;

    expect(selectedIndication['ui:widget']).toBeUndefined();
    expect(selectedIndication['ui:enumNames']).toEqual([
      'postinfektiöse ME/CFS mit Fatigue',
      'Long-/Post-COVID mit Fatigue',
    ]);
    expect(enumOptions).toEqual([
      {
        value: 'agomelatin.mecfs_fatigue',
        label: 'postinfektiöse ME/CFS mit Fatigue',
      },
      {
        value: 'agomelatin.long_post_covid_fatigue',
        label: 'Long-/Post-COVID mit Fatigue',
      },
    ]);
  });

  it('sets localized medication enum options for request.drug', () => {
    const uiSchema = buildUiSchema();
    const result = applyOfflabelVisibility(
      uiSchema,
      { request: { drug: 'ivabradine' } },
      'de',
    );
    const request = result.request as Record<string, unknown>;
    const drug = request.drug as Record<string, unknown>;
    const drugOptions = drug['ui:options'] as Record<string, unknown>;
    const enumOptions = drugOptions.enumOptions as Array<
      Record<string, string>
    >;

    expect(drug['ui:enumNames']).toEqual([
      'Agomelatin',
      'Ivabradin',
      'Vortioxetin',
      'Low-Dose Naltrexon (LDN)',
      'Aripiprazol (LDA)',
      'anderes Medikament',
    ]);
    expect(enumOptions).toEqual([
      { value: 'agomelatin', label: 'Agomelatin' },
      { value: 'ivabradine', label: 'Ivabradin' },
      { value: 'vortioxetine', label: 'Vortioxetin' },
      { value: 'ldn', label: 'Low-Dose Naltrexon (LDN)' },
      { value: 'aripiprazole', label: 'Aripiprazol (LDA)' },
      {
        value: 'other',
        label: 'anderes Medikament',
      },
    ]);
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
      (request.selectedIndicationKey as Record<string, unknown>)['ui:widget'],
    ).toBe('hidden');
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
      (request.otherEvidenceReference as Record<string, unknown>)['ui:widget'],
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

  it('normalizes non-record field nodes when request entries are malformed', () => {
    const uiSchema: UiSchema = {
      request: {
        drug: 'invalid-node',
        selectedIndicationKey: 123,
        otherDrugName: 'invalid-node',
      },
    };

    const result = applyOfflabelVisibility(uiSchema, {
      request: { drug: 'other' },
    });
    const request = asRecord(result.request as unknown);
    const drug = asRecord(request.drug);
    const selectedIndicationKey = asRecord(request.selectedIndicationKey);
    const selectedIndicationOptions = asRecord(
      selectedIndicationKey['ui:options'],
    );

    expect(Array.isArray(drug['ui:enumNames'])).toBe(true);
    expect(Array.isArray(selectedIndicationKey['ui:enumNames'])).toBe(true);
    expect(Array.isArray(selectedIndicationOptions.enumOptions)).toBe(true);
    expect(
      (request.otherDrugName as Record<string, unknown>)['ui:widget'],
    ).toBeUndefined();
  });

  it('merges existing ui:options for drug and indication selectors', () => {
    const uiSchema: UiSchema = {
      request: {
        drug: {
          'ui:options': { preserve: 'drug' },
        },
        selectedIndicationKey: {
          'ui:options': { preserve: 'indication' },
        },
      },
    };

    const result = applyOfflabelVisibility(
      uiSchema,
      { request: { drug: 'agomelatin' } },
      'de',
    );
    const request = asRecord(result.request as unknown);
    const drug = asRecord(request.drug);
    const selectedIndicationKey = asRecord(request.selectedIndicationKey);
    const drugOptions = asRecord(drug['ui:options']);
    const selectedIndicationOptions = asRecord(
      selectedIndicationKey['ui:options'],
    );

    expect(drugOptions.preserve).toBe('drug');
    expect(selectedIndicationOptions.preserve).toBe('indication');
    expect(Array.isArray(drugOptions.enumOptions)).toBe(true);
    expect(Array.isArray(selectedIndicationOptions.enumOptions)).toBe(true);
  });
});
