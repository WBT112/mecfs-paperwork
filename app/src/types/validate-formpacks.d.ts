declare module '*validate-formpacks.mjs' {
  export function isRecord(value: unknown): boolean;
  export function isSafeAssetPath(value: unknown): boolean;
  export function setPathValue(
    target: Record<string, unknown>,
    pathValue: string,
    value: unknown,
  ): void;
  export function setNested(
    target: Record<string, unknown>,
    dottedKey: string,
    value: unknown,
  ): void;
  export function getNested(
    target: unknown,
    dottedKey: string,
  ): Record<string, unknown> | undefined;
  export function buildI18nContext(
    translations: Record<string, string> | undefined,
    prefix?: string,
  ): { t: Record<string, unknown> };
  export function buildDummyContext(
    mapping: unknown,
    translations: Record<string, string> | undefined,
  ): Record<string, unknown>;
  export function buildAdditionalJsContext(
    tContext: Record<string, unknown> | undefined,
  ): {
    t: (key?: unknown) => string;
    formatDate: (v?: unknown) => string;
    formatPhone: (v?: unknown) => string;
  };
  export function collectErrors(
    errors: Map<string, Array<{ contextPath: string; error: Error }>>,
    formpackId: string,
    contextPath: string,
    error: unknown,
  ): void;
  export function validateManifest(
    manifest: unknown,
    formpackId: string,
    manifestPath: string,
    errors: Map<string, Array<{ contextPath: string; error: Error }>>,
  ): boolean;
  export function readJson(filePath: string): Promise<unknown>;
  export function parseArgs(args: string[]): { id: string | null };
  export function listFormpacks(onlyId?: string | null): Promise<string[]>;
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
  export function validateExample(schema: unknown, example: unknown): string[];
  export function validateTemplate(options: {
    templatePath: string;
    mappingPath: string;
    formpackId: string;
    errors: Map<string, Array<{ contextPath: string; error: Error }>>;
    translations?: Record<string, string>;
    warnings?: Map<string, Array<{ contextPath: string; error: Error }>>;
  }): Promise<void>;
  export function validateContract(options: {
    formpackId: string;
    errors: Map<string, Array<{ contextPath: string; error: Error }>>;
  }): Promise<{
    manifest?: unknown;
    translations?: Record<string, string> | undefined;
  }>;
  export function createLogger(stream: { write: (s: string) => void }): {
    log: (m: string) => void;
    info: (m: string) => void;
    pass: (m: string) => void;
    fail: (m: string) => void;
    warn: (m: string) => void;
    group: (m: string) => void;
    groupEnd: () => void;
  };
  export function run(): Promise<void>;
}
