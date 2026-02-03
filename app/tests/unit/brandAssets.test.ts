import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

type FileSpec = {
  filename: string;
  label: string;
};

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testDir, '../..');
const publicDir = path.join(appRoot, 'public');
const requiredAssets: FileSpec[] = [
  { filename: 'favicon.ico', label: 'favicon ico' },
  { filename: 'favicon-16x16.png', label: 'favicon 16' },
  { filename: 'favicon-32x32.png', label: 'favicon 32' },
  { filename: 'apple-touch-icon.png', label: 'apple touch icon' },
  { filename: 'android-chrome-192x192.png', label: 'android chrome 192' },
  { filename: 'android-chrome-512x512.png', label: 'android chrome 512' },
  { filename: 'social-share-1200x630.png', label: 'social share' },
  { filename: 'site.webmanifest', label: 'web manifest' },
];

describe('brand assets', () => {
  beforeAll(async () => {
    const { run } = await import('../../scripts/generate-brand-assets');
    await run();
  });

  it('keeps the index metadata aligned with generated assets', async () => {
    const indexHtml = await readFile(path.join(appRoot, 'index.html'), 'utf-8');

    expect(indexHtml).toContain('/favicon.ico');
    expect(indexHtml).toContain('/favicon-32x32.png');
    expect(indexHtml).toContain('/apple-touch-icon.png');
    expect(indexHtml).toContain('/site.webmanifest');
    expect(indexHtml).toContain('property="og:image"');
    expect(indexHtml).toContain('name="twitter:card"');
    expect(indexHtml).not.toContain('/vite.svg');
  });

  it('ships generated brand assets in public', async () => {
    await Promise.all(
      requiredAssets.map(async ({ filename, label }) => {
        const filePath = path.join(publicDir, filename);
        const stats = await stat(filePath);
        expect(
          stats.size,
          `Expected ${label} asset to be non-empty (${filename}).`,
        ).toBeGreaterThan(0);
      }),
    );
  });
});
