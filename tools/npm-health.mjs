import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const WARNING_TYPES = ['deprecated', 'peer', 'engine', 'other'];
const DEFAULT_WARNINGS_BUDGET = 5;
const DEFAULT_TOP_LIMIT = 5;
const SEVERITY_ORDER = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
};

const isRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeSeverity = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  return normalized in SEVERITY_ORDER ? normalized : null;
};

const classifyWarningLine = (line) => {
  if (/deprecated/i.test(line)) return 'deprecated';
  if (/ERESOLVE|peer/i.test(line)) return 'peer';
  if (/EBADENGINE|engine/i.test(line)) return 'engine';
  return 'other';
};

const parseInstallLog = (content) => {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  return lines
    .map((line) => line.trim())
    .filter((line) => /^npm\s+warn\b/i.test(line))
    .map((line) => ({
      type: classifyWarningLine(line),
      message: line,
    }));
};

const buildWarningsReport = (warnings) => {
  const byType = Object.fromEntries(
    WARNING_TYPES.map((type) => [type, 0]),
  );
  warnings.forEach((warning) => {
    if (warning.type in byType) {
      byType[warning.type] += 1;
      return;
    }
    byType.other += 1;
  });
  return {
    total: warnings.length,
    byType,
    warnings,
  };
};

const buildWarningsMarkdown = ({ report, missingLog, limit }) => {
  const lines = ['## npm install warnings'];
  if (missingLog) {
    lines.push('⚠️ npm-install.log not found.');
    return lines.join('\n');
  }
  lines.push(`Total warnings: **${report.total}**`);
  if (report.total === 0) {
    lines.push('No npm WARN lines detected.');
    return lines.join('\n');
  }
  lines.push('');
  lines.push('By type:');
  WARNING_TYPES.forEach((type) => {
    const count = report.byType[type];
    if (count > 0) {
      lines.push(`- ${type}: ${count}`);
    }
  });
  const topWarnings = report.warnings.slice(0, limit);
  if (topWarnings.length > 0) {
    lines.push('');
    lines.push('Top warnings:');
    topWarnings.forEach((warning) => {
      lines.push(`- ${warning.message}`);
    });
  }
  return lines.join('\n');
};

const getViaTitle = (via) => {
  if (Array.isArray(via)) {
    const withTitle = via.find(
      (entry) => isRecord(entry) && typeof entry.title === 'string',
    );
    if (withTitle) {
      return withTitle.title;
    }
  } else if (isRecord(via) && typeof via.title === 'string') {
    return via.title;
  }
  return null;
};

const summarizeAudit = (audit) => {
  const counts = {
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
  };

  const hasMetadataCounts = isRecord(audit?.metadata?.vulnerabilities);
  if (hasMetadataCounts) {
    Object.keys(counts).forEach((key) => {
      const value = audit.metadata.vulnerabilities[key];
      counts[key] = Number.isFinite(value) ? Number(value) : 0;
    });
  }

  const packages = new Map();

  if (isRecord(audit?.vulnerabilities)) {
    Object.entries(audit.vulnerabilities).forEach(([name, vuln]) => {
      if (!isRecord(vuln)) return;
      const severity = normalizeSeverity(vuln.severity) ?? 'low';
      const current = packages.get(name);
      const next = {
        name,
        severity,
        title: getViaTitle(vuln.via),
        fixAvailable: Boolean(vuln.fixAvailable),
      };
      if (!current) {
        packages.set(name, next);
        return;
      }
      if (SEVERITY_ORDER[severity] > SEVERITY_ORDER[current.severity]) {
        packages.set(name, next);
      }
    });
  } else if (isRecord(audit?.advisories)) {
    Object.values(audit.advisories).forEach((advisory) => {
      if (!isRecord(advisory)) return;
      const name =
        typeof advisory.module_name === 'string' ? advisory.module_name : null;
      if (!name) return;
      const normalizedSeverity = normalizeSeverity(advisory.severity);
      const severity = normalizedSeverity ?? 'low';
      const current = packages.get(name);
      const next = {
        name,
        severity,
        title: typeof advisory.title === 'string' ? advisory.title : null,
        fixAvailable: Boolean(advisory.fix_available),
      };
      if (!current) {
        packages.set(name, next);
      } else if (SEVERITY_ORDER[severity] > SEVERITY_ORDER[current.severity]) {
        packages.set(name, next);
      }
      if (!hasMetadataCounts && normalizedSeverity) {
        counts[normalizedSeverity] += 1;
      }
    });
  }

  if (!hasMetadataCounts && isRecord(audit?.vulnerabilities)) {
    Object.values(audit.vulnerabilities).forEach((vuln) => {
      if (!isRecord(vuln)) return;
      const severity = normalizeSeverity(vuln.severity);
      if (severity && severity in counts) {
        counts[severity] += 1;
      }
    });
  }

  const topPackages = [...packages.values()].sort((a, b) => {
    const orderDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });

  return {
    counts,
    packages: topPackages,
  };
};

const buildAuditMarkdown = ({ summary, missingAudit, limit }) => {
  const lines = ['## npm audit'];
  if (missingAudit) {
    lines.push('⚠️ npm-audit.json not found.');
    return lines.join('\n');
  }
  const total =
    summary.counts.low +
    summary.counts.moderate +
    summary.counts.high +
    summary.counts.critical;
  lines.push(`Vulnerabilities: **${total}**`);
  if (total === 0) {
    lines.push('No vulnerabilities reported.');
    return lines.join('\n');
  }
  lines.push('');
  lines.push('By severity:');
  Object.entries(summary.counts).forEach(([severity, count]) => {
    if (count > 0) {
      lines.push(`- ${severity}: ${count}`);
    }
  });
  const topPackages = summary.packages.slice(0, limit);
  if (topPackages.length > 0) {
    lines.push('');
    lines.push('Top affected packages:');
    topPackages.forEach((entry) => {
      const suffix = entry.title ? ` — ${entry.title}` : '';
      const fix = entry.fixAvailable ? ' (fix available)' : '';
      lines.push(`- ${entry.name} (${entry.severity})${suffix}${fix}`);
    });
  }
  return lines.join('\n');
};

