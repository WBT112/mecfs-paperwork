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
  export type AuditPackageSummary = {
    name: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    title: string | null;
    fixAvailable: boolean;
  };
  export type AuditSummary = {
    counts: Record<'low' | 'moderate' | 'high' | 'critical', number>;
    packages: AuditPackageSummary[];
  };
  export type PolicyResult = {
    warningsOverBudget: boolean;
    highFindings: boolean;
    shouldFail: boolean;
  };

  export function classifyWarningLine(line: string): WarningType;
  export function parseInstallLog(content: string): WarningEntry[];
  export function buildWarningsReport(warnings: WarningEntry[]): WarningsReport;
  export function buildWarningsMarkdown(options: {
    report: WarningsReport;
    missingLog: boolean;
    limit: number;
  }): string;
  export function summarizeAudit(audit: unknown): AuditSummary;
  export function buildAuditMarkdown(options: {
    summary: AuditSummary;
    missingAudit: boolean;
    limit: number;
  }): string;
  export function evaluatePolicies(options: {
    warningsReport: WarningsReport;
    auditSummary: AuditSummary;
    warningsBudget?: number;
    failOnHigh: boolean;
  }): PolicyResult;
  export function buildHealthSummary(options: {
    warningsMarkdown: string;
    auditMarkdown: string;
    policy: PolicyResult;
    warningsBudget: number;
    failOnHigh: boolean;
  }): string;
}
