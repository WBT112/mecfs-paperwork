import { letterVariants, type LetterVariantSelection } from './variants';

/** Values used by the deterministic plain-text letter generator. */
export type RepresentativeLetterGenerationInput = {
  recipientName: string | null;
  variant: LetterVariantSelection;
};

/** Generated values rendered as separate copy/paste fields. */
type GeneratedRepresentativeLetter = {
  subject: string;
  body: string;
};

/**
 * Creates a deterministic plain-text subject and complete mail body.
 *
 * @param input - Current validated variant selection and optional recipient.
 * @returns Separate subject and body strings without technical placeholders.
 * @remarks Only the bundled approved variants are rendered. Selection is
 * validated by the session-state boundary before reaching this function.
 */
export const generateRepresentativeLetter = (
  input: RepresentativeLetterGenerationInput,
): GeneratedRepresentativeLetter => {
  const { variant, recipientName } = input;
  const salutation = recipientName
    ? `Guten Tag ${recipientName},`
    : 'Guten Tag,';
  const subject = letterVariants.subjects.find(
    ({ id }) => id === variant.subjectId,
  )!;
  const body = letterVariants.bodies.find(({ id }) => id === variant.bodyId)!;
  return {
    subject: subject.text,
    body: body.text.replace('Guten Tag,', salutation),
  };
};
