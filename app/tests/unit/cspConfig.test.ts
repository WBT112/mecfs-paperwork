import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const HTML_PATH = resolve(process.cwd(), 'index.html');
const NGINX_PATH = resolve(process.cwd(), '../nginx/default.conf');

const extractDirective = (policy: string, name: string): string[] => {
  const directive = policy
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name} `));
  return directive?.split(/\s+/u).slice(1) ?? [];
};

const readHtmlPolicy = async (): Promise<string> => {
  const html = await readFile(HTML_PATH, 'utf8');
  const match =
    /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/u.exec(html);
  return match?.[1] ?? '';
};

const readNginxPolicy = async (): Promise<string> => {
  const nginx = await readFile(NGINX_PATH, 'utf8');
  const match = /add_header Content-Security-Policy "([^"]+)" always;/u.exec(
    nginx,
  );
  return match?.[1] ?? '';
};

describe('Content Security Policy', () => {
  it.each([
    ['HTML fallback', readHtmlPolicy],
    ['Nginx header', readNginxPolicy],
  ])(
    'allows only local and blob-backed workers in the %s',
    async (_label, readPolicy) => {
      const policy = await readPolicy();

      expect(policy).not.toBe('');
      expect(extractDirective(policy, 'worker-src')).toEqual([
        "'self'",
        'blob:',
      ]);
      expect(extractDirective(policy, 'script-src')).not.toContain('blob:');
    },
  );
});
