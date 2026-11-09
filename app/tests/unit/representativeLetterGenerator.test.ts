import { describe, expect, it } from 'vitest';
import {
  letterVariants,
  selectLetterVariants,
} from '../../src/features/representative-letter/variants';
import {
  generateRepresentativeLetter,
  type RepresentativeLetterGenerationInput,
} from '../../src/features/representative-letter/generator';

const createInput = (
  recipientName: string | null = null,
): RepresentativeLetterGenerationInput => ({
  variant: selectLetterVariants(undefined, () => 0),
  recipientName,
});

describe('representative letter generator', () => {
  it('personalizes only the greeting and preserves the selected complete plaintext', () => {
    const result = generateRepresentativeLetter(
      createInput('Dr. Beispiel & Co.'),
    );
    expect(result.subject).toBe(letterVariants.subjects[0].text);
    expect(result.body).toBe(
      letterVariants.bodies[0].text.replace(
        'Guten Tag,',
        'Guten Tag Dr. Beispiel & Co.,',
      ),
    );
  });

  it('preserves the neutral greeting without a selected recipient', () => {
    expect(generateRepresentativeLetter(createInput()).body).toBe(
      letterVariants.bodies[0].text,
    );
  });

  it('is deterministic for the same selection and recipient', () => {
    const input = createInput('Erika Beispiel');
    expect(generateRepresentativeLetter(input)).toEqual(
      generateRepresentativeLetter(input),
    );
  });
});
