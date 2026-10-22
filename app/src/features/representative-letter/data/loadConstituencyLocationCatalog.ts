import constituencyLocationCatalogUrl from './constituency-locations.json?url';
import type { ConstituencyLocationCatalog } from './constituencyLocationCatalogs';

/**
 * Loads the locally bundled and service-worker-cached location catalog.
 *
 * @returns The static constituency-location catalog shipped with this app.
 * @throws When the static app asset cannot be read.
 * @remarks This function never contacts a remote data source. The URL points to
 * a versioned build asset included in the offline precache.
 */
export const loadConstituencyLocationCatalog =
  async (): Promise<ConstituencyLocationCatalog> => {
    const response = await fetch(constituencyLocationCatalogUrl);
    if (!response.ok) {
      throw new Error(
        'The bundled constituency-location catalog could not be loaded.',
      );
    }
    return (await response.json()) as ConstituencyLocationCatalog;
  };
