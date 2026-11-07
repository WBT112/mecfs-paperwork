import type { RepresentativeLetterContentCatalog } from './data/letterContent';
import type { RepresentativeLetterBodyLength } from './model';

/** Values used by the deterministic plain-text letter generator. */
export type RepresentativeLetterGenerationInput = {
  catalog: RepresentativeLetterContentCatalog;
  bodyLength: RepresentativeLetterBodyLength;
  recipientName: string | null;
};

/** Generated values rendered as separate copy/paste fields. */
export type GeneratedRepresentativeLetter = {
  subject: string;
  body: string;
};

const createRequestParagraph = (
  catalog: RepresentativeLetterContentCatalog,
): string =>
  [
    catalog.template.requestHeading,
    ...catalog.template.requests.map((request) => `- ${request}`),
  ].join('\n');

const createReferencesParagraph = (
  catalog: RepresentativeLetterContentCatalog,
): string =>
  [
    'Weiterführende Quellen:',
    ...catalog.sourceReferences.map(({ label, url }) => `- ${label}: ${url}`),
  ].join('\n');

/**
 * Creates a deterministic plain-text subject and complete mail body.
 *
 * @param input - Approved catalog, optional recipient, and selected length.
 * @returns Separate subject and body strings without technical placeholders.
 * @remarks The generator deliberately accepts no health, severity, or care
 * details. Archived personal source blocks are therefore never included.
 */
export const generateRepresentativeLetter = (
  input: RepresentativeLetterGenerationInput,
): GeneratedRepresentativeLetter => {
  const { catalog } = input;
  const salutation = input.recipientName
    ? `Guten Tag ${input.recipientName},`
    : 'Guten Tag,';
  const paragraphs = [
    salutation,
    ...catalog.template.opening,
    createRequestParagraph(catalog),
    catalog.template.responseRequest,
    ...(input.bodyLength === 'long'
      ? [
          createReferencesParagraph(catalog),
          catalog.template.templateDisclosure,
        ]
      : []),
    catalog.template.signOff,
  ];

  return {
    subject: catalog.subject,
    body: paragraphs.join('\n\n'),
  };
};
