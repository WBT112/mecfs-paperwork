import { beforeEach, describe, expect, it, vi } from 'vitest';

const registerMock = vi.fn();
const registerHyphenationCallbackMock = vi.fn();

vi.mock('@react-pdf/renderer', () => ({
  Font: {
    register: registerMock,
    registerHyphenationCallback: registerHyphenationCallbackMock,
  },
}));

describe('pdf font registration', () => {
  beforeEach(() => {
    vi.resetModules();
    registerMock.mockReset();
    registerHyphenationCallbackMock.mockReset();
  });

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

  it('registers an identity hyphenation callback', async () => {
    const module = await import('../../../src/export/pdf/fonts');

    module.ensurePdfFontsRegistered();

    expect(registerHyphenationCallbackMock).toHaveBeenCalledTimes(1);

    const callbackCandidate = registerHyphenationCallbackMock.mock.calls.at(
      0,
    )?.[0] as unknown;
    expect(typeof callbackCandidate).toBe('function');

    if (typeof callbackCandidate === 'function') {
      const callback = callbackCandidate as (word: string) => string[];
      expect(callback('nachvollziehbar')).toEqual(['nachvollziehbar']);
    }
  });

  it('does not re-register hyphenation after a failed first font registration', async () => {
    registerMock.mockImplementationOnce(() => {
      throw new Error('register failed');
    });

    const module = await import('../../../src/export/pdf/fonts');

    expect(() => module.ensurePdfFontsRegistered()).toThrow('register failed');
    module.ensurePdfFontsRegistered();

    expect(registerHyphenationCallbackMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledTimes(3);
  });
});
