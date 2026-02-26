const ENCRYPTION_KIND = 'mecfs-paperwork-json-encrypted';
const ENCRYPTION_VERSION = 1;
const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const AES_GCM_TAG_LENGTH = 128;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64Url = (bytes: Uint8Array): string => {
  if (typeof btoa === 'function') {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary)
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  }

  const globalBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  if (globalBuffer) {
    return globalBuffer
      .from(bytes)
      .toString('base64')
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  }

  throw new Error('Base64 encoding is not supported in this environment.');
};

const fromBase64Url = (value: string): Uint8Array => {
  const base64 = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  if (typeof atob === 'function') {
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  const globalBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  if (globalBuffer) {
    return new Uint8Array(globalBuffer.from(base64, 'base64'));
  }

  throw new Error('Base64 decoding is not supported in this environment.');
};

const hasCryptoSupport = (): boolean => {
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;
  return Boolean(
    cryptoApi &&
    typeof cryptoApi.getRandomValues === 'function' &&
    typeof cryptoApi.subtle !== 'undefined',
  );
};

const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
};

const deriveAesGcmKey = async (
  password: string,
  salt: Uint8Array,
  keyUsages: KeyUsage[],
): Promise<CryptoKey> => {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    keyUsages,
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export type JsonEncryptionErrorCode =
  | 'crypto_unsupported'
  | 'invalid_envelope'
  | 'decrypt_failed';

/**
 * Error type for JSON export encryption/decryption operations.
 *
 * @param code - Stable error code for UI mapping.
 * @param message - Human-readable description for diagnostics.
 */
export class JsonEncryptionError extends Error {
  readonly code: JsonEncryptionErrorCode;

  constructor(code: JsonEncryptionErrorCode, message: string) {
    super(message);
    this.name = 'JsonEncryptionError';
    this.code = code;
  }
}

export type JsonEncryptionEnvelope = {
  kind: typeof ENCRYPTION_KIND;
  version: typeof ENCRYPTION_VERSION;
  cipher: 'AES-GCM';
  tagLength: typeof AES_GCM_TAG_LENGTH;
  kdf: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

/**
 * Checks whether a value is a supported encrypted JSON envelope.
 *
 * @param value - Parsed JSON value to inspect.
 * @returns True when the value matches the supported envelope contract.
 */
export const isJsonEncryptionEnvelope = (
  value: unknown,
): value is JsonEncryptionEnvelope => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.kind === ENCRYPTION_KIND &&
    value.version === ENCRYPTION_VERSION &&
    value.cipher === 'AES-GCM' &&
    value.tagLength === AES_GCM_TAG_LENGTH &&
    value.kdf === 'PBKDF2' &&
    value.hash === 'SHA-256' &&
    typeof value.iterations === 'number' &&
    Number.isFinite(value.iterations) &&
    value.iterations > 0 &&
    typeof value.salt === 'string' &&
    value.salt.length > 0 &&
    typeof value.iv === 'string' &&
    value.iv.length > 0 &&
    typeof value.ciphertext === 'string' &&
    value.ciphertext.length > 0
  );
};

/**
 * Parses JSON text and returns an encrypted envelope when present.
 *
 * @param rawJson - JSON text loaded from an import file.
 * @returns The parsed envelope or null for plain JSON/non-JSON.
 */
export const tryParseJsonEncryptionEnvelope = (
  rawJson: string,
): JsonEncryptionEnvelope | null => {
  const normalized = rawJson.replace(/^\uFEFF/, '').trimStart();
  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    return isJsonEncryptionEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Encrypts a JSON string using password-based AES-GCM.
 *
 * @param rawJson - Plain JSON content to encrypt.
 * @param password - User password for key derivation.
 * @returns Versioned encrypted envelope suitable for JSON export files.
 * @throws When browser crypto APIs are unavailable.
 */
export const encryptJsonWithPassword = async (
  rawJson: string,
  password: string,
): Promise<JsonEncryptionEnvelope> => {
  if (!hasCryptoSupport()) {
    throw new JsonEncryptionError(
      'crypto_unsupported',
      'Web Crypto API is not available.',
    );
  }

  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveAesGcmKey(password, salt, ['encrypt']);
  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
      tagLength: AES_GCM_TAG_LENGTH,
    },
    key,
    textEncoder.encode(rawJson),
  );

  return {
    kind: ENCRYPTION_KIND,
    version: ENCRYPTION_VERSION,
    cipher: 'AES-GCM',
    tagLength: AES_GCM_TAG_LENGTH,
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64Url(salt),
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(new Uint8Array(ciphertextBuffer)),
  };
};

/**
 * Decrypts an encrypted JSON envelope using a user password.
 *
 * @param envelope - Encrypted envelope loaded from JSON import.
 * @param password - Password entered by the user.
 * @returns Decrypted plain JSON text.
 * @throws When crypto is unavailable, envelope is invalid,
 * or decryption fails (wrong password or corrupted data).
 */
export const decryptJsonWithPassword = async (
  envelope: JsonEncryptionEnvelope,
  password: string,
): Promise<string> => {
  if (!hasCryptoSupport()) {
    throw new JsonEncryptionError(
      'crypto_unsupported',
      'Web Crypto API is not available.',
    );
  }

  if (!isJsonEncryptionEnvelope(envelope)) {
    throw new JsonEncryptionError(
      'invalid_envelope',
      'Invalid encrypted JSON envelope.',
    );
  }

  try {
    const salt = fromBase64Url(envelope.salt);
    const iv = fromBase64Url(envelope.iv);
    const ciphertext = fromBase64Url(envelope.ciphertext);
    const key = await deriveAesGcmKey(password, salt, ['decrypt']);
    const plainBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
        tagLength: envelope.tagLength,
      },
      key,
      new Uint8Array(ciphertext),
    );

    return textDecoder.decode(plainBuffer);
  } catch {
    throw new JsonEncryptionError(
      'decrypt_failed',
      'Unable to decrypt JSON payload.',
    );
  }
};
