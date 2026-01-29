import { describe, expect, it } from 'vitest';
import {
  buildAuditMarkdown,
  buildHealthSummary,
  buildWarningsMarkdown,
  buildWarningsReport,
  classifyWarningLine,
  evaluatePolicies,
  parseInstallLog,
  summarizeAudit,
} from '../../../tools/npm-health.mjs';

type WarningType = 'deprecated' | 'peer' | 'engine' | 'other';
type WarningEntry = {
  type: WarningType;
  message: string;
};
type AuditSummary = {
  counts: Record<'low' | 'moderate' | 'high' | 'critical', number>;
  packages: Array<{
    name: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    title: string | null;
    fixAvailable: boolean;
  }>;
};

describe('npm health helpers', () => {
  const WARN_DEPRECATED = 'npm WARN deprecated foo';
  const WARN_DEPRECATED_LOG = 'npm WARN deprecated foo@1.0.0: old';
  const WARN_PEER = 'npm WARN ERESOLVE peer dep issue';
  const WARN_ENGINE = 'npm WARN EBADENGINE node';
  const WARN_OTHER = 'npm WARN something else';
  const LABEL_NPM_HEALTH = 'npm health';
  const LABEL_NPM_WARNINGS = 'npm WARN';
  it('classifies warning lines by type', () => {
    expect(classifyWarningLine(WARN_DEPRECATED)).toBe('deprecated');
    expect(classifyWarningLine(WARN_PEER)).toBe('peer');
    expect(classifyWarningLine(WARN_ENGINE)).toBe('engine');
    expect(classifyWarningLine(WARN_OTHER)).toBe('other');
  });

  it('parses npm install logs into warnings', () => {
    const log = [
      WARN_DEPRECATED_LOG,
      'info extra line',
      'npm WARN EBADENGINE node@99',
      'npm WARN peer dependency issue',
    ].join('\n');
    const warnings = parseInstallLog(log) as WarningEntry[];
    expect(warnings).toHaveLength(3);
    const report = buildWarningsReport(warnings);
    expect(report.total).toBe(3);
    expect(report.byType.deprecated).toBe(1);
    expect(report.byType.engine).toBe(1);
    expect(report.byType.peer).toBe(1);
  });

  it('builds warning markdown summaries', () => {
    const report = buildWarningsReport([
      { type: 'deprecated', message: WARN_DEPRECATED },
      { type: 'other', message: WARN_OTHER },
    ]);
    const markdown = buildWarningsMarkdown({
      report,
      missingLog: false,
      limit: 1,
    });
    expect(markdown).toContain('Total warnings: **2**');
    expect(markdown).toContain('deprecated: 1');
    expect(markdown).toContain('Top warnings:');
    const missing = buildWarningsMarkdown({
      report,
      missingLog: true,
      limit: 1,
    });
    expect(missing).toContain('npm-install.log not found');
    expect(missing).not.toContain(LABEL_NPM_WARNINGS);
  });

  it('summarizes npm audit metadata and packages', () => {
    const audit = {
      metadata: {
        vulnerabilities: { low: 1, moderate: 0, high: 1, critical: 0 },
      },
      vulnerabilities: {
        lodash: {
          severity: 'high',
          via: [{ title: 'Prototype pollution' }],
          fixAvailable: true,
        },
        minimatch: {
          severity: 'low',
          via: [{ title: 'DoS' }],
          fixAvailable: false,
        },
      },
    };
    const summary = summarizeAudit(audit) as AuditSummary;
    expect(summary.counts.high).toBe(1);
    expect(summary.packages[0].name).toBe('lodash');
    expect(summary.packages[0].title).toBe('Prototype pollution');
  });

  it('summarizes legacy audit advisories', () => {
    const audit = {
      advisories: {
        100: {
          module_name: 'legacy',
          severity: 'moderate',
          title: 'Legacy vuln',
          fix_available: true,
        },
      },
    };
    const summary = summarizeAudit(audit) as AuditSummary;
    expect(summary.counts.moderate).toBe(1);
    expect(summary.packages[0].name).toBe('legacy');
  });

  it('builds audit markdown summaries', () => {
    const summary: AuditSummary = {
      counts: { low: 0, moderate: 1, high: 0, critical: 0 },
      packages: [
        {
          name: 'legacy',
          severity: 'moderate',
          title: 'Legacy vuln',
          fixAvailable: true,
        },
      ],
    };
    const markdown = buildAuditMarkdown({
      summary,
      missingAudit: false,
      limit: 3,
    });
    expect(markdown).toContain('Vulnerabilities: **1**');
    expect(markdown).toContain('moderate: 1');
    expect(markdown).toContain('legacy (moderate)');
    const missing = buildAuditMarkdown({
      summary,
      missingAudit: true,
      limit: 3,
    });
    expect(missing).toContain('npm-audit.json not found');
  });

  it('evaluates policy outcomes and health summary', () => {
    const warningsReport = buildWarningsReport([
      { type: 'deprecated', message: 'npm WARN deprecated foo' },
      { type: 'other', message: 'npm WARN something' },
    ]);
    const auditSummary = summarizeAudit({
      metadata: {
        vulnerabilities: { low: 0, moderate: 0, high: 1, critical: 0 },
      },
      vulnerabilities: {},
    }) as AuditSummary;
    const policy = evaluatePolicies({
      warningsReport,
      auditSummary,
      warningsBudget: 1,
      failOnHigh: true,
    });
    expect(policy.warningsOverBudget).toBe(true);
    expect(policy.highFindings).toBe(true);
    expect(policy.shouldFail).toBe(true);
    const summary = buildHealthSummary({
      warningsMarkdown: 'warnings',
      auditMarkdown: 'audit',
      policy,
      warningsBudget: 1,
      failOnHigh: true,
    });
    expect(summary).toContain(LABEL_NPM_HEALTH);
    expect(summary).toContain('Warnings budget');
  });
});
