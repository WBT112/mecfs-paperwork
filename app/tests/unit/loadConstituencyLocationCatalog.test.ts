import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConstituencyLocationCatalog } from '../../src/features/representative-letter/data/loadConstituencyLocationCatalog';

describe('loadConstituencyLocationCatalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the bundled static JSON asset', async () => {
    const catalog = { schemaVersion: 1, constituencies: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(catalog), {
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(loadConstituencyLocationCatalog()).resolves.toEqual(catalog);
  });

  it('rejects an unavailable bundled asset', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    await expect(loadConstituencyLocationCatalog()).rejects.toThrow(
      'The bundled constituency-location catalog could not be loaded.',
    );
  });
});
