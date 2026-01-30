import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_TOP_LIMIT = 20;

const isRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parsePurlType = (purl) => {
  if (typeof purl !== 'string') return null;
  const match = /^pkg:([^/]+)/.exec(purl.trim());
  return match ? match[1] : null;
};

const createSummary = (format) => ({
  format,
  total: 0,
  ecosystems: new Map(),
  packages: [],
});

const addPackage = (summary, { name, purlType }) => {
  summary.total += 1;
  if (typeof name === 'string') {
    summary.packages.push(name);
  }
  const ecosystem = purlType ?? 'unknown';
  summary.ecosystems.set(
    ecosystem,
    (summary.ecosystems.get(ecosystem) ?? 0) + 1,
  );
};

const summarizeCycloneDx = (bom) => {
  const summary = createSummary('CycloneDX');
  if (!isRecord(bom)) {
    return summary;
  }
  const components = Array.isArray(bom.components) ? bom.components : [];
  const metadataComponent = isRecord(bom.metadata?.component)
    ? bom.metadata.component
    : null;
  const allComponents = metadataComponent
    ? [metadataComponent, ...components]
    : components;
  allComponents.forEach((component) => {
    if (!isRecord(component)) return;
    addPackage(summary, {
      name: typeof component.name === 'string' ? component.name : null,
      purlType: parsePurlType(component.purl),
    });
  });
  return summary;
};

const getSpdxPackageName = (pkg) => {
  if (!isRecord(pkg)) return null;
  if (typeof pkg.name === 'string') return pkg.name;
  if (typeof pkg.packageName === 'string') return pkg.packageName;
  return null;
};

const getSpdxPackagePurl = (pkg) => {
  if (!isRecord(pkg)) return null;
  const refs = Array.isArray(pkg.packageExternalReferences)
    ? pkg.packageExternalReferences
    : Array.isArray(pkg.externalRefs)
      ? pkg.externalRefs
      : [];
  for (const ref of refs) {
    if (!isRecord(ref)) continue;
    if (ref.referenceType === 'purl' && typeof ref.referenceLocator === 'string') {
      return ref.referenceLocator;
    }
  }
  return null;
};

const summarizeSpdx = (bom) => {
  const summary = createSummary('SPDX');
  if (!isRecord(bom)) {
    return summary;
  }
  const packages = Array.isArray(bom.packages) ? bom.packages : [];
  packages.forEach((pkg) => {
    if (!isRecord(pkg)) return;
    addPackage(summary, {
      name: getSpdxPackageName(pkg),
      purlType: parsePurlType(getSpdxPackagePurl(pkg)),
    });
  });
  return summary;
};

const normalizeEcosystems = (ecosystems) =>
  [...ecosystems.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

const buildTopPackages = (packages, limit) =>
  [...new Set(packages)]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);

const buildReportSection = ({ label, summary, missing, parseError, topLimit }) => {
  const lines = [`## ${label}`];
  if (missing) {
    lines.push('⚠️ SBOM file not found.');
    return lines;
  }
  if (parseError) {
    lines.push('⚠️ Unable to parse SBOM data.');
    return lines;
  }
  lines.push(`Format: ${summary.format}`);
  lines.push(`Packages: **${summary.total}**`);
  const ecosystems = normalizeEcosystems(summary.ecosystems);
  if (ecosystems.length > 0) {
    lines.push('');
    lines.push('Ecosystems:');
    ecosystems.forEach(([name, count]) => {
      lines.push(`- ${name}: ${count}`);
    });
  }
  const topPackages = buildTopPackages(summary.packages, topLimit);
  if (topPackages.length > 0) {
    lines.push('');
    lines.push(`Top ${topPackages.length} packages:`);
    topPackages.forEach((pkg) => {
      lines.push(`- ${pkg}`);
    });
  }
  return lines;
};

const buildSbomMarkdown = ({ reports, generatedAt, sha, topLimit }) => {
  const lines = ['# SBOM summary', '', `Generated: ${generatedAt}`];
  if (sha) {
    lines.push(`Commit: \`${sha}\``);
  }
  reports.forEach((report) => {
    lines.push('');
    lines.push(
      ...buildReportSection({
        label: report.label,
        summary: report.summary,
        missing: report.missing,
        parseError: report.parseError,
        topLimit,
      }),
    );
  });
  return lines.join('\n');
};

const parseArgs = (args) => {
  const options = {
    inputs: [],
    output: 'sbom-summary.md',
    topLimit: DEFAULT_TOP_LIMIT,
  };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--input') {
      const value = args[index + 1];
      if (value) {
        options.inputs.push(value);
        index += 1;
      }
      continue;
    }
    if (token === '--output') {
      const value = args[index + 1];
      if (value && !value.startsWith('--')) {
        options.output = value;
        index += 1;
      }
      continue;
    }
    if (token === '--top') {
      const value = args[index + 1];
      if (value && !value.startsWith('--')) {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          options.topLimit = parsed;
        }
        index += 1;
      }
      continue;
    }
  }
  return options;
};

const readJsonFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { value: JSON.parse(content), error: null };
  } catch (error) {
    return { value: null, error };
  }
};

const summarizeSbomData = (data) => {
  if (isRecord(data) && typeof data.bomFormat === 'string') {
    return summarizeCycloneDx(data);
  }
  if (isRecord(data) && typeof data.spdxVersion === 'string') {
    return summarizeSpdx(data);
  }
  return createSummary('Unknown');
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.inputs.length === 0) {
    throw new Error('No SBOM inputs provided.');
  }
  const reports = [];
  for (const input of options.inputs) {
    const resolvedPath = path.resolve(process.cwd(), input);
    const label = path.basename(input);
    const { value, error } = await readJsonFile(resolvedPath);
    if (!value) {
      reports.push({
        label,
        summary: createSummary('Unknown'),
        missing: error?.code === 'ENOENT',
        parseError: error?.code !== 'ENOENT',
      });
      continue;
    }
    reports.push({
      label,
      summary: summarizeSbomData(value),
      missing: false,
      parseError: false,
    });
  }
  const markdown = buildSbomMarkdown({
    reports,
    generatedAt: new Date().toISOString(),
    sha: process.env.GITHUB_SHA ?? null,
    topLimit: options.topLimit,
  });
  const outputPath = path.resolve(process.cwd(), options.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdown);
};

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await run();
}

export {
  buildSbomMarkdown,
  buildReportSection,
  buildTopPackages,
  normalizeEcosystems,
  parseArgs,
  parsePurlType,
  summarizeCycloneDx,
  summarizeSpdx,
};
