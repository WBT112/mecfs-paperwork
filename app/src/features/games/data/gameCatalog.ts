import type { GameCatalogEntry } from '../types';

/**
 * Static game registry for the Games hub.
 *
 * @remarks
 * Keeping the catalog data-driven makes it straightforward to append new games
 * without reshaping the hub UI or the route structure.
 *
 * @returns The ordered list of visible game entries.
 */
export const getGameCatalog = (): readonly GameCatalogEntry[] => GAME_CATALOG;

const GAME_CATALOG: readonly GameCatalogEntry[] = [
  {
    id: 'me-bingo',
    path: '/games/me-bingo',
    availability: 'available',
    titleKey: 'games.catalog.meBingo.title',
    descriptionKey: 'games.catalog.meBingo.description',
  },
  {
    id: 'spoon-manager',
    path: '/games/spoon-manager',
    availability: 'available',
    titleKey: 'games.catalog.spoonManager.title',
    descriptionKey: 'games.catalog.spoonManager.description',
  },
  {
    id: 'pem-runner',
    path: '/games/pem-runner',
    availability: 'coming-soon',
    titleKey: 'games.catalog.pemRunner.title',
    descriptionKey: 'games.catalog.pemRunner.description',
  },
] as const;
