export type SbomSummary = {
  format: string;
  total: number;
  ecosystems: Map<string, number>;
  packages: string[];
};

export type SbomReport = {
  label: string;
  summary: SbomSummary;
  missing: boolean;
  parseError: boolean;
};

export type SbomMarkdownOptions = {
  reports: SbomReport[];
  generatedAt: string;
  sha: string | null;
  topLimit: number;
};

export type SbomReportOptions = {
  label: string;
  summary: SbomSummary;
  missing: boolean;
  parseError: boolean;
  topLimit: number;
};

declare module '../../../tools/sbom-summary.mjs' {
  export const buildSbomMarkdown: (options: SbomMarkdownOptions) => string;
  export const buildReportSection: (options: SbomReportOptions) => string[];
  export const buildTopPackages: (packages: string[], limit: number) => string[];
  export const normalizeEcosystems: (
    ecosystems: Map<string, number>,
  ) => Array<[string, number]>;
  export const parseArgs: (args: string[]) => {
    inputs: string[];
    output: string;
    topLimit: number;
  };
  export const parsePurlType: (purl: string | null) => string | null;
  export const summarizeCycloneDx: (bom: unknown) => SbomSummary;
  export const summarizeSpdx: (bom: unknown) => SbomSummary;
}
