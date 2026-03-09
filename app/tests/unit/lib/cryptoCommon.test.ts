import { describe, expect, it, vi } from 'vitest';
import { fromBase64Url } from '../../../src/lib/cryptoCommon';

describe('cryptoCommon', () => {
  it('falls back to zero when decoded characters return undefined code points', () => {
    const originalAtob = globalThis.atob;

    Object.defineProperty(globalThis, 'atob', {
      value: vi.fn().mockReturnValue('A'),
      configurable: true,
      writable: true,
    });

    const codePointSpy = vi
      .spyOn(String.prototype, 'codePointAt')
      .mockReturnValue(undefined);

    try {
      expect(fromBase64Url('QQ')).toEqual(Uint8Array.from([0]));
    } finally {
      codePointSpy.mockRestore();
      Object.defineProperty(globalThis, 'atob', {
        value: originalAtob,
        configurable: true,
        writable: true,
      });
    }
  });
});
