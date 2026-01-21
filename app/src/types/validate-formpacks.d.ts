declare module '*validate-formpacks.mjs' {
  export function collectTranslationKeys(
    value: unknown,
    keys: Set<string>,
  ): void;
  export function getTranslationKeySet(
    translations: Record<string, string> | undefined,
  ): Set<string>;
  export function getMissingKeys(
    expected: Set<string>,
    actual: Set<string>,
  ): string[];
}
