import { describe, expect, it } from 'vitest';
import { applyDocxExportDefaults } from '../../../src/export/docx';

describe('applyDocxExportDefaults', () => {
  it('applies doctor-letter placeholders for missing patient and doctor fields', () => {
    const context = {
      t: {},
      patient: {
        firstName: '',
        lastName: '',
        streetAndNumber: '',
        postalCode: '',
        city: '',
      },
      doctor: {
        practice: '',
        name: '',
        streetAndNumber: '',
        postalCode: '',
        city: '',
      },
      decision: {
        caseText: '',
        caseParagraphs: [],
      },
    };

    const normalized = applyDocxExportDefaults(context, 'doctor-letter', 'de', {
      decision: {},
    });

    expect(normalized).toMatchObject({
      patient: {
        firstName: 'Max',
        lastName: 'Mustermann',
        streetAndNumber: 'Musterstraße 1',
        postalCode: '12345',
        city: 'Musterstadt',
      },
      doctor: {
        practice: '',
        name: 'Dr. med. Erika Beispiel',
        streetAndNumber: 'Praxisstraße 2',
        postalCode: '12345',
        city: 'Musterstadt',
      },
      decision: {
        caseText:
          'HINWEIS: BITTE BEANTWORTEN SIE ZUERST DIE FRAGEN UM EIN ERGEBNIS ZU ERHALTEN.',
        caseParagraphs: [
          'HINWEIS: BITTE BEANTWORTEN SIE ZUERST DIE FRAGEN UM EIN ERGEBNIS ZU ERHALTEN.',
        ],
      },
    });
  });

  it('preserves provided values and skips defaults for non-missing fields', () => {
    const context = {
      t: {},
      patient: {
        firstName: 'Jane',
        lastName: 'Doe',
        streetAndNumber: 'Main St 5',
        postalCode: '99999',
        city: 'Sampletown',
      },
      doctor: {
        practice: 'Central Clinic',
        name: 'Dr. Real',
        streetAndNumber: 'Health Ave 3',
        postalCode: '11111',
        city: 'Care City',
      },
      decision: {
        caseText: 'Resolved case text',
        caseParagraphs: ['Resolved case text'],
      },
    };

    const normalized = applyDocxExportDefaults(context, 'doctor-letter', 'en', {
      decision: { q1: 'yes' },
    });

    expect(normalized).toEqual(context);
  });

  it('applies offlabel-antrag placeholders for empty fields', () => {
    const context = {
      t: {},
      patient: {
        firstName: '',
        lastName: '',
        birthDate: '',
        insuranceNumber: '',
        streetAndNumber: '',
        postalCode: '',
        city: '',
      },
      doctor: {
        practice: '',
        name: '',
        streetAndNumber: '',
        postalCode: '',
        city: '',
      },
      insurer: {
        name: '',
        department: '',
        streetAndNumber: '',
        postalCode: '',
        city: '',
      },
      request: {
        drug: '',
        indicationFreeText: '',
        symptomsFreeText: '',
        standardOfCareTriedFreeText: '',
        doctorRationaleFreeText: '',
      },
      attachmentsFreeText: '',
      attachments: { items: [] },
    };

    const normalized = applyDocxExportDefaults(
      context,
      'offlabel-antrag',
      'de',
      {},
    );

    expect(normalized).toMatchObject({
      patient: {
        firstName: 'Max',
        lastName: 'Mustermann',
        birthDate: '01.01.1970',
        insuranceNumber: 'X123456789',
        streetAndNumber: 'Musterstraße 1',
        postalCode: '12345',
        city: 'Musterstadt',
      },
      doctor: {
        practice: 'Hausarztpraxis Beispiel',
        name: 'Dr. med. Erika Beispiel',
        streetAndNumber: 'Praxisstraße 2',
        postalCode: '12345',
        city: 'Musterstadt',
      },
      insurer: {
        name: 'Musterkrankenkasse',
        department: 'Leistungsabteilung',
        streetAndNumber: 'Kassenweg 3',
        postalCode: '12345',
        city: 'Musterstadt',
      },
      request: {
        drug: 'BITTE AUSWÄHLEN',
        indicationFreeText: '—',
        symptomsFreeText: '—',
        standardOfCareTriedFreeText: '—',
        doctorRationaleFreeText: '—',
      },
      attachmentsFreeText: '—',
      attachments: { items: [] },
    });
  });

  it('preserves provided offlabel-antrag values', () => {
    const context = {
      t: {},
      patient: {
        firstName: 'Mara',
        lastName: 'Example',
        birthDate: '12.04.1990',
        insuranceNumber: 'A-123',
        streetAndNumber: 'Road 1',
        postalCode: '11111',
        city: 'Town',
      },
      doctor: {
        practice: 'Clinic',
        name: 'Dr. Real',
        streetAndNumber: 'Doc St 2',
        postalCode: '22222',
        city: 'Med City',
      },
      insurer: {
        name: 'Real Insurance',
        department: 'Claims',
        streetAndNumber: 'Insurer St 3',
        postalCode: '33333',
        city: 'Ins City',
      },
      request: {
        drug: 'ivabradine',
        indicationFreeText: 'Existing indication',
        symptomsFreeText: 'Existing symptoms',
        standardOfCareTriedFreeText: 'Existing prior care',
        doctorRationaleFreeText: 'Existing rationale',
      },
      attachmentsFreeText: 'Existing attachment',
      attachments: { items: ['A'] },
    };

    const normalized = applyDocxExportDefaults(
      context,
      'offlabel-antrag',
      'en',
      {},
    );

    expect(normalized).toEqual(context);
  });

  it('does not apply defaults for other formpacks', () => {
    const context = {
      t: {},
      patient: { firstName: '' },
      doctor: { name: '' },
      decision: { caseText: '' },
    };

    const normalized = applyDocxExportDefaults(context, 'notfallpass', 'en', {
      decision: {},
    });

    expect(normalized).toEqual(context);
  });
});
