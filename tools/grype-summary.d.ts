export type GrypeCounts = Record<
  'critical' | 'high' | 'medium' | 'low' | 'negligible',
  number
>;

export type GrypeSummaryOptions = {
  counts: GrypeCounts;
  missing: boolean;
  parseError: boolean;
  reportPath: string;
};

declare module '../../../tools/grype-summary.mjs' {
  export const buildSummaryMarkdown: (options: GrypeSummaryOptions) => string;
  export const countSeverities: (matches: unknown[]) => GrypeCounts;
  export const parseArgs: (args: string[]) => {
    input: string;
    output: string;
  };
  export const readJsonIfExists: (
    filePath: string,
  ) => Promise<{ value: unknown; error: unknown }>;
}
