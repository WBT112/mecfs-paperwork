import { describe, expect, it, vi } from 'vitest';
import deTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/de.json';
import enTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/en.json';
import { buildOfflabelAntragExportBundle } from '../../src/formpacks/offlabel-antrag/letterBuilder';

const deTranslations = deTranslationsJson as Record<string, string>;
const enTranslations = enTranslationsJson as Record<string, string>;
const FIXED_EXPORTED_AT = new Date('2026-02-10T12:00:00.000Z');

const interpolate = (
  template: string,
  options: Record<string, unknown>,
): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(options[key] ?? ''),
  );

vi.mock('../../src/i18n', () => ({
  default: {
    getFixedT:
      (locale: string) => (key: string, options?: Record<string, unknown>) => {
        const source = locale === 'en' ? enTranslations : deTranslations;
        const fallback =
          typeof options?.defaultValue === 'string'
            ? options.defaultValue
            : key;
        const template = source[key] ?? fallback;
        return interpolate(template, options ?? {});
      },
  },
}));

describe('offlabel-antrag letter builder', () => {
  it('creates only part 1 when doctor support is disabled', () => {
    const bundle = buildOfflabelAntragExportBundle({
      locale: 'de',
      documentModel: {
        request: {
          drug: '',
          doctorSupport: {
            enabled: false,
          },
        },
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(bundle.part2).toBeUndefined();
    expect(bundle.part1.signatureBlocks).toEqual([
      {
        label: 'Patient/in',
        name: 'Max Mustermann',
      },
    ]);
    expect(bundle.part1.subject).toContain('BITTE AUSWÄHLEN');
  });

  it('creates part 2 when doctor support is enabled and no explicit export flag is set', () => {
    const bundle = buildOfflabelAntragExportBundle({
      locale: 'de',
      documentModel: {
        request: {
          doctorSupport: {
            enabled: true,
          },
        },
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(bundle.part2).toBeDefined();
    expect(
      bundle.part2?.bodyParagraphs.some((paragraph) =>
        paragraph.includes('Teil 1'),
      ),
    ).toBe(true);
    expect(bundle.part2?.attachmentsItems[0]).toBe(
      'Teil 1: Antrag an die Krankenkasse (Entwurf)',
    );
  });

  it('adds doctor signature to part 1 only when doctorSignsPart1 is enabled', () => {
    const bundle = buildOfflabelAntragExportBundle({
      locale: 'de',
      documentModel: {
        patient: {
          firstName: 'Mara',
          lastName: 'Beispiel',
        },
        doctor: {
          name: 'Dr. Med. Hausarzt',
          practice: 'Praxis Nord',
        },
        request: {
          doctorSupport: {
            enabled: true,
            doctorSignsPart1: true,
          },
        },
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(bundle.part1.signatureBlocks).toEqual([
      {
        label: 'Patient/in',
        name: 'Mara Beispiel',
      },
      {
        label: 'Behandelnde/r Aerztin/Arzt',
        name: 'Dr. Med. Hausarzt',
        extraLines: ['Praxis Nord'],
      },
    ]);
  });

  it('parses attachments and references part 1 in part 2 attachments', () => {
    const bundle = buildOfflabelAntragExportBundle({
      locale: 'de',
      documentModel: {
        request: {
          doctorSupport: {
            enabled: true,
          },
        },
        attachmentsFreeText: ' - Arztbrief vom 01.01.2026\n• Befundbericht\n\n',
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(bundle.part1.attachmentsItems).toEqual([
      'Arztbrief vom 01.01.2026',
      'Befundbericht',
    ]);
    expect(bundle.part2?.attachmentsItems).toEqual([
      'Teil 1: Antrag an die Krankenkasse (Entwurf)',
      'Arztbrief vom 01.01.2026',
      'Befundbericht',
    ]);
  });

  it('uses default fallback values and respects explicit includeDoctorCoverLetter=false', () => {
    const bundle = buildOfflabelAntragExportBundle({
      locale: 'en',
      documentModel: {
        patient: {
          firstName: '',
          lastName: '',
        },
        doctor: {
          name: '',
        },
        insurer: {
          name: '',
        },
        request: {
          indicationFreeText: '',
          doctorSupport: {
            enabled: true,
          },
        },
        export: {
          includeDoctorCoverLetter: false,
        },
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(bundle.part2).toBeUndefined();
    expect(bundle.part1.senderLines[0]).toBe('Max Example');
    expect(bundle.part1.addresseeLines[0]).toBe('Example Health Insurance');
    expect(bundle.part1.bodyParagraphs[1]).toContain('—');
  });
});
