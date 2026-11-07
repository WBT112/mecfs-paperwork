import { describe, expect, it } from 'vitest';
import { representativeLetterContent } from '../../src/features/representative-letter/data/letterContent';
import {
  generateRepresentativeLetter,
  type RepresentativeLetterGenerationInput,
} from '../../src/features/representative-letter/generator';

const createInput = (
  overrides: Partial<RepresentativeLetterGenerationInput> = {},
): RepresentativeLetterGenerationInput => ({
  catalog: representativeLetterContent,
  bodyLength: 'short',
  recipientName: null,
  ...overrides,
});

describe('representative letter generator', () => {
  it('creates a complete short letter without health-related source blocks', () => {
    const result = generateRepresentativeLetter(
      createInput({ recipientName: 'Dr. Beispiel & Co.' }),
    );

    expect(result.subject).toBe(representativeLetterContent.subject);
    expect(result.body).toContain('Guten Tag Dr. Beispiel & Co.,');
    expect(result.body).toContain(
      representativeLetterContent.template.requestHeading,
    );
    expect(result.body).toContain(
      representativeLetterContent.template.responseRequest,
    );
    expect(result.body).toContain(representativeLetterContent.template.signOff);
    expect(result.body).not.toContain('Weiterführende Quellen:');
    for (const block of representativeLetterContent.personalBlocks) {
      expect(result.body).not.toContain(block.sourceText);
    }
  });

  it('adds references and the disclosure only to the long form', () => {
    const result = generateRepresentativeLetter(
      createInput({ bodyLength: 'long' }),
    );

    expect(result.body).toContain('Guten Tag,');
    expect(result.body).toContain('Weiterführende Quellen:');
    for (const reference of representativeLetterContent.sourceReferences) {
      expect(result.body).toContain(`${reference.label}: ${reference.url}`);
    }
    expect(result.body).toContain(
      representativeLetterContent.template.templateDisclosure,
    );
  });

  it('is deterministic for the same minimal input', () => {
    const input = createInput({
      bodyLength: 'long',
      recipientName: 'Erika Beispiel',
    });

    expect(generateRepresentativeLetter(input)).toEqual(
      generateRepresentativeLetter(input),
    );
  });
});
