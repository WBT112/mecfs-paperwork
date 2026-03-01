import type { StorageKeyCookieContext } from './types';

const STORAGE_ENCRYPTION_COOKIE_NAME = 'mecfs-paperwork.storage-key';

export type StorageEncryptionCookieDiagnostics = {
  keyCookiePresent: boolean;
  keyCookieContext: StorageKeyCookieContext;
  secureFlagVerifiable: false;
};

const getCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const prefix = `${name}=`;
  for (const entry of cookies) {
    if (entry.startsWith(prefix)) {
      return entry.slice(prefix.length);
    }
  }

  return null;
};

/**
 * Returns key-cookie diagnostics that can be verified in-browser.
 *
 * @remarks
 * SECURITY: Browser APIs do not expose cookie attributes such as Secure,
 * therefore this function only reports observable context and marks secure-flag
 * verification as unsupported.
 *
 * @returns Cookie presence and runtime context information.
 */
export const getStorageEncryptionCookieDiagnostics =
  (): StorageEncryptionCookieDiagnostics => {
    const keyCookie = getCookieValue(STORAGE_ENCRYPTION_COOKIE_NAME);
    const keyCookiePresent =
      typeof keyCookie === 'string' && keyCookie.length > 0;

    const location = (globalThis as { location?: Location }).location;
    let keyCookieContext: StorageKeyCookieContext = 'unknown';
    if (location !== undefined) {
      keyCookieContext = location.protocol === 'https:' ? 'https' : 'non-https';
    }

    return {
      keyCookiePresent,
      keyCookieContext,
      secureFlagVerifiable: false,
    };
  };
