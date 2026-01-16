import { describe, it, expect, vi } from 'vitest';
import { getRepoUrl, DEFAULT_REPO_URL } from '../../../src/lib/repo';

describe('getRepoUrl', () => {
  it('returns the default repo URL when the environment variable is not set', () => {
    vi.stubEnv('VITE_REPO_URL', undefined);
    expect(getRepoUrl()).toBe(DEFAULT_REPO_URL);
  });

  it('returns the trimmed URL from the environment variable when set', () => {
    const testUrl = '  https://example.com/repo  ';
    vi.stubEnv('VITE_REPO_URL', testUrl);
    expect(getRepoUrl()).toBe(testUrl.trim());
  });

  it('returns null when the environment variable is an empty string', () => {
    vi.stubEnv('VITE_REPO_URL', '');
    expect(getRepoUrl()).toBeNull();
  });

  it('returns null when the environment variable consists only of whitespace', () => {
    vi.stubEnv('VITE_REPO_URL', '   ');
    expect(getRepoUrl()).toBeNull();
  });
});
