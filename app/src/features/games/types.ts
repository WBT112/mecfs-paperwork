/**
 * Declares whether a game is already playable or still a placeholder.
 */
export type GameAvailability = 'available' | 'coming-soon';

/**
 * Metadata used to render a game tile in the Games hub.
 *
 * @remarks
 * The tile content is fully driven by i18n keys so future games can be added
 * without introducing hard-coded UI copy in components.
 */
export interface GameCatalogEntry {
  id: string;
  path: string;
  availability: GameAvailability;
  titleKey: string;
  descriptionKey: string;
}
