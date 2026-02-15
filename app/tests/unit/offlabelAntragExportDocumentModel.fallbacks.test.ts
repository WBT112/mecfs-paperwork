import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/i18n', () => ({
  default: {
    getFixedT: () => (key: string, options?: Record<string, unknown>) =>
      typeof options?.defaultValue === 'string' ? options.defaultValue : key,
  },
}));

vi.mock(
  '../../src/formpacks/offlabel-antrag/content/buildOfflabelDocuments',
  () => ({
    buildOfflabelDocuments: () => [],
  }),
);

import { buildOffLabelAntragDocumentModel } from '../../src/formpacks/offlabel-antrag/export/documentModel';

describe('buildOffLabelAntragDocumentModel fallbacks', () => {
  it('handles missing preview parts and falls back to defaults', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: { drug: 'ivabradine' },
      },
      'de',
      { exportedAt: new Date('2026-02-10T12:00:00.000Z') },
    );

    expect(model.kk.paragraphs).toEqual([]);
    expect(model.arzt.paragraphs).toEqual([]);
    expect(model.part3.title).toBe(
      'Teil 3 – Vorlage für ärztliche Stellungnahme / Befundbericht (zur Anpassung durch die Praxis)',
    );
    expect(model.part3.paragraphs).toEqual([]);
  });
});
