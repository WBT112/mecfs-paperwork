import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStorageEncryptionKeyCookie,
  decodeStoredData,
  encryptStorageData,
  isEncryptedStoragePayload,
  StorageLockedError,
} from '../../../src/storage/atRestEncryption';

describe('storage at-rest encryption', () => {
  beforeEach(() => {
    clearStorageEncryptionKeyCookie();
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
      kind: 'mecfs-paperwork-idb-encrypted',
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
    const tampered = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -1) + 'A',
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

  it('recognizes invalid envelopes as non-encrypted payloads', async () => {
    expect(
      isEncryptedStoragePayload({
        kind: 'mecfs-paperwork-idb-encrypted',
        version: 2,
        cipher: 'AES-GCM',
        iv: 'iv',
        ciphertext: 'ct',
      }),
    ).toBe(false);
  });
});
