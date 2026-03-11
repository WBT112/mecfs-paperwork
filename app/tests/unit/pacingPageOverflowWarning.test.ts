import { describe, expect, it } from 'vitest';
import { assessPacingCardPageOverflow } from '../../src/formpacks/pacing-ampelkarten/pageOverflowWarning';

describe('assessPacingCardPageOverflow', () => {
  it('does not warn for short card content', () => {
    const result = assessPacingCardPageOverflow({
      canDo: ['Kurz spazieren', 'Kurz lesen'],
      needHelp: ['Essen bringen'],
      hint: 'Bitte ruhig sprechen.',
    });

    expect(result.shouldWarn).toBe(false);
    expect(result.totalItems).toBe(3);
    expect(result.estimatedLines).toBeGreaterThan(0);
  });

  it('warns when too many bullet items are present', () => {
    const result = assessPacingCardPageOverflow({
      canDo: ['1', '2', '3', '4', '5'],
      needHelp: ['6', '7', '8', '9'],
      hint: 'Kurz.',
    });

    expect(result.totalItems).toBe(9);
    expect(result.shouldWarn).toBe(true);
  });

  it('warns for very long combined text even with fewer items', () => {
    const longSentence =
      'Bitte alles sehr langsam, leise und mit vielen Pausen machen, damit die Belastung nicht weiter ansteigt.';
    const result = assessPacingCardPageOverflow({
      canDo: [longSentence, longSentence, longSentence, longSentence],
      needHelp: [longSentence, longSentence],
      hint: `${longSentence} ${longSentence} ${longSentence}`,
    });

    expect(result.totalItems).toBe(6);
    expect(result.totalCharacters).toBeGreaterThanOrEqual(900);
    expect(result.shouldWarn).toBe(true);
  });

  it('tolerates malformed card data', () => {
    const result = assessPacingCardPageOverflow(null);

    expect(result).toEqual({
      estimatedLines: 0,
      totalItems: 0,
      totalCharacters: 0,
      shouldWarn: false,
    });
  });
});
