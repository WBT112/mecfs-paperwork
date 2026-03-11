import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('pacing card theme helpers', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns stable theme metadata for each card color', async () => {
    const { PACING_CARD_COLORS, getPacingCardTheme } =
      await import('../../src/formpacks/pacing-ampelkarten/export/cardTheme');

    expect(PACING_CARD_COLORS).toEqual(['green', 'yellow', 'red']);

    const greenTheme = getPacingCardTheme('green');

    expect(greenTheme).toMatchObject({
      color: 'green',
      animalLabelKey: 'pacing-ampelkarten.card.animal.green',
      imageAltKey: 'pacing-ampelkarten.card.imageAlt.green',
    });
    expect(greenTheme.imageSrc).toMatch(/^data:image\/png;base64,/);
  });

  it('returns the stronger color system for all card states', async () => {
    const { getPacingCardTheme } =
      await import('../../src/formpacks/pacing-ampelkarten/export/cardTheme');

    expect(getPacingCardTheme('green')).toMatchObject({
      accentColor: '#2b6a3e',
      borderColor: '#76b27f',
      surfaceColor: '#f1f8ef',
      titleColor: '#183524',
      sectionLabelColor: '#245a35',
    });
    expect(getPacingCardTheme('yellow')).toMatchObject({
      accentColor: '#9b6a00',
      borderColor: '#d1a238',
      surfaceColor: '#fff7e3',
      titleColor: '#5a3e00',
      sectionLabelColor: '#8f5f00',
    });
    expect(getPacingCardTheme('red')).toMatchObject({
      accentColor: '#a5472a',
      borderColor: '#d47a59',
      surfaceColor: '#fff1ea',
      titleColor: '#5d2618',
      sectionLabelColor: '#943a23',
    });
  });

  it('maps lion to green and sloth to red assets', async () => {
    const { getPacingCardTheme } =
      await import('../../src/formpacks/pacing-ampelkarten/export/cardTheme');

    expect(getPacingCardTheme('green').imageSrc).not.toBe(
      getPacingCardTheme('red').imageSrc,
    );
    expect(getPacingCardTheme('green').animalLabelKey).toBe(
      'pacing-ampelkarten.card.animal.green',
    );
    expect(getPacingCardTheme('red').animalLabelKey).toBe(
      'pacing-ampelkarten.card.animal.red',
    );
  });
});
