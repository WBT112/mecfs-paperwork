const getGlobalBuffer = (): typeof Buffer | undefined =>
  (globalThis as { Buffer?: typeof Buffer }).Buffer;

export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder();

export const toBase64Url = (bytes: Uint8Array): string => {
  const globalBuffer = getGlobalBuffer();
  if (typeof btoa === 'function') {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCodePoint(byte);
    }
    return btoa(binary)
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  }

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

export const fromBase64Url = (value: string): Uint8Array => {
  const globalBuffer = getGlobalBuffer();
  const base64 = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  if (typeof atob === 'function') {
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0);
  }

  if (globalBuffer) {
    return new Uint8Array(globalBuffer.from(base64, 'base64'));
  }

  throw new Error('Base64 decoding is not supported in this environment.');
};

export const hasCryptoSupport = (): boolean => {
  const cryptoApi = (globalThis as { crypto?: Partial<Crypto> }).crypto;
  return Boolean(
    cryptoApi &&
    typeof cryptoApi.getRandomValues === 'function' &&
    cryptoApi.subtle !== undefined,
  );
};

export const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
};
