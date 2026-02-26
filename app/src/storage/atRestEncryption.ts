import {
  fromBase64Url,
  hasCryptoSupport,
  randomBytes,
  textDecoder,
  textEncoder,
  toBase64Url,
} from '../lib/cryptoCommon';

const STORAGE_ENCRYPTION_KIND = 'mecfs-paperwork-idb-encrypted';
const STORAGE_ENCRYPTION_VERSION = 1;
const STORAGE_ENCRYPTION_COOKIE_NAME = 'mecfs-paperwork.storage-key';
const STORAGE_KEY_BYTES = 32;
const STORAGE_KEY_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const AES_GCM_TAG_LENGTH = 128;
const AES_GCM_IV_BYTES = 12;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

const setCookie = (name: string, value: string, maxAge: number) => {
  if (typeof document === 'undefined') {
    return;
  }

  const location = (globalThis as { location?: Location }).location;
  const secure = location?.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Strict${secure}`;
};

const importAesKey = async (
  keyBytes: Uint8Array,
  usages: KeyUsage[],
): Promise<CryptoKey> => {
  return globalThis.crypto.subtle.importKey(
    'raw',
    Uint8Array.from(keyBytes),
    { name: 'AES-GCM' },
    false,
    usages,
  );
};

const parseStorageKey = (value: string | null): Uint8Array | null => {
  if (!value) {
    return null;
  }

  try {
    const decoded = fromBase64Url(value);
    return decoded.length === STORAGE_KEY_BYTES ? decoded : null;
  } catch {
    return null;
  }
};

const readStorageKey = (): Uint8Array | null => {
  return parseStorageKey(getCookieValue(STORAGE_ENCRYPTION_COOKIE_NAME));
};

const getOrCreateStorageKey = (): Uint8Array => {
  const existing = readStorageKey();
  if (existing) {
    return existing;
  }

  const generated = randomBytes(STORAGE_KEY_BYTES);
  setCookie(
    STORAGE_ENCRYPTION_COOKIE_NAME,
    toBase64Url(generated),
    STORAGE_KEY_MAX_AGE_SECONDS,
  );

  const persisted = readStorageKey();
  if (persisted) {
    return persisted;
  }

  throw new StorageLockedError(
    'missing_key',
    'Could not persist the storage encryption key cookie.',
  );
};

export type StorageLockedErrorCode =
  | 'missing_key'
  | 'decrypt_failed'
  | 'invalid_payload';

/**
 * Indicates that encrypted local storage data cannot be unlocked.
 *
 * @remarks
 * RATIONALE: The app maps this error to a dedicated UI state that offers
 * a local reset path when the key cookie is missing or payload decryption fails.
 */
export class StorageLockedError extends Error {
  readonly code: StorageLockedErrorCode;

  /**
   * @param code - Stable reason code used for UI error mapping.
   * @param message - Human-readable diagnostics message.
   */
  constructor(code: StorageLockedErrorCode, message: string) {
    super(message);
    this.name = 'StorageLockedError';
    this.code = code;
  }
}

export type EncryptedStoragePayload = {
  kind: typeof STORAGE_ENCRYPTION_KIND;
  version: typeof STORAGE_ENCRYPTION_VERSION;
  cipher: 'AES-GCM';
  iv: string;
  ciphertext: string;
};

/**
 * Checks whether a persisted payload uses the encrypted storage envelope.
 *
 * @param value - Unknown payload read from IndexedDB.
 * @returns True when the payload matches the encrypted envelope contract.
 */
export const isEncryptedStoragePayload = (
  value: unknown,
): value is EncryptedStoragePayload => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.kind === STORAGE_ENCRYPTION_KIND &&
    value.version === STORAGE_ENCRYPTION_VERSION &&
    value.cipher === 'AES-GCM' &&
    typeof value.iv === 'string' &&
    value.iv.length > 0 &&
    typeof value.ciphertext === 'string' &&
    value.ciphertext.length > 0
  );
};

/**
 * Removes the storage-encryption key cookie.
 *
 * @returns Nothing.
 */
export const clearStorageEncryptionKeyCookie = (): void => {
  setCookie(STORAGE_ENCRYPTION_COOKIE_NAME, '', 0);
};

/**
 * Encrypts a structured payload for at-rest IndexedDB persistence.
 *
 * @param data - Plain object payload to persist.
 * @returns Encrypted envelope to store in IndexedDB.
 * @throws When crypto APIs are unavailable or the key cookie cannot be persisted.
 */
export const encryptStorageData = async (
  data: Record<string, unknown>,
): Promise<EncryptedStoragePayload> => {
  if (!hasCryptoSupport()) {
    throw new Error('Web Crypto API is not available.');
  }

  const keyBytes = getOrCreateStorageKey();
  const key = await importAesKey(keyBytes, ['encrypt']);
  const iv = randomBytes(AES_GCM_IV_BYTES);
  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: Uint8Array.from(iv),
      tagLength: AES_GCM_TAG_LENGTH,
    },
    key,
    textEncoder.encode(JSON.stringify(data)),
  );

  return {
    kind: STORAGE_ENCRYPTION_KIND,
    version: STORAGE_ENCRYPTION_VERSION,
    cipher: 'AES-GCM',
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(new Uint8Array(ciphertextBuffer)),
  };
};

const decryptStorageData = async (
  payload: EncryptedStoragePayload,
): Promise<Record<string, unknown>> => {
  if (!hasCryptoSupport()) {
    throw new Error('Web Crypto API is not available.');
  }

  const keyBytes = readStorageKey();
  if (!keyBytes) {
    throw new StorageLockedError(
      'missing_key',
      'The storage encryption key is missing.',
    );
  }

  try {
    const key = await importAesKey(keyBytes, ['decrypt']);
    const plainBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: Uint8Array.from(fromBase64Url(payload.iv)),
        tagLength: AES_GCM_TAG_LENGTH,
      },
      key,
      Uint8Array.from(fromBase64Url(payload.ciphertext)),
    );
    const parsed = JSON.parse(textDecoder.decode(plainBuffer)) as unknown;
    if (!isRecord(parsed)) {
      throw new Error('Decrypted payload is not a plain object.');
    }
    return parsed;
  } catch {
    throw new StorageLockedError(
      'decrypt_failed',
      'Could not decrypt local storage data.',
    );
  }
};

/**
 * Decodes persisted data and signals whether a legacy plaintext value
 * should be re-encrypted.
 *
 * @param value - Raw `data` field loaded from IndexedDB.
 * @returns Decoded plain object plus migration hint.
 * @throws StorageLockedError when encrypted data cannot be unlocked.
 * @throws TypeError when the stored payload is structurally invalid.
 */
export const decodeStoredData = async (
  value: unknown,
): Promise<{ data: Record<string, unknown>; shouldReencrypt: boolean }> => {
  if (isEncryptedStoragePayload(value)) {
    return {
      data: await decryptStorageData(value),
      shouldReencrypt: false,
    };
  }

  if (isRecord(value)) {
    if (value.kind === STORAGE_ENCRYPTION_KIND) {
      throw new StorageLockedError(
        'invalid_payload',
        'Stored encrypted payload format is invalid.',
      );
    }

    return {
      data: value,
      shouldReencrypt: true,
    };
  }

  throw new TypeError('Stored payload is not a plain object.');
};