const evaluatePolicies = ({
  warningsReport,
  auditSummary,
  warningsBudget,
  failOnHigh,
}) => {
  const warningsOverBudget =
    typeof warningsBudget === 'number' && warningsReport.total > warningsBudget;
  const highFindings =
    auditSummary.counts.high + auditSummary.counts.critical > 0;
  const shouldFail = warningsOverBudget || (failOnHigh && highFindings);
  return {
    warningsOverBudget,
    highFindings,
    shouldFail,
  };
};

const buildHealthSummary = ({
  warningsMarkdown,
  auditMarkdown,
  policy,
  warningsBudget,
  failOnHigh,
}) => {
  const lines = [
    '# npm health',
    '',
    warningsMarkdown,
    '',
    auditMarkdown,
    '',
    '## Policy',
    `Warnings budget: ${warningsBudget} (${policy.warningsOverBudget ? 'exceeded' : 'ok'})`,
    `Fail on high/critical vulnerabilities: ${
      failOnHigh ? 'enabled' : 'disabled'
    }`,
  ];
  if (policy.highFindings && !failOnHigh) {
    lines.push('⚠️ High/critical vulnerabilities detected (report-only).');
  }
  if (policy.shouldFail) {
    lines.push('❌ npm health policy failed.');
  }
  return lines.join('\n');
};

const parseArgs = (args) => {
  const result = {
    installLog: 'npm-install.log',
    auditJson: 'npm-audit.json',
    outputDir: '.',
    warningsBudget: DEFAULT_WARNINGS_BUDGET,
    failOnHigh: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--install-log') {
      result.installLog = args[index + 1] ?? result.installLog;
      index += 1;
      continue;
    }
    if (token === '--audit-json') {
      result.auditJson = args[index + 1] ?? result.auditJson;
      index += 1;
      continue;
    }
    if (token === '--output-dir') {
      result.outputDir = args[index + 1] ?? result.outputDir;
      index += 1;
      continue;
    }
    if (token === '--warnings-budget') {
      const parsed = Number.parseInt(args[index + 1] ?? '', 10);
      if (Number.isFinite(parsed)) {
        result.warningsBudget = parsed;
      }
      index += 1;
      continue;
    }
    if (token === '--fail-on-high') {
      result.failOnHigh = true;
    }
  }
  if (process.env.NPM_WARNINGS_BUDGET) {
    const parsed = Number.parseInt(process.env.NPM_WARNINGS_BUDGET, 10);
    if (Number.isFinite(parsed)) {
      result.warningsBudget = parsed;
    }
  }
  if (process.env.NPM_AUDIT_FAIL_HIGH === 'true') {
    result.failOnHigh = true;
  }
  return result;
};

const readFileIfExists = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { content, error: null };
  } catch (error) {
    return { content: null, error };
  }
};

const readJsonIfExists = async (filePath) => {
  const { content, error } = await readFileIfExists(filePath);
  if (!content) {
    return { value: null, error };
  }
  try {
    return { value: JSON.parse(content), error: null };
  } catch (parseError) {
    return { value: null, error: parseError };
  }
};

const writeOutput = async (outputDir, filename, content) => {
  await fs.mkdir(outputDir, { recursive: true });
  const target = path.join(outputDir, filename);
  await fs.writeFile(target, content);
  return target;
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  const installLogPath = path.resolve(process.cwd(), options.installLog);
  const auditJsonPath = path.resolve(process.cwd(), options.auditJson);
  const outputDir = path.resolve(process.cwd(), options.outputDir);

  const { content: installLog } = await readFileIfExists(installLogPath);
  const warnings = parseInstallLog(installLog ?? '');
  const warningsReport = buildWarningsReport(warnings);

  const { value: auditData } = await readJsonIfExists(auditJsonPath);
  const auditSummary = summarizeAudit(auditData ?? {});

  const warningsMarkdown = buildWarningsMarkdown({
    report: warningsReport,
    missingLog: !installLog,
    limit: DEFAULT_TOP_LIMIT,
  });
  const auditMarkdown = buildAuditMarkdown({
    summary: auditSummary,
    missingAudit: !auditData,
    limit: DEFAULT_TOP_LIMIT,
  });

  const policy = evaluatePolicies({
    warningsReport,
    auditSummary,
    warningsBudget: options.warningsBudget,
    failOnHigh: options.failOnHigh,
  });

  const healthSummary = buildHealthSummary({
    warningsMarkdown,
    auditMarkdown,
    policy,
    warningsBudget: options.warningsBudget,
    failOnHigh: options.failOnHigh,
  });

  await writeOutput(
    outputDir,
    'npm-warnings.json',
    JSON.stringify(warningsReport, null, 2),
  );
  await writeOutput(outputDir, 'npm-warnings.md', warningsMarkdown);
  await writeOutput(
    outputDir,
    'npm-audit-summary.md',
    auditMarkdown,
  );
  await writeOutput(outputDir, 'npm-health-summary.md', healthSummary);

  if (policy.shouldFail) {
    process.exitCode = 1;
  }
};

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await run();
}

export {
  buildHealthSummary,
  buildWarningsMarkdown,
  buildWarningsReport,
  buildAuditMarkdown,
  classifyWarningLine,
  evaluatePolicies,
  parseInstallLog,
  summarizeAudit,
};
