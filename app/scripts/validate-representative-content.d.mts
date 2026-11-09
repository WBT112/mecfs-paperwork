import type { letterVariants } from '../src/features/representative-letter/variants';

/**
 * Validates the active plaintext catalog without changing its contents.
 * @param value - Untrusted parsed catalog.
 * @returns The catalog with its validated current structure.
 * @throws If schema, approval metadata, or variant content is invalid.
 */
export function validateRepresentativeContent(
  value: unknown,
): typeof letterVariants;
