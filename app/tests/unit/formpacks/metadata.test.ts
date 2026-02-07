import { describe, expect, it } from 'vitest';
import { deriveFormpackRevisionSignature } from '../../../src/formpacks/metadata';

const FORMPACK_ID = 'doctor-letter';

describe('formpacks/metadata', () => {
  it('prefers manifest.version when present', async () => {
    const signature = await deriveFormpackRevisionSignature({
      id: FORMPACK_ID,
      version: '1.2.3',
      locales: ['de', 'en'],
    });

    expect(signature.versionOrHash).toBe('1.2.3');
    expect(signature.version).toBe('1.2.3');
    expect(signature.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('falls back to hash and remains stable for different key order', async () => {
    const payloadA = {
      id: FORMPACK_ID,
      exports: ['json'],
      docx: { mapping: 'a.json', templates: { a4: 'a.docx' } },
    };
    const payloadB = {
      docx: { templates: { a4: 'a.docx' }, mapping: 'a.json' },
      exports: ['json'],
      id: FORMPACK_ID,
    };

    const [signatureA, signatureB] = await Promise.all([
      deriveFormpackRevisionSignature(payloadA),
      deriveFormpackRevisionSignature(payloadB),
    ]);

    expect(signatureA.version).toBeUndefined();
    expect(signatureA.versionOrHash).toBe(signatureA.hash);
    expect(signatureB.versionOrHash).toBe(signatureB.hash);
    expect(signatureA.hash).toBe(signatureB.hash);
  });
});
