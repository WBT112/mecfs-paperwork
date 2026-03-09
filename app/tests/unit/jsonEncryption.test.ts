import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  JsonEncryptionError,
  decryptJsonWithPassword,
  encryptJsonWithPassword,
  tryParseJsonEncryptionEnvelope,
} from '../../src/lib/jsonEncryption';

const ENCRYPTED_JSON_KIND = 'mecfs-paperwork-json-encrypted';

describe('jsonEncryption', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('encrypts and decrypts JSON content with the same password', async () => {
    const payload = JSON.stringify({
      record: { id: 'record-1' },
      data: { a: 1 },
    });
    const password = 'secret-password';

    const envelope = await encryptJsonWithPassword(payload, password);
    const decrypted = await decryptJsonWithPassword(envelope, password);

    expect(decrypted).toBe(payload);
    expect(envelope.kind).toBe(ENCRYPTED_JSON_KIND);
    expect(envelope.version).toBe(1);
    expect(envelope.cipher).toBe('AES-GCM');
  });

  it('rejects decryption with wrong password', async () => {
    const payload = JSON.stringify({ value: 'test' });
    const envelope = await encryptJsonWithPassword(payload, 'correct-password');

    await expect(
      decryptJsonWithPassword(envelope, 'wrong-password'),
    ).rejects.toBeInstanceOf(JsonEncryptionError);
  });

  it('parses encrypted envelopes and ignores plain JSON payloads', async () => {
    const payload = JSON.stringify({ value: 'test' });
    const envelope = await encryptJsonWithPassword(payload, 'secret');

    expect(tryParseJsonEncryptionEnvelope(JSON.stringify(envelope))).toEqual(
      envelope,
    );
    expect(tryParseJsonEncryptionEnvelope(payload)).toBeNull();
  });

  it('returns null for empty and invalid JSON envelope inputs', () => {
    expect(tryParseJsonEncryptionEnvelope('')).toBeNull();
    expect(tryParseJsonEncryptionEnvelope('{invalid json')).toBeNull();
    expect(tryParseJsonEncryptionEnvelope('[]')).toBeNull();
  });

  it('throws invalid_envelope for malformed encrypted payloads', async () => {
    await expect(
      decryptJsonWithPassword(
        {
          kind: ENCRYPTED_JSON_KIND,
          version: 1,
          cipher: 'AES-GCM',
          tagLength: 128,
          kdf: 'PBKDF2',
          hash: 'SHA-256',
          iterations: 0,
          salt: '',
          iv: '',
          ciphertext: '',
        },
        'secret',
      ),
    ).rejects.toMatchObject({ code: 'invalid_envelope' });
  });

  it('throws crypto_unsupported when crypto API is unavailable', async () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', undefined);

    await expect(
      encryptJsonWithPassword('{"value":"test"}', 'secret'),
    ).rejects.toMatchObject({ code: 'crypto_unsupported' });

    vi.stubGlobal('crypto', originalCrypto);
  });

  it('throws crypto_unsupported when decrypting without crypto support', async () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', undefined);

    await expect(
      decryptJsonWithPassword(
        {
          kind: ENCRYPTED_JSON_KIND,
          version: 1,
          cipher: 'AES-GCM',
          tagLength: 128,
          kdf: 'PBKDF2',
          hash: 'SHA-256',
          iterations: 1,
          salt: 'a',
          iv: 'b',
          ciphertext: 'c',
        },
        'secret',
      ),
    ).rejects.toMatchObject({ code: 'crypto_unsupported' });

    vi.stubGlobal('crypto', originalCrypto);
  });

  it('supports Buffer fallback when btoa and atob are unavailable', async () => {
    const originalBtoa = globalThis.btoa;
    const originalAtob = globalThis.atob;

    vi.stubGlobal('btoa', undefined);
    vi.stubGlobal('atob', undefined);

    const payload = JSON.stringify({ value: 'buffer-fallback' });
    const envelope = await encryptJsonWithPassword(payload, 'secret');
    const decrypted = await decryptJsonWithPassword(envelope, 'secret');

    expect(decrypted).toBe(payload);

    vi.stubGlobal('btoa', originalBtoa);
    vi.stubGlobal('atob', originalAtob);
  });
});
