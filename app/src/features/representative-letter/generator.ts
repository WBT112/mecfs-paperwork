import type {
  RepresentativeLetterContentBlock,
  RepresentativeLetterContentCatalog,
} from './data/letterContent';
import type { RepresentativeLetterBodyLength } from './model';

/** Values used by the deterministic plain-text letter generator. */
export type RepresentativeLetterGenerationInput = {
  catalog: RepresentativeLetterContentCatalog;
  bodyLength: RepresentativeLetterBodyLength;
  recipientName: string | null;
  severityId: string | null;
  severityVariantId: string;
  careStatusId: string | null;
  careStatusVariantId: string;
  includePersonalDetailsInShortBody: boolean;
  includeConstituencyStatement: boolean;
  customExperience: string;
  customRequest: string;
};

/** Generated values rendered as separate copy/paste fields. */
export type GeneratedRepresentativeLetter = {
  subject: string;
  body: string;
};

const SAFE_BLOCK_TEXT: Readonly<Record<string, string>> = {
  'severity-mild-1':
    'Ich bin leicht an ME erkrankt. Das klingt harmlos, bedeutet aber, dass ich meine Aktivität etwa um die Hälfte reduzieren musste. Haushalt, Freizeit und Kontakte habe ich weitgehend aufgegeben. Jede Hilfe, die mir Energie spart, schützt mich davor, dauerhaft schwerer zu erkranken.',
  'severity-moderate-1':
    'Ich bin moderat an ME erkrankt und überwiegend an meine Wohnung gebunden. Duschen, Kochen oder ein Arztbesuch kosten mich so viel, dass ich danach oft tagelang liege. Ich bin auf meine Pflegeperson angewiesen. Fällt diese Person aus, springt bisher jemand ein, der mich kennt und weiß, wie viel ich vertrage.',
  'severity-severe-2':
    'Ich kann meine Wohnung nicht verlassen. Beim Essen, bei der Körperpflege und bei Medikamenten bin ich auf Hilfe angewiesen. Bisher konnten wir eine vertraute Person bezahlen, wenn meine Pflegeperson krank war, einen Termin hatte oder selbst nicht mehr konnte. Fällt diese Möglichkeit weg, bleibt mir nur Hilfe, die ich nicht vertrage.',
  'severity-very-severe-1':
    'Ich bin sehr schwer an ME erkrankt. Ich bin vollständig bettlägerig, kann oft nicht sprechen, nicht aufrecht sitzen und nicht selbstständig essen. Jeder fremde Mensch im Zimmer, jedes Geräusch und jeder Transport kann meinen Zustand dauerhaft verschlechtern. Die Menschen, die mich pflegen, sind nicht austauschbar.',
  'care-level-1-1':
    'Ich habe Pflegegrad 1. Diese Hilfe spart mir genau die Energie, die mich vor einer Verschlechterung schützt. Nach dem Gesetzentwurf entfällt der Entlastungsbetrag in Pflegegrad 1, das neue Sozialraumbudget gibt es erst ab Pflegegrad 2.',
  'care-level-2-1':
    'Ich habe Pflegegrad 2. Meine Pflegeperson versorgt mich zu Hause. Über die Verhinderungspflege konnten wir bisher eine vertraute Person bezahlen, wenn meine Pflegeperson selbst Termine hatte oder krank war. Künftig soll diese private Vertretung aus dem Entlastungsbudget bezahlt werden, das an die Stelle des Pflegegeldes tritt. Jede Stunde Vertretung geht dann von dem Geld ab, das unseren Alltag trägt.',
  'care-level-3-1':
    'Ich habe Pflegegrad 3 und bin den Großteil des Tages auf Hilfe angewiesen. Diese Hilfe kommt fast vollständig von meiner Pflegeperson. Die Verhinderungspflege ist die einzige Leistung, die ausdrücklich dafür da ist, dass meine pflegende Person auch einmal ausfallen darf. Fällt sie als eigener Anspruch weg, wird jede Pause zur Frage, ob wir sie uns leisten können.',
  'care-level-4-2':
    'Mit Pflegegrad 4 brauche ich bei fast allem Hilfe. Meine Pflegeperson pflegt mich und ist selbst an der Grenze. Die Verhinderungspflege macht diese Pflege durchhaltbar: einige Stunden, in denen jemand da ist, dem ich vertraue. Ohne sie steigt das Risiko, dass meine pflegende Person selbst krank wird und meine Versorgung zusammenbricht.',
};

