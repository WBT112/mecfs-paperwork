import { describe, expect, it } from 'vitest';
import {
  letterVariants,
  isLetterVariantSelection,
  selectLetterVariants,
} from '../../src/features/representative-letter/variants';
import { generateRepresentativeLetter } from '../../src/features/representative-letter/generator';
import { representativeLetterContent } from '../../src/features/representative-letter/data/letterContent';
import { createMailtoLink } from '../../src/features/representative-letter/mailto';

describe('approved representative letter variants', () => {
  it('contains exactly 30 distinct complete plaintext subjects and bodies', () => {
    for (const variants of [letterVariants.subjects, letterVariants.bodies]) {
      expect(variants).toHaveLength(30);
      expect(new Set(variants.map(({ id }) => id)).size).toBe(30);
      expect(new Set(variants.map(({ text }) => text)).size).toBe(30);
      for (const { text } of variants) {
        expect(text).not.toMatch(
          /(?:^|\n)#{1,6} |\*\*|__|```|\[[^\]]+\]\(|<[^>]+>|\{\{|subject-\d|body-\d/u,
        );
      }
    }
    expect(letterVariants.approval.sourceRevision).toBe(2);
    for (const { text } of letterVariants.bodies) {
      for (const invariant of [
        /Myalgisch/u,
        /Enzephalomyelitis/u,
        /neuroimmunologisch/u,
        /Post-Exertionell/u,
        /PEM/u,
        /körperlich/u,
        /geistig/u,
        /sensorisch/u,
        /Verhinderungspflege/u,
        /Budget/u,
        /stundenweis/u,
        /Privatperson/u,
        /Ersatzpflege|[Dd]iese Hilfe (?:zu Hause|im eigenen Zuhause)/u,
        /131 Euro/u,
        /Pflegegrad/u,
        /[Ss]chwellen/u,
        /wissenschaftlich/u,
        /https:\/\/www\.mecfs\.de\//u,
      ]) {
        expect(text).toMatch(invariant);
      }
      expect(text.startsWith('Guten Tag,\n\n')).toBe(true);
      expect(text.endsWith('Mit freundlichen Grüßen')).toBe(true);
    }
  });

  it('reaches all 900 independent pairs with controlled uniform random draws', () => {
    const pairs = new Set<string>();
    for (let subject = 0; subject < 30; subject++) {
      for (let body = 0; body < 30; body++) {
        const draws = [(subject + 0.5) / 30, (body + 0.5) / 30];
        const selection = selectLetterVariants(undefined, () => draws.shift()!);
        expect(selection.subjectId).toBe(letterVariants.subjects[subject].id);
        expect(selection.bodyId).toBe(letterVariants.bodies[body].id);
        pairs.add(`${selection.subjectId}/${selection.bodyId}`);
        const letter = generateRepresentativeLetter({
          catalog: representativeLetterContent,
          recipientName: 'Erika Beispiel',
          variant: selection,
        });
        expect(letter.subject).toBe(letterVariants.subjects[subject].text);
        expect(letter.body).toBe(
          letterVariants.bodies[body].text.replace(
            'Guten Tag,',
            'Guten Tag Erika Beispiel,',
          ),
        );
        const mailto = createMailtoLink({
          recipient: 'example@example.invalid',
          recipientStatus: 'verified',
          subject: letter.subject,
          body: letter.body,
        });
        expect(mailto?.bodyIncluded).toBe(true);
        const url = new URL(mailto!.href);
        expect(url.searchParams.get('subject')).toBe(letter.subject);
        expect(url.searchParams.get('body')).toBe(
          letter.body.replaceAll('\n', '\r\n'),
        );
      }
    }
    expect(pairs.size).toBe(900);
  });

  it.each([0, 0.5, 0.999999])(
    'refreshes uniformly without direct repeats from random value %s',
    (draw) => {
      const previous = selectLetterVariants(undefined, () => draw);
      const alternatives = new Set<string>();
      for (let index = 0; index < 899; index++) {
        const next = selectLetterVariants(previous, () => (index + 0.5) / 899);
        expect(next).not.toEqual(previous);
        alternatives.add(`${next.subjectId}/${next.bodyId}`);
      }
      expect(alternatives.size).toBe(899);
    },
  );

  it('keeps the approved neutral greeting without a recipient', () => {
    const variant = selectLetterVariants(undefined, () => 0);
    expect(
      generateRepresentativeLetter({
        catalog: representativeLetterContent,
        recipientName: null,
        variant,
      }).body,
    ).toBe(letterVariants.bodies[0].text);
  });

  it('discards stale selections before sampling', () => {
    const next = selectLetterVariants(
      { ...selectLetterVariants(), catalogVersion: 'obsolete' },
      () => 0,
    );
    expect(next).toEqual(selectLetterVariants(undefined, () => 0));
  });

  it.each([
    null,
    undefined,
    1,
    'invalid',
    {},
    { catalogVersion: 'old' },
    { ...selectLetterVariants(), algorithmVersion: -1 },
    { ...selectLetterVariants(), subjectId: 'unknown' },
    { ...selectLetterVariants(), bodyId: 'unknown' },
  ])('rejects invalid or stale IDs: %j', (value) => {
    expect(isLetterVariantSelection(value)).toBe(false);
  });
});
