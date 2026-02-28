import { describe, expect, it, vi } from 'vitest';

const registerMock = vi.fn();
const registerHyphenationCallbackMock = vi.fn();

vi.mock('@react-pdf/renderer', () => ({
  Font: {
    register: registerMock,
    registerHyphenationCallback: registerHyphenationCallbackMock,
  },
}));

describe('pdf font registration', () => {
  it('registers bundled sans/serif families only once', async () => {
    const module = await import('../../../src/export/pdf/fonts');

    module.ensurePdfFontsRegistered();
    module.ensurePdfFontsRegistered();

    expect(registerMock).toHaveBeenCalledTimes(2);
    expect(registerMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ family: module.PDF_FONT_FAMILY_SANS }),
    );
    expect(registerMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ family: module.PDF_FONT_FAMILY_SERIF }),
    );
    expect(registerHyphenationCallbackMock).toHaveBeenCalledTimes(1);
  });
});