const normalizeCustomText = (value: string): string =>
  value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();

const resolveBlockText = (block: RepresentativeLetterContentBlock): string =>
  SAFE_BLOCK_TEXT[block.id] ?? block.sourceText;

const findBlock = (
  catalog: RepresentativeLetterContentCatalog,
  category: RepresentativeLetterContentBlock['category'],
  selectionId: string | null,
  variantId: string,
): RepresentativeLetterContentBlock | null => {
  if (!selectionId) {
    return null;
  }
  return (
    catalog.personalBlocks.find(
      (block) =>
        block.category === category &&
        block.selectionId === selectionId &&
        block.variantId === variantId,
    ) ?? null
  );
};

const createPersonalParagraphs = (
  input: RepresentativeLetterGenerationInput,
): string[] => {
  const severity = findBlock(
    input.catalog,
    'severity',
    input.severityId,
    input.severityVariantId,
  );
  const care = findBlock(
    input.catalog,
    'care',
    input.careStatusId,
    input.careStatusVariantId,
  );
  return [
    input.includeConstituencyStatement ? 'Ich lebe in Ihrem Wahlkreis.' : '',
    severity ? resolveBlockText(severity) : '',
    care ? resolveBlockText(care) : '',
    normalizeCustomText(input.customExperience),
  ].filter(Boolean);
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
 * Creates a deterministic plain-text subject and mail body.
 *
 * @param input - Approved catalog, recipient, and explicit user selections.
 * @returns Separate subject and body strings without technical placeholders.
 * @remarks The function never infers a gender, care status, severity, or
 * personal circumstance. Bracket alternatives in the archived source are
 * resolved only through conservative, predefined wording.
 */
export const generateRepresentativeLetter = (
  input: RepresentativeLetterGenerationInput,
): GeneratedRepresentativeLetter => {
  const { catalog } = input;
  const salutation = input.recipientName
    ? `Guten Tag ${input.recipientName},`
    : 'Guten Tag,';
  const personalParagraphs = createPersonalParagraphs(input);
  const includePersonal =
    input.bodyLength === 'long' || input.includePersonalDetailsInShortBody;
  const customRequest = normalizeCustomText(input.customRequest);
  const paragraphs = [
    salutation,
    ...catalog.template.opening,
    ...(includePersonal ? personalParagraphs : []),
    createRequestParagraph(catalog),
    ...(includePersonal && customRequest ? [customRequest] : []),
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

/**
 * Returns the selectable blocks for one personal category and selection.
 *
 * @param catalog - Approved content catalog.
 * @param category - Severity or care category.
 * @param selectionId - Selected severity or care-status identifier.
 * @returns Blocks in their catalog order, or an empty list for no selection.
 */
export const getRepresentativeLetterVariants = (
  catalog: RepresentativeLetterContentCatalog,
  category: RepresentativeLetterContentBlock['category'],
  selectionId: string | null,
): RepresentativeLetterContentBlock[] =>
  selectionId
    ? catalog.personalBlocks.filter(
        (block) =>
          block.category === category && block.selectionId === selectionId,
      )
    : [];

/**
 * Creates safe preview text for one approved source block.
 *
 * @param block - Source block selected for preview.
 * @returns The same placeholder-free text used by the generator.
 */
export const createRepresentativeLetterBlockPreview = (
  block: RepresentativeLetterContentBlock,
): string => resolveBlockText(block);
