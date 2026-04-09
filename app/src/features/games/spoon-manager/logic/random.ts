let timestampFallbackCounter = 0;

/**
 * Creates a deterministic pseudo-random number generator from a seed string.
 *
 * @remarks
 * RATIONALE: Spoon Manager must support stable E2E seeds without storing a
 * mutable RNG instance in React state. The generator is cheap enough to derive
 * per turn or per selection step from the current state.
 *
 * @param seed - Stable seed text.
 * @returns Function that yields values between 0 inclusive and 1 exclusive.
 */
export const createSeededRandom = (seed: string): (() => number) => {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.codePointAt(index) ?? 0;
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Creates a shareable day seed when the URL does not provide one.
 *
 * @remarks
 * SECURITY: This seed only scopes local game variation and shareable URLs. It
 * must not be used for authentication, secrets, or encryption. We prefer Web
 * Crypto and fall back to a monotonic timestamp-based identifier when crypto is
 * unavailable, which keeps the seed generator free of weak PRNG APIs.
 *
 * @returns A locally generated non-sensitive seed string.
 */
export const createRandomSeed = (): string => {
  const crypto = globalThis.crypto as Crypto | undefined;

  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }

  const timestamp = Date.now().toString(36);
  const counter = (timestampFallbackCounter++ % 1_679_616).toString(36);

  return `seed-${timestamp}-${counter.padStart(4, '0')}`;
};

/**
 * Picks one value from a list using the provided random source.
 *
 * @param values - Candidate values.
 * @param random - Random number source in the range `[0, 1)`.
 * @returns One value from the list.
 * @throws Error when the list is empty.
 */
export const pickOne = <T>(values: readonly T[], random: () => number): T => {
  if (values.length === 0) {
    throw new Error('Cannot pick from an empty list.');
  }

  return values[Math.floor(random() * values.length)];
};

/**
 * Returns a shuffled copy of a list.
 *
 * @param values - Values to shuffle.
 * @param random - Random number source in the range `[0, 1)`.
 * @returns Shuffled copy of the input list.
 */
export const shuffle = <T>(values: readonly T[], random: () => number): T[] => {
  const nextValues = [...values];

  for (let index = nextValues.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextValues[index], nextValues[swapIndex]] = [
      nextValues[swapIndex],
      nextValues[index],
    ];
  }

  return nextValues;
};
