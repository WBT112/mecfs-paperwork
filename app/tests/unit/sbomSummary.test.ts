import { describe, expect, it } from 'vitest';
import {
  buildSbomMarkdown,
  parsePurlType,
  summarizeCycloneDx,
  summarizeSpdx,
} from '../../../tools/sbom-summary.mjs';

describe('sbom summary helpers', () => {
  const NPM_REACT_PURL = 'pkg:npm/react@18.2.0';
  const NPM_VITE_PURL = 'pkg:npm/vite@4.0.0';
  it('parses purl types', () => {
    expect(parsePurlType(NPM_REACT_PURL)).toBe('npm');
    expect(parsePurlType('pkg:maven/com.example/app@1.0.0')).toBe('maven');
    expect(parsePurlType('')).toBeNull();
    expect(parsePurlType(null)).toBeNull();
  });

  it('summarizes CycloneDX packages', () => {
    const bom = {
      bomFormat: 'CycloneDX',
      metadata: {
        component: { name: 'app', purl: 'pkg:npm/app@1.0.0' },
      },
      components: [
        { name: 'react', purl: NPM_REACT_PURL },
        { name: 'vite', purl: NPM_VITE_PURL },
        { name: 'lib', purl: 'pkg:maven/com.example/lib@1.0.0' },
        { name: 'unknown' },
      ],
    };
    const summary = summarizeCycloneDx(bom);
    expect(summary.total).toBe(5);
    expect(summary.ecosystems.get('npm')).toBe(3);
    expect(summary.ecosystems.get('maven')).toBe(1);
    expect(summary.ecosystems.get('unknown')).toBe(1);
  });

  it('summarizes SPDX packages', () => {
    const sbom = {
      spdxVersion: 'SPDX-2.3',
      packages: [
        {
          name: 'react',
          packageExternalReferences: [
            {
              referenceType: 'purl',
              referenceLocator: NPM_REACT_PURL,
            },
          ],
        },
        {
          packageName: 'vite',
          externalRefs: [
            {
              referenceType: 'purl',
              referenceLocator: NPM_VITE_PURL,
            },
          ],
        },
        { name: 'unknown' },
      ],
    };
    const summary = summarizeSpdx(sbom);
    expect(summary.total).toBe(3);
    expect(summary.ecosystems.get('npm')).toBe(2);
    expect(summary.ecosystems.get('unknown')).toBe(1);
  });

  it('builds SBOM markdown summary', () => {
    const summary = summarizeCycloneDx({
      bomFormat: 'CycloneDX',
      components: [{ name: 'react', purl: NPM_REACT_PURL }],
    });
    const markdown = buildSbomMarkdown({
      reports: [
        {
          label: 'sbom.cdx.json',
          summary,
          missing: false,
          parseError: false,
        },
      ],
      generatedAt: '2024-01-01T00:00:00.000Z',
      sha: 'abc123',
      topLimit: 5,
    });
    expect(markdown).toContain('# SBOM summary');
    expect(markdown).toContain('Commit: `abc123`');
    expect(markdown).toContain('Packages: **1**');
    expect(markdown).toContain('Ecosystems:');
  });
});
