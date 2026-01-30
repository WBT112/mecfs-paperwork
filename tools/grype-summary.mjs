import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'negligible'];

const isRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeSeverity = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  return SEVERITIES.includes(normalized) ? normalized : null;
};

const countSeverities = (matches) => {
  const counts = Object.fromEntries(SEVERITIES.map((level) => [level, 0]));
  matches.forEach((match) => {
    if (!isRecord(match)) return;
    const vulnerability = isRecord(match.vulnerability) ? match.vulnerability : null;
    const severity = normalizeSeverity(vulnerability?.severity);
    if (severity) {
      counts[severity] += 1;
    }
  });
  return counts;
};

const buildSummaryMarkdown = ({ counts, missing, parseError, reportPath }) => {
  const lines = ['## Grype SBOM scan'];
  if (missing) {
    lines.push('⚠️ Grype report not found.');
    return lines.join('\n');
  }
  if (parseError) {
    lines.push('⚠️ Unable to parse Grype report.');
    return lines.join('\n');
  }
  lines.push(`Report: \`${reportPath}\``);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  lines.push(`Vulnerabilities: **${total}**`);
  if (total === 0) {
    lines.push('No vulnerabilities reported.');
    return lines.join('\n');
  }
  lines.push('');
  lines.push('By severity:');
  SEVERITIES.forEach((severity) => {
    const count = counts[severity];
    if (count > 0) {
      lines.push(`- ${severity}: ${count}`);
    }
  });
  return lines.join('\n');
};

const parseArgs = (args) => {
  const options = {
    input: 'grype-sbom.json',
    output: 'grype-summary.md',
  };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--input') {
      const value = args[index + 1];
      if (value) {
        options.input = value;
        index += 1;
      }
      continue;
    }
    if (token === '--output') {
      const value = args[index + 1];
      if (value) {
        options.output = value;
        index += 1;
      }
    }
  }
  return options;
};

const readJsonIfExists = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { value: JSON.parse(content), error: null };
  } catch (error) {
    return { value: null, error };
  }
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), options.input);
  const { value, error } = await readJsonIfExists(inputPath);
  const counts = countSeverities(
    Array.isArray(value?.matches) ? value.matches : [],
  );
  const markdown = buildSummaryMarkdown({
    counts,
    missing: error?.code === 'ENOENT',
    parseError: Boolean(error) && error?.code !== 'ENOENT',
    reportPath: options.input,
  });
  const outputPath = path.resolve(process.cwd(), options.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdown);
};

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await run();
}

export { buildSummaryMarkdown, countSeverities, parseArgs };
