import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/formpacks/documentModel', () => ({
  buildDocumentModel: vi.fn(() => ({
    patient: {
      firstName: '   ',
      lastName: '   ',
      streetAndNumber: '   ',
      postalCode: '   ',
      city: '   ',
    },
    doctor: {
      practice: '   ',
      title: '   ',
      gender: '   ',
      name: '   ',
      streetAndNumber: '   ',
      postalCode: '   ',
      city: '   ',
    },
    decision: {},
  })),
}));

vi.mock('../../../src/export/doctorLetterDefaults', () => ({
  getDoctorLetterExportDefaults: vi.fn(() => ({
    patient: {
      firstName: '',
      lastName: '',
      streetAndNumber: '',
      postalCode: '',
      city: '',
    },
    doctor: {
      name: '',
      streetAndNumber: '',
      postalCode: '',
      city: '',
    },
    decision: {
      fallbackCaseText: 'DEFAULT',
    },
  })),
  hasDoctorLetterDecisionAnswers: vi.fn(() => true),
}));

vi.mock('../../../src/export/pdf/render', () => ({
  formatPdfDate: vi.fn(() => ''),
}));

vi.mock('../../../src/i18n', () => ({
  default: {
    getFixedT: () => (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  },
}));

describe('buildDoctorLetterDocumentModel branch coverage', () => {
  it('returns empty kvTable blocks when normalized/fallback values are empty', async () => {
    const { buildDoctorLetterDocumentModel } =
      await import('../../../src/formpacks/doctor-letter/export/documentModel');

    const model = buildDoctorLetterDocumentModel({
      formData: {},
      locale: 'de',
      exportedAt: new Date('2026-03-01T00:00:00.000Z'),
    });

    const templateData = (model.meta?.templateData ?? {}) as {
      decision?: { caseText?: string };
    };

    expect(model.sections[0]?.blocks).toEqual([]);
    expect(model.sections[1]?.blocks).toEqual([]);
    expect(model.sections[2]?.blocks).toEqual([]);
    expect(templateData.decision?.caseText).toBe('');
  });
});
