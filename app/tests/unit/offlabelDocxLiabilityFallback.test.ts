// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapDocumentDataToTemplate } from '../../src/export/docx';
import type { DocumentModel } from '../../src/formpacks/documentModel';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

const EMPTY_SCHEMA: RJSFSchema = {
  type: 'object',
  properties: {},
};

const EMPTY_UI_SCHEMA: UiSchema = {};

const BASE_DOCUMENT_DATA: DocumentModel = {
  diagnosisParagraphs: [],
  person: { name: null, birthDate: null },
  contacts: [],
  diagnoses: { formatted: null },
  symptoms: null,
  medications: [],
  allergies: null,
  doctor: { name: null, phone: null },
  arzt: {
    senderLines: [],
    addresseeLines: [],
    dateLine: '',
    subject: '',
    paragraphs: ['Teil 2 Absatz'],
    attachmentsHeading: '',
    attachments: [],
    signatureBlocks: [],
    liabilityHeading: 'Haftungsausschluss (vom Patienten zu unterzeichnen)',
    liabilityParagraphs: ['Ich erkläre hiermit, dass ich aufgeklärt wurde.'],
    liabilityDateLine: '21.02.2026',
    liabilitySignerName: 'Max Mustermann',
  },
};

describe('offlabel DOCX liability fallback', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        version: 1,
        fields: [{ var: 'person.name', path: 'person.name' }],
        loops: [{ var: 'arzt.paragraphs', path: 'arzt.paragraphs' }],
      }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('embeds liability content into part 2 paragraphs when mapping has no dedicated liability paths', async () => {
    const context = await mapDocumentDataToTemplate(
      'offlabel-antrag',
      'a4',
      BASE_DOCUMENT_DATA,
      {
        locale: 'de',
        mappingPath: 'docx/mapping.json',
        schema: EMPTY_SCHEMA,
        uiSchema: EMPTY_UI_SCHEMA,
      },
    );

    const part2Paragraphs = (context.arzt as Record<string, unknown>)
      .paragraphs as string[];

    expect(part2Paragraphs).toContain(
      'Haftungsausschluss (vom Patienten zu unterzeichnen)',
    );
    expect(part2Paragraphs).toContain(
      'Ich erkläre hiermit, dass ich aufgeklärt wurde.',
    );
    expect(part2Paragraphs.join('\n')).not.toContain(
      'Name Patient/in: Max Mustermann',
    );
    expect(part2Paragraphs.join('\n')).not.toContain(
      'Unterschrift: ____________________',
    );
    expect(part2Paragraphs.join('\n')).not.toContain('Datum: 21.02.2026');
  });
});
