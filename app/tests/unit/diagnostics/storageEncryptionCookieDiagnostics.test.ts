import { describe, expect, it, vi } from 'vitest';
import { getStorageEncryptionCookieDiagnostics } from '../../../src/lib/diagnostics/storageEncryptionCookieDiagnostics';

describe('getStorageEncryptionCookieDiagnostics', () => {
  it('reports key-cookie presence when cookie exists', () => {
    document.cookie = 'mecfs-paperwork.storage-key=secret';

    const diagnostics = getStorageEncryptionCookieDiagnostics();

    expect(diagnostics.keyCookiePresent).toBe(true);
    expect(diagnostics.secureFlagVerifiable).toBe(false);
  });

  it('reports https context when protocol is https', () => {
    const originalLocation = globalThis.location;
    vi.stubGlobal('location', { protocol: 'https:' } as Location);

    try {
      const diagnostics = getStorageEncryptionCookieDiagnostics();
      expect(diagnostics.keyCookieContext).toBe('https');
    } finally {
      vi.stubGlobal('location', originalLocation);
    }
  });

  it('reports non-https context when protocol is not https', () => {
    const originalLocation = globalThis.location;
    vi.stubGlobal('location', { protocol: 'http:' } as Location);

    try {
      const diagnostics = getStorageEncryptionCookieDiagnostics();
      expect(diagnostics.keyCookieContext).toBe('non-https');
    } finally {
      vi.stubGlobal('location', originalLocation);
    }
  });

  it('reports unknown context when location is unavailable', () => {
    const originalLocation = globalThis.location;
    vi.stubGlobal('location', undefined);

    try {
      const diagnostics = getStorageEncryptionCookieDiagnostics();
      expect(diagnostics.keyCookieContext).toBe('unknown');
    } finally {
      vi.stubGlobal('location', originalLocation);
    }
  });
});
