declare module '../../../tools/npm-health.mjs' {
  export type WarningType = 'deprecated' | 'peer' | 'engine' | 'other';
  export type WarningEntry = {
    type: WarningType;
    message: string;
  };
  export type WarningsReport = {
    total: number;
    byType: Record<WarningType, number>;
    warnings: WarningEntry[];
  };
  export type AuditSeverity = 'low' | 'moderate' | 'high' | 'critical';
  export type AuditPackageSummary = {
    name: string;
    severity: AuditSeverity;
    title: string | null;
    fixAvailable: boolean;
  };
  export type AuditSummary = {
    counts: Record<AuditSeverity, number>;
    packages: AuditPackageSummary[];
  };
  export type BuildWarningsMarkdownInput = {
    report: WarningsReport;
    missingLog: boolean;
    limit: number;
  };
  export type BuildAuditMarkdownInput = {
    summary: AuditSummary;
    missingAudit: boolean;
    limit: number;
  };
  export type EvaluatePoliciesInput = {
    warningsReport: WarningsReport;
    auditSummary: AuditSummary;
    warningsBudget: number;
    failOnHigh: boolean;
  };
  export type HealthPolicy = {
    warningsOverBudget: boolean;
    highFindings: boolean;
    shouldFail: boolean;
  };
  export type BuildHealthSummaryInput = {
    warningsMarkdown: string;
    auditMarkdown: string;
    policy: HealthPolicy;
    warningsBudget: number;
    failOnHigh: boolean;
  };

  export function classifyWarningLine(line: string): WarningType;
  export function parseInstallLog(content: string): WarningEntry[];
  export function buildWarningsReport(warnings: WarningEntry[]): WarningsReport;
  export function buildWarningsMarkdown(
    input: BuildWarningsMarkdownInput,
  ): string;
  export function summarizeAudit(audit: unknown): AuditSummary;
  export function buildAuditMarkdown(input: BuildAuditMarkdownInput): string;
  export function evaluatePolicies(input: EvaluatePoliciesInput): HealthPolicy;
  export function buildHealthSummary(input: BuildHealthSummaryInput): string;
}
