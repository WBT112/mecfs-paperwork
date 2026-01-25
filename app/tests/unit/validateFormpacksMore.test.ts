/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const formpacksDir = path.join(repoRoot, 'formpacks');
const uniqueId = (prefix = 'tpack') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function writeStandardFiles(base, manifest) {
  await fs.mkdir(path.join(base, 'i18n'), { recursive: true });
  await fs.mkdir(path.join(base, 'docx'), { recursive: true });
  await fs.mkdir(path.join(base, 'examples'), { recursive: true });
  await fs.writeFile(
    path.join(base, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  await fs.writeFile(
    path.join(base, 'schema.json'),
    JSON.stringify({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    }),
  );
  await fs.writeFile(path.join(base, 'ui.schema.json'), JSON.stringify({}));
  await fs.writeFile(
    path.join(base, 'examples', 'example.json'),
    JSON.stringify({ name: 'Alice' }),
  );
  await fs.writeFile(
    path.join(base, 'i18n', 'de.json'),
    JSON.stringify({ 'pack.title': 'TDE', 'pack.desc': 'DDE' }),
  );
  await fs.writeFile(
    path.join(base, 'i18n', 'en.json'),
    JSON.stringify({ 'pack.title': 'TEN', 'pack.desc': 'DEN' }),
  );
  await fs.writeFile(
    path.join(base, 'docx', 'mapping.json'),
    JSON.stringify({ fields: [{ var: 'name' }], loops: [] }),
  );
  await fs.writeFile(path.join(base, 'docx', 'a4.docx'), Buffer.from('fake'));
}

describe('validate-formpacks: extra branches', () => {
  it('detects manifest id mismatch', async () => {
    const id = uniqueId('mismatch');
    const base = path.join(formpacksDir, id);
    const manifest = {
      id: 'other',
      version: '1.0',
      defaultLocale: 'de',
      locales: ['de', 'en'],
      titleKey: 'pack.title',
      descriptionKey: 'pack.desc',
      exports: ['docx', 'json'],
      docx: { templates: { a4: 'docx/a4.docx' }, mapping: 'docx/mapping.json' },
    };
    await fs.mkdir(base, { recursive: true });
    await writeStandardFiles(base, manifest);

    const mod = await import('../../scripts/validate-formpacks.mjs');
    const { validateContract } = mod;
    try {
      const errors = new Map();
      await validateContract({ formpackId: id, errors });
      const pack = errors.get(id) || [];
      expect(
        pack.some((e) =>
          e.error.message.includes('Manifest id does not match'),
        ),
      ).toBe(true);
    } finally {
      await fs.rm(base, { recursive: true, force: true });
    }
  });

  it('detects missing locales and defaultLocale mismatch', async () => {
    const id = uniqueId('locales');
    const base = path.join(formpacksDir, id);
    const manifest = {
      id,
      version: '1.0',
      defaultLocale: 'en',
      locales: ['de'],
      titleKey: 'pack.title',
      descriptionKey: 'pack.desc',
      exports: ['docx'],
      docx: { templates: { a4: 'docx/a4.docx' }, mapping: 'docx/mapping.json' },
    };
    await fs.mkdir(base, { recursive: true });
    await writeStandardFiles(base, manifest);

    const mod = await import('../../scripts/validate-formpacks.mjs');
    const { validateContract } = mod;
    try {
      const errors = new Map();
      await validateContract({ formpackId: id, errors });
      const pack = errors.get(id) || [];
      expect(
        pack.some((e) =>
          /locales must include "de" and "en"|defaultLocale must be one of the manifest locales/i.test(
            e.error.message,
          ),
        ),
      ).toBe(true);
    } finally {
      await fs.rm(base, { recursive: true, force: true });
    }
  });

  it('detects missing exports', async () => {
    const id = uniqueId('unsafe');
    const base = path.join(formpacksDir, id);
    const manifest = {
      id,
      version: '1.0',
      defaultLocale: 'de',
      locales: ['de', 'en'],
      titleKey: 'pack.title',
      descriptionKey: 'pack.desc',
      exports: ['json'],
      docx: { templates: { a4: '/abs/a4.docx' }, mapping: '..\\mapping.json' },
    };
    await fs.mkdir(base, { recursive: true });
    await writeStandardFiles(base, manifest);

    const mod = await import('../../scripts/validate-formpacks.mjs');
    const { validateContract } = mod;
    try {
      const errors = new Map();
      await validateContract({ formpackId: id, errors });
      const pack = errors.get(id) || [];
      // expects message about missing exports
      expect(
        pack.some((e) =>
          e.error.message.includes('Manifest exports must include'),
        ),
      ).toBe(true);
    } finally {
      await fs.rm(base, { recursive: true, force: true });
    }
  });

  it('detects unsafe docx paths when docx export included', async () => {
    const id = uniqueId('unsafe-docx');
    const base = path.join(formpacksDir, id);
    const manifest = {
      id,
      version: '1.0',
      defaultLocale: 'de',
      locales: ['de', 'en'],
      titleKey: 'pack.title',
      descriptionKey: 'pack.desc',
      exports: ['json', 'docx'],
      docx: { templates: { a4: '/abs/a4.docx' }, mapping: '..\\mapping.json' },
    };
    await fs.mkdir(base, { recursive: true });
    await writeStandardFiles(base, manifest);

    const mod = await import('../../scripts/validate-formpacks.mjs');
    const { validateContract } = mod;
    try {
      const errors = new Map();
      await validateContract({ formpackId: id, errors });
      const pack = errors.get(id) || [];
      expect(
        pack.some((e) => e.error.message.includes('docx.templates.a4')),
      ).toBe(true);
      expect(pack.some((e) => e.error.message.includes('docx.mapping'))).toBe(
        true,
      );
    } finally {
      await fs.rm(base, { recursive: true, force: true });
    }
  });

  it('reports missing i18n keys referenced by schema and example mismatches', async () => {
    const id = uniqueId('i18n');
    const base = path.join(formpacksDir, id);
    await fs.mkdir(base, { recursive: true });
    const manifest = {
      id,
      version: '1.0',
      defaultLocale: 'de',
      locales: ['de', 'en'],
      titleKey: 'pack.title',
      descriptionKey: 'pack.desc',
      exports: ['docx', 'json'],
      docx: { templates: { a4: 'docx/a4.docx' }, mapping: 'docx/mapping.json' },
    };
    // schema references a t: key that is missing in translations
    const schema = {
      type: 'object',
      properties: { label: { const: 't:pack.missing' } },
    };
    await fs.writeFile(
      path.join(base, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    );
    await fs.writeFile(
      path.join(base, 'schema.json'),
      JSON.stringify(schema, null, 2),
    );
    await fs.writeFile(path.join(base, 'ui.schema.json'), JSON.stringify({}));
    // example mismatches schema
    await fs.mkdir(path.join(base, 'examples'), { recursive: true });
    await fs.writeFile(
      path.join(base, 'examples', 'example.json'),
      JSON.stringify({ label: 'not-a-match' }),
    );
    await fs.mkdir(path.join(base, 'i18n'), { recursive: true });
    await fs.writeFile(path.join(base, 'i18n', 'de.json'), JSON.stringify({}));
    await fs.writeFile(path.join(base, 'i18n', 'en.json'), JSON.stringify({}));
    await fs.mkdir(path.join(base, 'docx'), { recursive: true });
    await fs.writeFile(
      path.join(base, 'docx', 'mapping.json'),
      JSON.stringify({ fields: [{ var: 'label' }] }),
    );
    await fs.writeFile(path.join(base, 'docx', 'a4.docx'), Buffer.from('fake'));

    const mod = await import('../../scripts/validate-formpacks.mjs');
    const { validateContract } = mod;
    try {
      const errors = new Map();
      await validateContract({ formpackId: id, errors });
      const pack = errors.get(id) || [];
      expect(
        pack.some((e) =>
          e.error.message.includes('Missing i18n key referenced by schema'),
        ),
      ).toBe(true);
      expect(
        pack.some((e) =>
          e.error.message.includes('Example does not match schema'),
        ),
      ).toBe(true);
    } finally {
      await fs.rm(base, { recursive: true, force: true });
    }
  });

  it('validateTemplate records mapping read errors and template read errors', async () => {
    const id = uniqueId('tplerr');
    const base = path.join(formpacksDir, id);
    await fs.mkdir(path.join(base, 'docx'), { recursive: true });
    // mapping is invalid JSON
    await fs.writeFile(path.join(base, 'docx', 'mapping.json'), '{ not: json');
    const mod1 = await import('../../scripts/validate-formpacks.mjs');
    const { validateTemplate } = mod1;
    try {
      const errors = new Map();
      const warnings = new Map();
      await validateTemplate({
        templatePath: 'docx/missing.docx',
        mappingPath: 'docx/mapping.json',
        formpackId: id,
        errors,
        warnings,
        translations: {},
      });
      expect(errors.has(id)).toBe(true);
    } finally {
      await fs.rm(base, { recursive: true, force: true });
    }
  });

  it('run() sets exit code when id not found and passes when templates preflight ok', async () => {
    // case 1: id not found -> exitCode = 1
    vi.resetModules();
    const modA = await import('../../scripts/validate-formpacks.mjs');
    const { run } = modA;
    const oldArgv = process.argv;
    const oldExit = process.exitCode;
    try {
      process.argv = ['node', 'script', '--id', 'no-such-id'];
      process.exitCode = 0;
      await run();
      expect(process.exitCode === 1 || process.exitCode === undefined).toBe(
        true,
      );
    } finally {
      process.argv = oldArgv;
      process.exitCode = oldExit;
    }

    // case 2: valid formpack and createReport succeeds -> pass
    vi.resetModules();
    // mock createReport to succeed
    vi.doMock('docx-templates', () => ({
      createReport: vi.fn().mockResolvedValue(Buffer.from('ok')),
    }));
    const modB = await import('../../scripts/validate-formpacks.mjs');
    const { run: run2 } = modB;

    const id = uniqueId('runok');
    const base = path.join(formpacksDir, id);
    await fs.mkdir(path.join(base, 'i18n'), { recursive: true });
    await fs.mkdir(path.join(base, 'docx'), { recursive: true });
    await fs.mkdir(path.join(base, 'examples'), { recursive: true });
    const manifest = {
      id,
      version: '1.0',
      defaultLocale: 'de',
      locales: ['de', 'en'],
      titleKey: 'pack.title',
      descriptionKey: 'pack.desc',
      exports: ['docx', 'json'],
      docx: {
        templates: { a4: 'docx/a4.docx', wallet: 'docx/wallet.docx' },
        mapping: 'docx/mapping.json',
      },
    };
    await fs.writeFile(
      path.join(base, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    );
    await fs.writeFile(
      path.join(base, 'schema.json'),
      JSON.stringify({ type: 'object' }),
    );
    await fs.writeFile(path.join(base, 'ui.schema.json'), JSON.stringify({}));
    await fs.writeFile(
      path.join(base, 'examples', 'example.json'),
      JSON.stringify({}),
    );
    await fs.writeFile(
      path.join(base, 'i18n', 'de.json'),
      JSON.stringify({ 'pack.title': 'TDE', 'pack.desc': 'DDE' }),
    );
    await fs.writeFile(
      path.join(base, 'i18n', 'en.json'),
      JSON.stringify({ 'pack.title': 'TEN', 'pack.desc': 'DEN' }),
    );
    await fs.writeFile(
      path.join(base, 'docx', 'mapping.json'),
      JSON.stringify({ fields: [] }),
    );
    await fs.writeFile(path.join(base, 'docx', 'a4.docx'), Buffer.from('ok'));
    await fs.writeFile(
      path.join(base, 'docx', 'wallet.docx'),
      Buffer.from('ok'),
    );

    const oldArgv2 = process.argv;
    const oldExit2 = process.exitCode;
    const writes = [];
    const oldWrite = process.stdout.write;
    try {
      process.argv = ['node', 'script'];
      process.exitCode = 0;
      process.stdout.write = (s) => {
        writes.push(String(s));
        return true;
      };
      await run2();
      // expect success message printed
      const out = writes.join('');
      expect(
        out.includes('Formpack validation passed') ||
          out.includes('warning') ||
          out.includes('passed'),
      ).toBe(true);
    } finally {
      process.argv = oldArgv2;
      process.exitCode = oldExit2;
      process.stdout.write = oldWrite;
      await fs.rm(base, { recursive: true, force: true });
      vi.resetModules();
    }
  });
});
