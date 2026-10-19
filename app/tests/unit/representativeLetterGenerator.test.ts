import { describe, expect, it } from 'vitest';
import { representativeLetterContent } from '../../src/features/representative-letter/data/letterContent';
import {
  createRepresentativeLetterBlockPreview,
  generateRepresentativeLetter,
  getRepresentativeLetterVariants,
  type RepresentativeLetterGenerationInput,
} from '../../src/features/representative-letter/generator';

const createInput = (
  overrides: Partial<RepresentativeLetterGenerationInput> = {},
): RepresentativeLetterGenerationInput => ({
  catalog: representativeLetterContent,
  bodyLength: 'short',
  recipientName: null,
  severityId: null,
  severityVariantId: '1',
  careStatusId: null,
  careStatusVariantId: '1',
  includePersonalDetailsInShortBody: false,
  includeConstituencyStatement: false,
  customExperience: '',
  customRequest: '',
  ...overrides,
});

describe('representative letter generator', () => {
  it('creates a complete short letter without optional personal details', () => {
    const result = generateRepresentativeLetter(
      createInput({
        recipientName: 'Dr. Beispiel & Co.',
        severityId: 'mild',
        careStatusId: 'level-1',
        includeConstituencyStatement: true,
        customExperience: '  Eigene Erfahrung  ',
        customRequest: 'Eigene Bitte',
      }),
    );

    expect(result.subject).toBe(representativeLetterContent.subject);
    expect(result.body).toContain('Guten Tag Dr. Beispiel & Co.,');
    expect(result.body).toContain(
      representativeLetterContent.template.requestHeading,
    );
    expect(result.body).not.toContain('Ich lebe in Ihrem Wahlkreis.');
    expect(result.body).not.toContain('Eigene Erfahrung');
    expect(result.body).not.toContain('Eigene Bitte');
    expect(result.body).not.toContain('Weiterführende Quellen:');
    expect(result.body).not.toContain('[');
  });

  it('includes every explicitly selected detail in the long form', () => {
    const result = generateRepresentativeLetter(
      createInput({
        bodyLength: 'long',
        severityId: 'moderate',
        severityVariantId: '1',
        careStatusId: 'pending',
        includeConstituencyStatement: true,
        customExperience: '  Zeile 1\r\nZeile 2\r ',
        customRequest: '  Meine zusätzliche Bitte.  ',
      }),
    );

    expect(result.body).toContain('Guten Tag,');
    expect(result.body).toContain('Ich lebe in Ihrem Wahlkreis.');
    expect(result.body).toContain('meine Pflegeperson');
    expect(result.body).toContain('Mein Antrag auf einen Pflegegrad läuft.');
    expect(result.body).toContain('Zeile 1\nZeile 2');
    expect(result.body).toContain('Meine zusätzliche Bitte.');
    expect(result.body).toContain('Weiterführende Quellen:');
    for (const reference of representativeLetterContent.sourceReferences) {
      expect(result.body).toContain(`${reference.label}: ${reference.url}`);
    }
    expect(result.body).toContain(
      representativeLetterContent.template.templateDisclosure,
    );
  });

  it('adds selected personal text to the short form only after opt-in', () => {
    const result = generateRepresentativeLetter(
      createInput({
        severityId: 'severe',
        severityVariantId: '2',
        careStatusId: 'level-2',
        careStatusVariantId: '2',
        includePersonalDetailsInShortBody: true,
        customExperience: 'Persönlicher Absatz',
        customRequest: 'Persönliche Bitte',
      }),
    );

    expect(result.body).toContain('Ich kann meine Wohnung nicht verlassen.');
    expect(result.body).toContain('Ich habe Pflegegrad 2.');
    expect(result.body).toContain('Persönlicher Absatz');
    expect(result.body).toContain('Persönliche Bitte');
  });

  it('keeps no-care-grade and pending-application statements separate', () => {
    const withoutGrade = generateRepresentativeLetter(
      createInput({ bodyLength: 'long', careStatusId: 'none' }),
    ).body;
    const pending = generateRepresentativeLetter(
      createInput({ bodyLength: 'long', careStatusId: 'pending' }),
    ).body;

    expect(withoutGrade).toContain('Ich habe noch keinen Pflegegrad');
    expect(withoutGrade).not.toContain(
      'Mein Antrag auf einen Pflegegrad läuft',
    );
    expect(pending).toContain('Mein Antrag auf einen Pflegegrad läuft');
    expect(pending).not.toContain('Ich habe noch keinen Pflegegrad');
  });

  it('generates placeholder-free output for all 20 approved blocks', () => {
    for (const block of representativeLetterContent.personalBlocks) {
      const selection =
        block.category === 'severity'
          ? {
              severityId: block.selectionId,
              severityVariantId: block.variantId,
            }
          : {
              careStatusId: block.selectionId,
              careStatusVariantId: block.variantId,
            };
      const body = generateRepresentativeLetter(
        createInput({ bodyLength: 'long', ...selection }),
      ).body;
      const preview = createRepresentativeLetterBlockPreview(block);

      expect(body).toContain(preview);
      expect(body).not.toMatch(/\[[^\]]+\]/u);
      expect(preview).not.toMatch(/\[[^\]]+\]/u);
    }
  });

  it('deterministically processes every severity and care variant combination', () => {
    const severityBlocks = representativeLetterContent.personalBlocks.filter(
      ({ category }) => category === 'severity',
    );
    const careBlocks = representativeLetterContent.personalBlocks.filter(
      ({ category }) => category === 'care',
    );
    const severities = [null, ...severityBlocks];
    const careStatuses = [null, ...careBlocks];

    for (const severity of severities) {
      for (const care of careStatuses) {
        const input = createInput({
          bodyLength: 'long',
          severityId: severity?.selectionId ?? null,
          severityVariantId: severity?.variantId ?? '1',
          careStatusId: care?.selectionId ?? null,
          careStatusVariantId: care?.variantId ?? '1',
        });
        const first = generateRepresentativeLetter(input);
        const second = generateRepresentativeLetter(input);

        expect(second).toEqual(first);
        if (severity) {
          expect(first.body).toContain(
            createRepresentativeLetterBlockPreview(severity),
          );
        }
        if (care) {
          expect(first.body).toContain(
            createRepresentativeLetterBlockPreview(care),
          );
        }
      }
    }
  });

  it('omits invalid or absent selections without falling back implicitly', () => {
    const result = generateRepresentativeLetter(
      createInput({
        bodyLength: 'long',
        severityId: 'mild',
        severityVariantId: 'unknown',
        careStatusId: null,
        customExperience: '\r\n',
        customRequest: ' ',
      }),
    );

    expect(result.body).not.toContain('Ich bin leicht an ME erkrankt.');
    expect(result.body).not.toContain('undefined');
  });

  it('returns variants only for the requested category and selection', () => {
    expect(
      getRepresentativeLetterVariants(
        representativeLetterContent,
        'severity',
        'mild',
      ).map(({ id }) => id),
    ).toEqual(['severity-mild-1', 'severity-mild-2']);
    expect(
      getRepresentativeLetterVariants(
        representativeLetterContent,
        'care',
        null,
      ),
    ).toEqual([]);
  });
});
