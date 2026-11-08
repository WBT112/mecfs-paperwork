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
  recipientName: null,
  ...overrides,
});

describe('representative letter generator', () => {
  it('creates the complete approved letter without archived source blocks', () => {
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
    expect(result.body).toContain('Myalgischer Enzephalomyelitis (ME)');
    expect(
      result.body.match(/Myalgischer Enzephalomyelitis \(ME\)/gu),
    ).toHaveLength(1);
    expect(result.body).not.toContain('Myalgischer Enzephalomyelitis (ME/CFS)');
    expect(result.body).toContain('Post-Exertionelle Malaise (PEM)');
    expect(result.body).toContain('https://www.mecfs.de/');
    expect(result.body).toContain(
      'weiterhin als eigenständige Leistung mit eigenem Budget abrechenbar',
    );
    expect(result.body).not.toContain('Reizabschirmung');
    expect(result.body).toContain(representativeLetterContent.template.signOff);
    expect(result.body).not.toContain('Weiterführende Quellen:');
    for (const block of representativeLetterContent.personalBlocks) {
      expect(result.body).not.toContain(block.sourceText);
    }
    expect(result.body).not.toContain(
      representativeLetterContent.template.templateDisclosure,
    );
    for (const reference of representativeLetterContent.sourceReferences) {
      expect(result.body).not.toContain(`${reference.label}: ${reference.url}`);
    }
  });

  it('uses a neutral salutation without a selected recipient', () => {
    expect(generateRepresentativeLetter(createInput()).body).toContain(
      'Guten Tag,',
    );
  });

  it('is deterministic for the same minimal input', () => {
    const input = createInput({
      recipientName: 'Erika Beispiel',
    });

    expect(generateRepresentativeLetter(input)).toEqual(
      generateRepresentativeLetter(input),
    );
  });
});
