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
  titleKey: string;
  descriptionKey: string;
}
