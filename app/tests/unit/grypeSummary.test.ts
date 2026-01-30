import { describe, expect, it } from 'vitest';
import {
  buildSummaryMarkdown,
  countSeverities,
  parseArgs,
} from '../../../tools/grype-summary.mjs';

describe('grype summary helpers', () => {
  const REPORT_PATH = 'grype.json';
  it('counts severities from matches', () => {
    const matches = [
      { vulnerability: { severity: 'High' } },
      { vulnerability: { severity: 'medium' } },
      { vulnerability: { severity: 'critical' } },
      { vulnerability: { severity: 'unknown' } },
      {},
    ];
    const counts = countSeverities(matches);
    expect(counts.high).toBe(1);
    expect(counts.medium).toBe(1);
    expect(counts.critical).toBe(1);
    expect(counts.low).toBe(0);
  });

  it('builds markdown summary for report', () => {
    const markdown = buildSummaryMarkdown({
      counts: {
        critical: 1,
        high: 0,
        medium: 2,
        low: 0,
        negligible: 0,
      },
      missing: false,
      parseError: false,
      reportPath: REPORT_PATH,
    });
    expect(markdown).toContain('Grype SBOM scan');
    expect(markdown).toContain('Vulnerabilities: **3**');
    expect(markdown).toContain('critical: 1');
    expect(markdown).toContain('medium: 2');
  });

  it('handles missing and parse error reports', () => {
    const missing = buildSummaryMarkdown({
      counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        negligible: 0,
      },
      missing: true,
      parseError: false,
      reportPath: REPORT_PATH,
    });
    expect(missing).toContain('report not found');
    const parseError = buildSummaryMarkdown({
      counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        negligible: 0,
      },
      missing: false,
      parseError: true,
      reportPath: REPORT_PATH,
    });
    expect(parseError).toContain('Unable to parse Grype report');
  });

  it('parses arguments', () => {
    const parsed = parseArgs(['--input', 'in.json', '--output', 'out.md']);
    expect(parsed.input).toBe('in.json');
    expect(parsed.output).toBe('out.md');
  });
});
