import { describe, expect, it } from 'vitest';
import { getMeBingoPromptPool } from '../../../src/features/games/me-bingo/data/content';

describe('meBingo content i18n parity', () => {
  it('keeps every prompt localized in both DE and EN without empty labels', () => {
    const promptPool = getMeBingoPromptPool();

    expect(promptPool.length).toBeGreaterThan(0);

    for (const prompt of promptPool) {
      expect(prompt.labels.de.trim()).not.toBe('');
      expect(prompt.labels.en.trim()).not.toBe('');
      expect(prompt.labels.de).not.toBe(prompt.id);
      expect(prompt.labels.en).not.toBe(prompt.id);
    }
  });

  it('keeps the category distribution aligned for the bilingual prompt pool', () => {
    const promptPool = getMeBingoPromptPool();
    const countsByCategory = promptPool.reduce<Record<string, number>>(
      (counts, prompt) => {
        counts[prompt.category] = (counts[prompt.category] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(countsByCategory).toEqual({
      'daily-life-expectations': 25,
      'medical-psychologizing': 25,
      'minimization-visibility': 25,
      'push-and-movement': 25,
      'wellness-advice': 25,
    });
  });

  it('keeps prompt labels short enough for small mobile bingo cells', () => {
    const promptPool = getMeBingoPromptPool();

    const longestGermanLabel = Math.max(
      ...promptPool.map((prompt) => prompt.labels.de.length),
    );
    const longestEnglishLabel = Math.max(
      ...promptPool.map((prompt) => prompt.labels.en.length),
    );

    expect(longestGermanLabel).toBeLessThanOrEqual(32);
    expect(longestEnglishLabel).toBeLessThanOrEqual(31);
  });
});
