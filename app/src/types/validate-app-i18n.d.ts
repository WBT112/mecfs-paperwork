declare module '*validate-app-i18n.mjs' {
  export function isRecord(value: unknown): boolean;
  export function collectStringLeafKeys(
    value: unknown,
    out: Set<string>,
    prefix?: string,
  ): void;
  export function getTranslationKeySet(translations: unknown): Set<string>;
  export function getMissingKeys(
    expected: Set<string>,
    actual: Set<string>,
  ): string[];
  export function validateResourceParity(options: {
    de: unknown;
    en: unknown;
  }): {
    deKeys: Set<string>;
    enKeys: Set<string>;
    missingInDe: string[];
    missingInEn: string[];
  };
  export function readJson(filePath: string): Promise<unknown>;
  export function run(): Promise<void>;
}
