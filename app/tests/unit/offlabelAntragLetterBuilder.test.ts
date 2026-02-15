import { describe, expect, it, vi } from 'vitest';
import deTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/de.json';
import enTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/en.json';
import {
  buildOfflabelAntragExportBundle,
  buildPart1KkLetter,
  buildPart2DoctorLetter,
  parseAttachments,
} from '../../src/formpacks/offlabel-antrag/letterBuilder';

const deTranslations = deTranslationsJson as Record<string, string>;
const enTranslations = enTranslationsJson as Record<string, string>;
const FIXED_EXPORTED_AT = new Date('2026-02-10T12:00:00.000Z');
const EXAMPLE_ATTACHMENT = 'Arztbrief vom 01.01.2026';
const PART1_DRAFT_ATTACHMENT = 'Teil 1: Antrag an die Krankenkasse (Entwurf)';
const PART2_OVERVIEW_PREFIX = 'Kurzüberblick zum Vorhaben';
const PATIENT_SIGNATURE_LABEL = 'Patient/in';

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
  it('always creates part 2', () => {
    const bundle = buildOfflabelAntragExportBundle({
      locale: 'de',
      documentModel: {
        request: {
          drug: '',
        },
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(bundle.part2).toBeDefined();
    expect(bundle.part3).toBeDefined();
    expect(bundle.part1.signatureBlocks).toEqual([
      {
        label: PATIENT_SIGNATURE_LABEL,
        name: 'Max Mustermann',
      },
    ]);
    expect(bundle.part1.subject).toContain('BITTE AUSWÄHLEN');
  });

  it('creates part 2 and references part 1', () => {
    const bundle = buildOfflabelAntragExportBundle({
      locale: 'de',
      documentModel: {},
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(bundle.part2).toBeDefined();
    expect(
      bundle.part2.bodyParagraphs.some((paragraph) =>
        paragraph.includes('Teil 1'),
      ),
    ).toBe(true);
    expect(bundle.part2.attachmentsItems[0]).toBe(PART1_DRAFT_ATTACHMENT);
  });

  it('keeps part 1 patient-only and builds part 3 content', () => {
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
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(bundle.part1.signatureBlocks).toEqual([
      {
        label: PATIENT_SIGNATURE_LABEL,
        name: 'Mara Beispiel',
      },
    ]);
    expect(
      bundle.part2.bodyParagraphs.some((paragraph) =>
        paragraph.includes(PART2_OVERVIEW_PREFIX),
      ),
    ).toBe(true);
    expect(bundle.part3.title).toContain('Teil 3');
  });

  it('parses attachments and references part 1 in part 2 attachments', () => {
    const bundle = buildOfflabelAntragExportBundle({
      locale: 'de',
      documentModel: {
        attachmentsFreeText: ' - Arztbrief vom 01.01.2026\n• Befundbericht\n\n',
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(bundle.part1.attachmentsItems[0]).toContain('Bewertung: Ivabradin');
    expect(bundle.part1.attachmentsItems[1]).toBe(EXAMPLE_ATTACHMENT);
    expect(bundle.part1.attachmentsItems).toContain(EXAMPLE_ATTACHMENT);
    expect(bundle.part1.attachmentsItems).toContain('Befundbericht');
    expect(bundle.part2.attachmentsItems[0]).toBe(PART1_DRAFT_ATTACHMENT);
    expect(bundle.part2.attachmentsItems[1]).toContain('Bewertung: Ivabradin');
    expect(bundle.part2.attachmentsItems[2]).toBe(EXAMPLE_ATTACHMENT);
    expect(bundle.part2.attachmentsItems).toContain(EXAMPLE_ATTACHMENT);
    expect(bundle.part2.attachmentsItems).toContain('Befundbericht');
    expect(bundle.part1.attachmentsItems.join(' | ')).not.toContain(
      'Rechtsprechung: LSG',
    );
    expect(bundle.part2.attachmentsItems.join(' | ')).not.toContain(
      'Rechtsprechung: LSG',
    );
  });

  it('adds only the selected drug expert source as attachment', () => {
    const bundle = buildOfflabelAntragExportBundle({
      locale: 'de',
      documentModel: {
        request: {
          drug: 'vortioxetine',
        },
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(bundle.part1.attachmentsItems).toContain(
      'Bewertung: Vortioxetin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025)',
    );
    expect(bundle.part1.attachmentsItems.join(' | ')).not.toContain(
      'Rechtsprechung: LSG Niedersachsen-Bremen',
    );
    expect(bundle.part1.attachmentsItems.join(' | ')).not.toContain(
      'Bewertung Ivabradin',
    );
    expect(bundle.part1.attachmentsItems.join(' | ')).not.toContain(
      'Bewertung Agomelatin',
    );
  });

  it('uses default fallback values', () => {
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
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(bundle.part2).toBeDefined();
    expect(bundle.part3).toBeDefined();
    expect(bundle.part1.senderLines[0]).toBe('Max Example');
    expect(bundle.part1.addresseeLines[0]).toBe('Example Health Insurance');
    expect(bundle.part1.subject).toContain('PLEASE SELECT');
  });

  it('parses attachment free text via exported helper', () => {
    expect(parseAttachments(' - Befund A\n• Befund B\n\n')).toEqual([
      'Befund A',
      'Befund B',
    ]);
    expect(parseAttachments(null)).toEqual([]);
  });

  it('builds part 1 letter via dedicated builder', () => {
    const letter = buildPart1KkLetter({
      locale: 'de',
      model: {
        request: { drug: 'agomelatin' },
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(letter.subject).toContain('Agomelatin');
    expect(letter.signatureBlocks).toEqual([
      { label: PATIENT_SIGNATURE_LABEL, name: 'Max Mustermann' },
    ]);
    expect(letter.bodyParagraphs.length).toBeGreaterThan(3);
  });

  it('builds part 2 doctor letter via dedicated builder', () => {
    const letter = buildPart2DoctorLetter({
      locale: 'de',
      model: {
        doctor: { name: 'Dr. Muster' },
        request: { drug: 'ivabradine' },
      },
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(letter.subject).toContain('Begleitschreiben');
    expect(
      letter.bodyParagraphs.some((paragraph) => paragraph.includes('Teil 1')),
    ).toBe(true);
    expect(letter.attachmentsItems[0]).toBe(PART1_DRAFT_ATTACHMENT);
  });
});
