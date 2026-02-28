import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fromBase64Url,
  textEncoder,
  toBase64Url,
} from '../../../src/lib/cryptoCommon';
import {
  clearStorageEncryptionKeyCookie,
  decodeStoredData,
  encryptStorageData,
  isEncryptedStoragePayload,
  StorageLockedError,
} from '../../../src/storage/atRestEncryption';

const ENCRYPTED_STORAGE_KIND = 'mecfs-paperwork-idb-encrypted';

describe('storage at-rest encryption', () => {
  beforeEach(() => {
    clearStorageEncryptionKeyCookie();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('encrypts and decrypts payloads with the cookie-backed key', async () => {
    const plain = {
      patient: { firstName: 'Max', lastName: 'Mustermann' },
      doctor: { name: 'Dr. Ada' },
    };

    const encrypted = await encryptStorageData(plain);

    expect(isEncryptedStoragePayload(encrypted)).toBe(true);

    const decoded = await decodeStoredData(encrypted);
    expect(decoded.shouldReencrypt).toBe(false);
    expect(decoded.data).toEqual(plain);
  });

  it('returns legacy plaintext data and marks it for migration', async () => {
    const legacy = {
      person: { firstName: 'Legacy' },
    };

    const decoded = await decodeStoredData(legacy);

    expect(decoded.data).toEqual(legacy);
    expect(decoded.shouldReencrypt).toBe(true);
  });

  it('throws locked error when encrypted payload exists but key cookie is missing', async () => {
    const encrypted = await encryptStorageData({ secret: 'value' });

    clearStorageEncryptionKeyCookie();

    await expect(decodeStoredData(encrypted)).rejects.toThrow(
      StorageLockedError,
    );
    await expect(decodeStoredData(encrypted)).rejects.toMatchObject({
      code: 'missing_key',
    });
  });

  it('throws locked error for invalid encrypted payload shape', async () => {
    const invalidEnvelope = {
      kind: ENCRYPTED_STORAGE_KIND,
      version: 1,
      cipher: 'AES-GCM',
      ciphertext: 'abc',
    };

    await expect(decodeStoredData(invalidEnvelope)).rejects.toMatchObject({
      code: 'invalid_payload',
    });
  });

  it('throws decrypt_failed when ciphertext is tampered', async () => {
    const encrypted = await encryptStorageData({ secret: 'value' });
    const replacementChar = encrypted.ciphertext[0] === 'A' ? 'B' : 'A';
    const tampered = {
      ...encrypted,
      ciphertext: replacementChar + encrypted.ciphertext.slice(1),
    };

    await expect(decodeStoredData(tampered)).rejects.toMatchObject({
      code: 'decrypt_failed',
    });
  });

  it('throws type error for non-object stored payloads', async () => {
    await expect(decodeStoredData('invalid')).rejects.toThrow(TypeError);
  });

  it('throws when crypto support is unavailable', async () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', undefined);

    try {
      await expect(encryptStorageData({ test: true })).rejects.toThrow(
        'Web Crypto API is not available.',
      );
    } finally {
      vi.stubGlobal('crypto', originalCrypto);
    }
  });

  it('reuses an existing storage key cookie for subsequent encryptions', async () => {
    const first = await encryptStorageData({ first: true });
    const second = await encryptStorageData({ second: true });

    expect(isEncryptedStoragePayload(first)).toBe(true);
    expect(isEncryptedStoragePayload(second)).toBe(true);

    const decodedSecond = await decodeStoredData(second);
    expect(decodedSecond.data).toEqual({ second: true });
  });

  it('skips unrelated cookies when looking up the storage key', async () => {
    const encrypted = await encryptStorageData({ test: 'scan' });
    const decoded = await decodeStoredData(encrypted);

    expect(decoded.data).toEqual({ test: 'scan' });
  });

  it('ignores valid but wrong-length storage key cookies and creates a new key', async () => {
    document.cookie = 'mecfs-paperwork.storage-key=AQ';

    const encrypted = await encryptStorageData({ key: 'replaced' });
    const decoded = await decodeStoredData(encrypted);

    expect(decoded.data).toEqual({ key: 'replaced' });
  });

  it('allows setting a secure storage key cookie on https locations', async () => {
    const originalLocation = globalThis.location;
    vi.stubGlobal('location', { protocol: 'https:' } as Location);

    try {
      const encrypted = await encryptStorageData({ secure: true });
      const decoded = await decodeStoredData(encrypted);
      expect(decoded.data).toEqual({ secure: true });
    } finally {
      vi.stubGlobal('location', originalLocation);
    }
  });

  it('throws when decrypting encrypted data without crypto support', async () => {
    const encrypted = await encryptStorageData({ test: true });
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', undefined);

    try {
      await expect(decodeStoredData(encrypted)).rejects.toThrow(
        'Web Crypto API is not available.',
      );
    } finally {
      vi.stubGlobal('crypto', originalCrypto);
    }
  });

  it('throws decrypt_failed when decrypted JSON is not a plain object', async () => {
    await encryptStorageData({ seed: true });

    const keyCookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('mecfs-paperwork.storage-key='));
    expect(keyCookie).toBeDefined();

    const encodedKey = (keyCookie ?? '').slice(
      'mecfs-paperwork.storage-key='.length,
    );
    const keyBytes = fromBase64Url(encodedKey);
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      Uint8Array.from(keyBytes),
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    );

    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128,
      },
      key,
      textEncoder.encode(JSON.stringify('not-an-object')),
    );

    const nonObjectEnvelope = {
      kind: ENCRYPTED_STORAGE_KIND,
      version: 1,
      cipher: 'AES-GCM' as const,
      iv: toBase64Url(iv),
      ciphertext: toBase64Url(new Uint8Array(ciphertextBuffer)),
    };

    await expect(decodeStoredData(nonObjectEnvelope)).rejects.toMatchObject({
      code: 'decrypt_failed',
    });
  });

  it('uses the Buffer fallback when btoa/atob are unavailable', async () => {
    vi.stubGlobal('btoa', undefined);
    vi.stubGlobal('atob', undefined);

    const encrypted = await encryptStorageData({ fallback: 'buffer' });
    const decoded = await decodeStoredData(encrypted);

    expect(decoded.data).toEqual({ fallback: 'buffer' });
    expect(decoded.shouldReencrypt).toBe(false);
  });

  it('throws missing_key when cookies cannot be persisted in non-document environments', async () => {
    vi.stubGlobal('document', undefined);

    await expect(encryptStorageData({ test: true })).rejects.toMatchObject({
      code: 'missing_key',
    });
  });

  it('throws when neither btoa nor Buffer is available for encoding', async () => {
    const originalBtoa = globalThis.btoa;
    const originalBuffer = globalThis.Buffer;
    vi.stubGlobal('btoa', undefined);
    Object.defineProperty(globalThis, 'Buffer', {
      value: undefined,
      configurable: true,
    });

    try {
      await expect(encryptStorageData({ a: 1 })).rejects.toThrow(
        'Base64 encoding is not supported in this environment.',
      );
    } finally {
      Object.defineProperty(globalThis, 'Buffer', {
        value: originalBuffer,
        configurable: true,
      });
      vi.stubGlobal('btoa', originalBtoa);
    }
  });

  it('maps unsupported decoding environments to missing_key when cookie parsing is impossible', async () => {
    const encrypted = await encryptStorageData({ secret: 'value' });
    const originalAtob = globalThis.atob;
    const originalBuffer = globalThis.Buffer;
    vi.stubGlobal('atob', undefined);
    Object.defineProperty(globalThis, 'Buffer', {
      value: undefined,
      configurable: true,
    });

    try {
      await expect(decodeStoredData(encrypted)).rejects.toMatchObject({
        code: 'missing_key',
      });
    } finally {
      Object.defineProperty(globalThis, 'Buffer', {
        value: originalBuffer,
        configurable: true,
      });
      vi.stubGlobal('atob', originalAtob);
    }
  });

  it('recognizes invalid envelopes as non-encrypted payloads', async () => {
    expect(
      isEncryptedStoragePayload({
        kind: ENCRYPTED_STORAGE_KIND,
        version: 2,
        cipher: 'AES-GCM',
        iv: 'iv',
        ciphertext: 'ct',
      }),
    ).toBe(false);
  });
});
