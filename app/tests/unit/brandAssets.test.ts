import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testDir, '../..');

describe('brand assets', () => {
  it('keeps the index metadata aligned with expected assets', async () => {
    const indexHtml = await readFile(path.join(appRoot, 'index.html'), 'utf-8');

    expect(indexHtml).toContain('/favicon.ico');
    expect(indexHtml).toContain('/favicon-32x32.png');
    expect(indexHtml).toContain('/apple-touch-icon.png');
    expect(indexHtml).toContain('/site.webmanifest');
    expect(indexHtml).toContain('property="og:image"');
    expect(indexHtml).toContain('name="twitter:card"');
    expect(indexHtml).not.toContain('/vite.svg');
  });
});
