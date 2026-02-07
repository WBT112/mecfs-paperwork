import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import { buildDocumentModel } from '../../src/formpacks/documentModel';
import { splitParagraphs } from '../../src/lib/text/paragraphs';
import deTranslations from '../../public/formpacks/doctor-letter/i18n/de.json';
import enTranslations from '../../public/formpacks/doctor-letter/i18n/en.json';

const namespace = 'formpack:doctor-letter';
const FORMPACK_ID = 'doctor-letter';
const TEST_PRACTICE = 'Test Practice';
const JOHN = 'John';
const DOE = 'Doe';
const DR_TITLE = 'Dr.';
const COVID_19_VACCINATION = 'COVID-19 vaccination';
const FLUOROQUINOLONES = 'Medication: Fluoroquinolones';
const CASE_0_KEY = 'doctor-letter.case.0.paragraph';
const CASE_3_KEY = 'doctor-letter.case.3.paragraph';
const CASE_11_KEY = 'doctor-letter.case.11.paragraph';
const CASE_12_KEY = 'doctor-letter.case.12.paragraph';
const CASE_14_KEY = 'doctor-letter.case.14.paragraph';
const buildExpectedCaseText = (input: string) =>
  splitParagraphs(input).join('\n\n');

describe('buildDocumentModel for doctor-letter', () => {
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

  describe('patient and doctor data mapping', () => {
    it('maps patient data correctly', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'en', {
        patient: {
          firstName: JOHN,
          lastName: DOE,
          streetAndNumber: 'Main St 123',
          postalCode: '12345',
          city: 'Berlin',
        },
        doctor: {
          practice: TEST_PRACTICE,
          title: DR_TITLE,
          gender: 'Herr',
          name: 'Smith',
        },
        decision: {},
      });

      expect(result.patient).toEqual({
        firstName: JOHN,
        lastName: DOE,
        streetAndNumber: 'Main St 123',
        postalCode: '12345',
        city: 'Berlin',
      });
    });

    it('maps doctor data correctly', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'en', {
        patient: {
          firstName: JOHN,
          lastName: DOE,
        },
        doctor: {
          practice: TEST_PRACTICE,
          title: 'Prof. Dr.',
          gender: 'Frau',
          name: 'Schmidt',
          streetAndNumber: 'Medical Way 1',
          postalCode: '54321',
          city: 'Hamburg',
        },
        decision: {},
      });

      expect(result.doctor).toMatchObject({
        practice: TEST_PRACTICE,
        title: 'Prof. Dr.',
        gender: 'Frau',
        name: 'Schmidt',
        streetAndNumber: 'Medical Way 1',
        postalCode: '54321',
        city: 'Hamburg',
      });
    });

    it('handles missing optional patient fields', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'en', {
        patient: {
          firstName: JOHN,
          lastName: DOE,
        },
        doctor: {
          practice: TEST_PRACTICE,
          title: DR_TITLE,
          gender: 'Herr',
          name: 'Smith',
        },
        decision: {},
      });

      expect(result.patient).toEqual({
        firstName: JOHN,
        lastName: DOE,
        streetAndNumber: null,
        postalCode: null,
        city: null,
      });
    });

    it('handles missing optional doctor fields', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'en', {
        patient: {
          firstName: JOHN,
          lastName: DOE,
        },
        doctor: {
          practice: TEST_PRACTICE,
          title: 'kein',
          gender: 'Frau',
          name: DOE,
        },
        decision: {},
      });

      expect(result.doctor).toMatchObject({
        practice: TEST_PRACTICE,
        title: 'kein',
        gender: 'Frau',
        name: DOE,
        streetAndNumber: null,
        postalCode: null,
        city: null,
      });
    });
  });

  describe('decision tree integration', () => {
    it('resolves Case 0 and provides localized text in German', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'de', {
        patient: {
          firstName: 'Max',
          lastName: 'Mustermann',
        },
        doctor: {
          practice: 'Praxis Test',
          title: DR_TITLE,
          gender: 'Herr',
          name: 'Test',
        },
        decision: {
          q1: 'no',
          q6: 'no',
        },
      });

      expect(result.decision).toBeDefined();
      expect(result.decision?.caseId).toBe(0);
      const expectedText = buildExpectedCaseText(deTranslations[CASE_0_KEY]);
      expect(result.decision?.caseText).toBe(expectedText);
      expect(result.decision?.caseParagraphs).toEqual(
        splitParagraphs(deTranslations[CASE_0_KEY]),
      );
      expect(result.decision?.caseText).toContain('WICHTIGER HINWEIS');
      expect(result.decision?.caseText).not.toContain('[[P]]');
    });

    it('resolves Case 3 (COVID-19 infection) and provides localized text in English', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'en', {
        patient: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
        doctor: {
          practice: 'Practice Test',
          title: DR_TITLE,
          gender: 'Frau',
          name: 'Test',
        },
        decision: {
          q1: 'yes',
          q2: 'yes',
          q3: 'yes',
          q4: 'COVID-19',
        },
      });

      expect(result.decision).toBeDefined();
      expect(result.decision?.caseId).toBe(3);
      const expectedText = buildExpectedCaseText(enTranslations[CASE_3_KEY]);
      expect(result.decision?.caseText).toBe(expectedText);
      expect(result.decision?.caseParagraphs).toEqual(
        splitParagraphs(enTranslations[CASE_3_KEY]),
      );
      expect(result.decision?.caseText).toContain('COVID-19');
    });

    it('resolves Case 11 (cause unknown) correctly', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'de', {
        patient: {
          firstName: 'Anna',
          lastName: 'Test',
        },
        doctor: {
          practice: 'Test Praxis',
          title: 'Prof. Dr.',
          gender: 'Frau',
          name: 'Schmidt',
        },
        decision: {
          q1: 'yes',
          q2: 'no',
        },
      });

      expect(result.decision).toBeDefined();
      expect(result.decision?.caseId).toBe(11);
      const expectedText = buildExpectedCaseText(deTranslations[CASE_11_KEY]);
      expect(result.decision?.caseText).toBe(expectedText);
      expect(result.decision?.caseParagraphs).toEqual(
        splitParagraphs(deTranslations[CASE_11_KEY]),
      );
    });

    it('resolves Case 1 (EBV infection) correctly', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'en', {
        patient: {
          firstName: 'Tom',
          lastName: 'Brown',
        },
        doctor: {
          practice: 'Brown Practice',
          title: DR_TITLE,
          gender: 'Herr',
          name: 'Wilson',
        },
        decision: {
          q1: 'yes',
          q2: 'yes',
          q3: 'yes',
          q4: 'EBV',
        },
      });

      expect(result.decision).toBeDefined();
      expect(result.decision?.caseId).toBe(1);
      expect(result.decision?.caseText).toContain('Epstein–Barr virus');
    });

    it('resolves Case 12 (no known cause with PEM) correctly', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'de', {
        patient: {
          firstName: 'Lisa',
          lastName: 'Müller',
        },
        doctor: {
          practice: 'Praxis Müller',
          title: DR_TITLE,
          gender: 'Frau',
          name: 'Wagner',
        },
        decision: {
          q1: 'no',
          q6: 'yes',
          q7: 'yes',
          q8: 'No known cause',
        },
      });

      expect(result.decision).toBeDefined();
      expect(result.decision?.caseId).toBe(12);
      const expectedText = buildExpectedCaseText(deTranslations[CASE_12_KEY]);
      expect(result.decision?.caseText).toBe(expectedText);
      expect(result.decision?.caseParagraphs).toEqual(
        splitParagraphs(deTranslations[CASE_12_KEY]),
      );
    });

    it('resolves Case 8 (COVID-19 vaccination with PEM) correctly', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'en', {
        patient: {
          firstName: 'Sarah',
          lastName: 'Johnson',
        },
        doctor: {
          practice: 'Johnson Clinic',
          title: DR_TITLE,
          gender: 'Frau',
          name: 'Taylor',
        },
        decision: {
          q1: 'no',
          q6: 'yes',
          q7: 'yes',
          q8: COVID_19_VACCINATION,
        },
      });

      expect(result.decision).toBeDefined();
      expect(result.decision?.caseId).toBe(8);
      expect(result.decision?.caseText).toContain(COVID_19_VACCINATION);
    });

    it('resolves Case 14 (fluoroquinolones) correctly', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'en', {
        patient: {
          firstName: 'Alex',
          lastName: 'Meyer',
        },
        doctor: {
          practice: 'Meyer Practice',
          title: DR_TITLE,
          gender: 'Herr',
          name: 'Klein',
        },
        decision: {
          q1: 'yes',
          q2: 'yes',
          q3: 'no',
          q5: FLUOROQUINOLONES,
        },
      });

      expect(result.decision).toBeDefined();
      expect(result.decision?.caseId).toBe(14);
      const expectedText = buildExpectedCaseText(enTranslations[CASE_14_KEY]);
      expect(result.decision?.caseText).toBe(expectedText);
      expect(result.decision?.caseParagraphs).toEqual(
        splitParagraphs(enTranslations[CASE_14_KEY]),
      );
      expect(result.decision?.caseText).toMatch(/fluoroquinolon/i);
    });
  });

  describe('end-to-end mapping verification', () => {
    it('produces complete document model with all fields for export', () => {
      const formData = {
        patient: {
          firstName: 'Max',
          lastName: 'Mustermann',
          streetAndNumber: 'Musterstraße 123',
          postalCode: '12345',
          city: 'Berlin',
        },
        doctor: {
          practice: 'Praxis Dr. Schmidt',
          title: DR_TITLE,
          gender: 'Frau',
          name: 'Schmidt',
          streetAndNumber: 'Ärzteweg 1',
          postalCode: '12345',
          city: 'Berlin',
        },
        decision: {
          q1: 'yes',
          q2: 'yes',
          q3: 'yes',
          q4: 'COVID-19',
        },
      };

      const result = buildDocumentModel(FORMPACK_ID, 'de', formData);

      expect(result.patient).toBeDefined();
      expect(result.patient?.firstName).toBe('Max');
      expect(result.patient?.lastName).toBe('Mustermann');
      expect(result.patient?.streetAndNumber).toBe('Musterstraße 123');
      expect(result.patient?.postalCode).toBe('12345');
      expect(result.patient?.city).toBe('Berlin');

      expect(result.doctor).toBeDefined();
      expect(result.doctor.practice).toBe('Praxis Dr. Schmidt');
      expect(result.doctor.title).toBe('Dr.');
      expect(result.doctor.gender).toBe('Frau');
      expect(result.doctor.name).toBe('Schmidt');
      expect(result.doctor.streetAndNumber).toBe('Ärzteweg 1');
      expect(result.doctor.postalCode).toBe('12345');
      expect(result.doctor.city).toBe('Berlin');

      expect(result.decision).toBeDefined();
      expect(result.decision?.caseId).toBe(3);
      const expectedText = buildExpectedCaseText(deTranslations[CASE_3_KEY]);
      expect(result.decision?.caseText).toBe(expectedText);
      expect(typeof result.decision?.caseText).toBe('string');
      expect(result.decision?.caseText.length).toBeGreaterThan(0);
      expect(result.decision?.caseParagraphs).toEqual(
        splitParagraphs(deTranslations[CASE_3_KEY]),
      );
    });

    it('ensures caseText is never a raw boolean or ID', () => {
      const result = buildDocumentModel(FORMPACK_ID, 'en', {
        patient: {
          firstName: 'Test',
          lastName: 'User',
        },
        doctor: {
          practice: 'Test',
          title: DR_TITLE,
          gender: 'Herr',
          name: 'Test',
        },
        decision: {
          q1: 'yes',
          q2: 'yes',
          q3: 'no',
          q5: COVID_19_VACCINATION,
        },
      });

      expect(result.decision?.caseText).toBeDefined();
      expect(typeof result.decision?.caseText).toBe('string');
      expect(result.decision?.caseText).not.toBe('true');
      expect(result.decision?.caseText).not.toBe('false');
      expect(result.decision?.caseText).not.toBe('4');
      expect(result.decision?.caseText).toContain(COVID_19_VACCINATION);
    });
  });
});
