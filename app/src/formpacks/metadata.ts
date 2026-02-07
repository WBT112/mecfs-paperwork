import { isRecord } from '../lib/utils';

export type FormpackRevisionSignature = {
  versionOrHash: string;
  version?: string;
  hash: string;
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
      )
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

const toHex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (entry) =>
    entry.toString(16).padStart(2, '0'),
  ).join('');

const hashContent = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return toHex(digest);
};

const getManifestVersion = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const rawVersion = value.version;
  if (typeof rawVersion !== 'string') {
    return undefined;
  }

  const trimmed = rawVersion.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const deriveFormpackRevisionSignature = async (
  manifestPayload: unknown,
): Promise<FormpackRevisionSignature> => {
  const stablePayload = stableStringify(manifestPayload);
  const hash = await hashContent(stablePayload);
  const version = getManifestVersion(manifestPayload);

  return {
    versionOrHash: version ?? hash,
    ...(version ? { version } : {}),
    hash,
  };
};
