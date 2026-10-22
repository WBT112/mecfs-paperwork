import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyRepresentativeLetterText } from '../../src/features/representative-letter/clipboard';

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
);
const SYNTHETIC_TEXT = 'Synthetic text';

describe('representative-letter clipboard', () => {
  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('copies the exact visible plain text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(
      copyRepresentativeLetterText('Zeile 1\n\nZeile 2', { writeText }),
    ).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('Zeile 1\n\nZeile 2');
  });

  it('reports rejected clipboard writes without throwing', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('blocked'));

    await expect(
      copyRepresentativeLetterText(SYNTHETIC_TEXT, { writeText }),
    ).resolves.toBe(false);
  });

  it('reports an explicitly unavailable clipboard', async () => {
    await expect(
      copyRepresentativeLetterText(SYNTHETIC_TEXT, null),
    ).resolves.toBe(false);
  });

  it('detects an unavailable browser clipboard by default', async () => {
    Reflect.deleteProperty(navigator, 'clipboard');

    await expect(copyRepresentativeLetterText(SYNTHETIC_TEXT)).resolves.toBe(
      false,
    );
  });
});
