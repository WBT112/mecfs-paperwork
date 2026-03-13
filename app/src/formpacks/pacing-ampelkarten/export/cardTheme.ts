import greenSlothImage from './assets/card-green-sloth.png?inline';
import redLionImage from './assets/card-red-lion.png?inline';
import yellowPandaImage from './assets/card-yellow-panda.png?inline';

export const PACING_CARD_COLORS = ['green', 'yellow', 'red'] as const;

export type PacingCardColor = (typeof PACING_CARD_COLORS)[number];

export type PacingCardTheme = {
  color: PacingCardColor;
  accentColor: string;
  borderColor: string;
  surfaceColor: string;
  titleColor: string;
  sectionLabelColor: string;
  imageSrc: string;
  animalLabelKey: string;
  imageAltKey: string;
};

const THEMES: Record<PacingCardColor, PacingCardTheme> = {
  green: {
    color: 'green',
    accentColor: '#2b6a3e',
    borderColor: '#76b27f',
    surfaceColor: '#f1f8ef',
    titleColor: '#183524',
    sectionLabelColor: '#245a35',
    imageSrc: redLionImage,
    animalLabelKey: 'pacing-ampelkarten.card.animal.green',
    imageAltKey: 'pacing-ampelkarten.card.imageAlt.green',
  },
  yellow: {
    color: 'yellow',
    accentColor: '#9b6a00',
    borderColor: '#d1a238',
    surfaceColor: '#fff7e3',
    titleColor: '#5a3e00',
    sectionLabelColor: '#8f5f00',
    imageSrc: yellowPandaImage,
    animalLabelKey: 'pacing-ampelkarten.card.animal.yellow',
    imageAltKey: 'pacing-ampelkarten.card.imageAlt.yellow',
  },
  red: {
    color: 'red',
    accentColor: '#a5472a',
    borderColor: '#d47a59',
    surfaceColor: '#fff1ea',
    titleColor: '#5d2618',
    sectionLabelColor: '#943a23',
    imageSrc: greenSlothImage,
    animalLabelKey: 'pacing-ampelkarten.card.animal.red',
    imageAltKey: 'pacing-ampelkarten.card.imageAlt.red',
  },
};

/**
 * Returns the immutable theme metadata for one pacing card color.
 *
 * @param color - The semantic pacing card color.
 * @returns Theme tokens and asset references for that card.
 */
export const getPacingCardTheme = (color: PacingCardColor): PacingCardTheme =>
  THEMES[color];
