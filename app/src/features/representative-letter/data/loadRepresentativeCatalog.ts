import representativeCatalogUrl from './representatives.json?url';
import type { RepresentativeCatalog } from './catalogs';

/**
 * Loads the locally bundled and service-worker-cached recipient catalog.
 *
 * @returns The static representative catalog shipped with this app version.
 * @throws When the static app asset cannot be read.
 * @remarks This function never contacts a remote data source. The URL points to
 * a versioned build asset that is included in the offline precache.
 */
export const loadRepresentativeCatalog =
  async (): Promise<RepresentativeCatalog> => {
    const response = await fetch(representativeCatalogUrl);
    if (!response.ok) {
      throw new Error(
        'The bundled representative catalog could not be loaded.',
      );
    }
    return (await response.json()) as RepresentativeCatalog;
  };
