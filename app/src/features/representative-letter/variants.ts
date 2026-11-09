import rawVariants from './data/letter-variants.de.json';

/** Approved German plaintext variants, shared by both interface locales. */
export const letterVariants = rawVariants;

/** Version of the uniform selection algorithm with direct repeat exclusion. */
const LETTER_VARIANT_ALGORITHM_VERSION = 1;

/** Versioned IDs stored only in the current tab's sessionStorage. */
export type LetterVariantSelection = {
  catalogVersion: string;
  algorithmVersion: number;
  subjectId: string;
  bodyId: string;
};

const selectionAt = (
  subjectIndex: number,
  bodyIndex: number,
): LetterVariantSelection => ({
  catalogVersion: letterVariants.contentVersion,
  algorithmVersion: LETTER_VARIANT_ALGORITHM_VERSION,
  subjectId: letterVariants.subjects[subjectIndex].id,
  bodyId: letterVariants.bodies[bodyIndex].id,
});

/**
 * Checks whether saved IDs belong to the current catalog and algorithm.
 * @param value - Untrusted tab-local selection.
 * @returns Whether the selection is usable without migration.
 */
export const isLetterVariantSelection = (
  value: unknown,
): value is LetterVariantSelection => {
  if (typeof value !== 'object' || value === null) return false;
  const selection = value as Partial<LetterVariantSelection>;
  return (
    selection.catalogVersion === letterVariants.contentVersion &&
    selection.algorithmVersion === LETTER_VARIANT_ALGORITHM_VERSION &&
    letterVariants.subjects.some(({ id }) => id === selection.subjectId) &&
    letterVariants.bodies.some(({ id }) => id === selection.bodyId)
  );
};

/**
 * Selects two independent uniform variants, or a uniform different pair.
 * @param previous - Current pair to exclude on a deliberate refresh.
 * @param random - Controllable random source returning values in [0, 1).
 * @returns A current catalog selection without patient or search data.
 * @remarks Algorithm v1 samples a flattened 30 by 30 grid when refreshing and
 * skips the previous pair, avoiding retries even with a constant random source.
 */
export const selectLetterVariants = (
  previous?: LetterVariantSelection,
  random: () => number = Math.random,
): LetterVariantSelection => {
  const subjectCount = letterVariants.subjects.length;
  const bodyCount = letterVariants.bodies.length;
  if (!previous || !isLetterVariantSelection(previous)) {
    return selectionAt(
      Math.floor(random() * subjectCount),
      Math.floor(random() * bodyCount),
    );
  }
  const previousIndex =
    letterVariants.subjects.findIndex(({ id }) => id === previous.subjectId) *
      bodyCount +
    letterVariants.bodies.findIndex(({ id }) => id === previous.bodyId);
  const sampled = Math.floor(random() * (subjectCount * bodyCount - 1));
  const index = sampled >= previousIndex ? sampled + 1 : sampled;
  return selectionAt(Math.floor(index / bodyCount), index % bodyCount);
};
