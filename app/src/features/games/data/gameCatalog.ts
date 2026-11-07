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
    titleKey: 'games.catalog.meBingo.title',
    descriptionKey: 'games.catalog.meBingo.description',
  },
] as const;
