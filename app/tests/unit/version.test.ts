// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const importVersionModule = async (appVersion: unknown, buildDate: unknown) => {
  vi.resetModules();
  vi.stubGlobal('__APP_VERSION__', appVersion as string);
  vi.stubGlobal('__BUILD_DATE__', buildDate as string);
  return import('../../src/lib/version');
};

describe('lib/version', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses normalized version and localized build date when metadata is valid', async () => {
    const versionModule = await importVersionModule(
      ' v123abc ',
      '2026-02-07T12:00:00.000Z',
    );

    expect(versionModule.APP_VERSION).toBe('v123abc');
    expect(versionModule.BUILD_DATE_ISO).toBe('2026-02-07T12:00:00.000Z');
    expect(versionModule.HAS_VALID_BUILD_DATE).toBe(true);
    expect(versionModule.formatBuildDate('en-US')).not.toBe(
      versionModule.BUILD_DATE_ISO,
    );
  });

  it('keeps the raw build value when the date is invalid', async () => {
    const versionModule = await importVersionModule('v123abc', 'not-a-date');

    expect(versionModule.HAS_VALID_BUILD_DATE).toBe(false);
    expect(versionModule.formatBuildDate('de-DE')).toBe('not-a-date');
  });

  it('falls back to unknown for missing or non-string metadata', async () => {
    const versionModule = await importVersionModule(undefined, 42);

    expect(versionModule.APP_VERSION).toBe('unknown');
    expect(versionModule.BUILD_DATE_ISO).toBe('unknown');
    expect(versionModule.HAS_VALID_BUILD_DATE).toBe(false);
    expect(versionModule.formatBuildDate('en')).toBe('unknown');
  });
});
