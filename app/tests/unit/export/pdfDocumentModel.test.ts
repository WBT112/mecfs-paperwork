import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../../../src/i18n';
import deTranslations from '../../../../formpacks/doctor-letter/i18n/de.json';
import enTranslations from '../../../../formpacks/doctor-letter/i18n/en.json';
import { buildDoctorLetterDocumentModel } from '../../../src/formpacks/doctor-letter/export/documentModel';
import type { DocumentBlock } from '../../../src/export/pdf/types';

const namespace = 'formpack:doctor-letter';

const extractText = (block: DocumentBlock): string => {
  if (block.type === 'paragraph') {
    return block.text;
  }
  if (block.type === 'lineBreaks') {
    return block.lines.join(' ');
  }
  return '';
};

describe('buildDoctorLetterDocumentModel', () => {
  beforeAll(() => {
    if (!i18n.hasResourceBundle('de', namespace)) {
      i18n.addResourceBundle(
        'de',
        namespace,
        deTranslations as Record<string, string>,
        true,
        true,
      );
    }
    if (!i18n.hasResourceBundle('en', namespace)) {
      i18n.addResourceBundle(
        'en',
        namespace,
        enTranslations as Record<string, string>,
        true,
        true,
      );
    }
  });

  it('builds patient, doctor, and case sections with stable blocks', () => {
    const exportedAt = new Date('2026-02-02T00:00:00.000Z');
    const model = buildDoctorLetterDocumentModel({
      formData: {
        patient: {
          firstName: 'Max',
          lastName: 'Mustermann',
          streetAndNumber: 'Teststraße 1',
          postalCode: '12345',
          city: 'Berlin',
        },
        doctor: {
          practice: 'Test Praxis',
          title: 'Dr.',
          gender: 'Herr',
          name: 'Test',
          streetAndNumber: 'Praxisweg 2',
          postalCode: '54321',
          city: 'Hamburg',
        },
        decision: {
          q1: 'yes',
          q2: 'yes',
          q3: 'yes',
          q4: 'EBV',
        },
      },
      locale: 'de',
      exportedAt,
    });

    expect(model.meta?.createdAtIso).toBe(exportedAt.toISOString());

    const patientSection = model.sections[0];
    const doctorSection = model.sections[1];
    const caseSection = model.sections[2];

    expect(patientSection.heading).toBe('Patient');
    expect(doctorSection.heading).toBe('Arzt / Praxis');
    expect(caseSection.heading).toBe('Falltext');

    const doctorRows = doctorSection.blocks.find(
      (block) => block.type === 'kvTable',
    );
    expect(doctorRows?.type).toBe('kvTable');

    if (!doctorRows) {
      throw new Error('Expected a kvTable block for doctor rows.');
    }

    const dateRow = doctorRows.rows.find((row) => row[0] === 'Datum');
    expect(dateRow?.[1]).toBeTruthy();

    const hasLineBreaks = caseSection.blocks.some(
      (block) => block.type === 'lineBreaks',
    );
    expect(hasLineBreaks).toBe(true);

    const emptyParagraphs = caseSection.blocks.filter(
      (block) => block.type === 'paragraph' && block.text.trim().length === 0,
    );
    expect(emptyParagraphs).toHaveLength(0);
  });

  it('uses fallback case text when no decision answers exist', () => {
    const model = buildDoctorLetterDocumentModel({
      formData: {
        patient: {},
        doctor: {},
        decision: {},
      },
      locale: 'en',
      exportedAt: new Date('2026-02-02T00:00:00.000Z'),
    });

    const caseSection = model.sections[2];
    const caseText = caseSection.blocks.map(extractText).join(' ');
    expect(caseText).toContain('NOTICE: PLEASE ANSWER');
  });
});
