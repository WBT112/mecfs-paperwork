import { describe, expect, it } from 'vitest';
import {
  getRepresentativeLetterContent,
  representativeLetterContent,
} from '../../src/features/representative-letter/data/letterContent';

describe('representative letter content catalog', () => {
  it('contains all approved source blocks with unique identifiers', () => {
    const identifiers = new Set(
      representativeLetterContent.personalBlocks.map(({ id }) => id),
    );

    expect(representativeLetterContent.personalBlocks).toHaveLength(20);
    expect(identifiers.size).toBe(20);
    expect(representativeLetterContent.approval).toMatchObject({
      status: 'approved-as-provided',
      sourceIssue: 553,
    });
  });

  it('keeps one approved language across both interface locales', () => {
    expect(getRepresentativeLetterContent('de')).toBe(
      representativeLetterContent,
    );
    expect(getRepresentativeLetterContent('en')).toBe(
      representativeLetterContent,
    );
    expect(representativeLetterContent.contentLanguage).toBe('de');
  });

  it('covers all severity and care selections without conflating states', () => {
    const selections = representativeLetterContent.personalBlocks.map(
      ({ category, selectionId, variantId }) =>
        `${category}:${selectionId}:${variantId}`,
    );

    expect(selections).toContain('care:none:1');
    expect(selections).toContain('care:pending:1');
    expect(selections).not.toContain('care:none:2');
    expect(
      selections.filter((selection) => selection.startsWith('severity:')),
    ).toHaveLength(8);
    expect(
      selections.filter((selection) => selection.startsWith('care:')),
    ).toHaveLength(12);
  });
});
