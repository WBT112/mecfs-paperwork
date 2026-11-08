import type { RepresentativeLetterContentCatalog } from './data/letterContent';
import { letterVariants, type LetterVariantSelection } from './variants';

/** Values used by the deterministic plain-text letter generator. */
export type RepresentativeLetterGenerationInput = {
  catalog: RepresentativeLetterContentCatalog;
  recipientName: string | null;
  variant?: LetterVariantSelection;
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

/**
 * Creates a deterministic plain-text subject and complete mail body.
 *
 * @param input - Approved catalog and optional recipient.
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
  if (input.variant) {
    const subject = letterVariants.subjects.find(
      ({ id }) => id === input.variant!.subjectId,
    )!;
    const body = letterVariants.bodies.find(
      ({ id }) => id === input.variant!.bodyId,
    )!;
    return {
      subject: subject.text,
      body: body.text.replace('Guten Tag,', salutation),
    };
  }
  const paragraphs = [
    salutation,
    ...catalog.template.opening,
    createRequestParagraph(catalog),
    catalog.template.responseRequest,
    catalog.template.signOff,
  ];

  return {
    subject: catalog.subject,
    body: paragraphs.join('\n\n'),
  };
};
