import { isRecord } from '../../lib/utils';

const BULLET_WRAP_WIDTH = 58;
const HINT_WRAP_WIDTH = 74;
const LINE_WARNING_THRESHOLD = 22;
const ITEM_WARNING_THRESHOLD = 9;
const CHARACTER_WARNING_THRESHOLD = 900;
const LONG_HINT_THRESHOLD = 220;

type PacingCardTextFieldKey = 'canDo' | 'needHelp' | 'hint';

type PacingCardLike = Partial<Record<PacingCardTextFieldKey, unknown>>;

const asTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const asStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => asTrimmedString(entry)).filter(Boolean);
};

const estimateWrappedLineCount = (text: string, wrapWidth: number): number => {
  if (text.length === 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(text.length / wrapWidth));
};

const estimateBulletLines = (items: string[]): number =>
  items.reduce(
    (total, item) => total + estimateWrappedLineCount(item, BULLET_WRAP_WIDTH),
    0,
  );

/**
 * Result of the pacing-card page-fit heuristic.
 */
export interface PacingCardPageOverflowAssessment {
  /**
   * Estimated number of text lines consumed by the variable content.
   */
  readonly estimatedLines: number;
  /**
   * Total number of non-empty bullet items across both list sections.
   */
  readonly totalItems: number;
  /**
   * Total number of non-whitespace characters across lists and hint.
   */
  readonly totalCharacters: number;
  /**
   * Whether the card is likely to overflow a single A4 page in the PDF layout.
   */
  readonly shouldWarn: boolean;
}

/**
 * Estimates whether a pacing card is likely to exceed one PDF page.
 *
 * @param cardData - Current card payload from form data.
 * @returns Heuristic metrics plus the final warning decision.
 * @remarks
 * RATIONALE: The PDF layout has a fixed title/image/header block, so the
 * remaining vertical space is dominated by the number and length of list items
 * plus the optional hint. The UI should warn early before users invest time in
 * text that will likely not fit on a single A4 page.
 */
export const assessPacingCardPageOverflow = (
  cardData: unknown,
): PacingCardPageOverflowAssessment => {
  const card = (isRecord(cardData) ? cardData : {}) as PacingCardLike;
  const canDo = asStringList(card.canDo);
  const needHelp = asStringList(card.needHelp);
  const hint = asTrimmedString(card.hint);
  const sections = [canDo, needHelp];
  const sectionCount = sections.filter((entries) => entries.length > 0).length;
  const totalItems = canDo.length + needHelp.length;
  const totalCharacters =
    canDo.join('').length + needHelp.join('').length + hint.length;
  const estimatedLines =
    sectionCount +
    estimateBulletLines(canDo) +
    estimateBulletLines(needHelp) +
    estimateWrappedLineCount(hint, HINT_WRAP_WIDTH);

  return {
    estimatedLines,
    totalItems,
    totalCharacters,
    shouldWarn:
      totalItems >= ITEM_WARNING_THRESHOLD ||
      estimatedLines >= LINE_WARNING_THRESHOLD ||
      totalCharacters >= CHARACTER_WARNING_THRESHOLD ||
      hint.length >= LONG_HINT_THRESHOLD,
  };
};
