import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const formpacksDir = path.join(repoRoot, 'formpacks');
const uniqueId = (prefix = 'tpack') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const DOCX_A4 = 'docx/a4.docx';
const DOCX_MAPPING = 'docx/mapping.json';
const PACK_TITLE = 'pack.title';
const PACK_DESC = 'pack.desc';
const VALIDATE_FORMPACKS_MODULE = '../../scripts/validate-formpacks.mjs';
type ValidateFormpacksModule =
  typeof import('../../scripts/validate-formpacks.mjs');
const MANIFEST_JSON = 'manifest.json';
const SCHEMA_JSON = 'schema.json';
const UI_SCHEMA_JSON = 'ui.schema.json';
const EXAMPLE_JSON = path.join('examples', 'example.json');
const WALLET_DOCX = 'docx/wallet.docx';

async function writeStandardFiles(
  base: string,
  manifest: Record<string, unknown>,
) {
  await fs.mkdir(path.join(base, 'i18n'), { recursive: true });
  await fs.mkdir(path.join(base, 'docx'), { recursive: true });
  await fs.mkdir(path.join(base, 'examples'), { recursive: true });
  await fs.writeFile(
    path.join(base, MANIFEST_JSON),
    JSON.stringify(manifest, null, 2),
  );
  await fs.writeFile(
    path.join(base, SCHEMA_JSON),
    JSON.stringify({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    }),
  );
  await fs.writeFile(path.join(base, UI_SCHEMA_JSON), JSON.stringify({}));
  await fs.writeFile(
    path.join(base, EXAMPLE_JSON),
    JSON.stringify({ name: 'Alice' }),
  );
  await fs.writeFile(
    path.join(base, 'i18n', 'de.json'),
    JSON.stringify({ [PACK_TITLE]: 'TDE', [PACK_DESC]: 'DDE' }),
  );
  await fs.writeFile(
    path.join(base, 'i18n', 'en.json'),
    JSON.stringify({ [PACK_TITLE]: 'TEN', [PACK_DESC]: 'DEN' }),
  );
  await fs.writeFile(
    path.join(base, DOCX_MAPPING),
    JSON.stringify({ fields: [{ var: 'name' }], loops: [] }),
  );
  await fs.writeFile(path.join(base, DOCX_A4), Buffer.from('fake'));
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
      titleKey: PACK_TITLE,
      descriptionKey: PACK_DESC,
      exports: ['docx', 'json'],
      docx: { templates: { a4: DOCX_A4 }, mapping: DOCX_MAPPING },
    };
    await fs.mkdir(base, { recursive: true });
    await writeStandardFiles(base, manifest);

    const mod = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { validateContract } = mod;
    try {
      const errors: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
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
  }, 15_000);

  it('detects missing locales and defaultLocale mismatch', async () => {
    const id = uniqueId('locales');
    const base = path.join(formpacksDir, id);
    const manifest = {
      id,
      version: '1.0',
      defaultLocale: 'en',
      locales: ['de'],
      titleKey: PACK_TITLE,
      descriptionKey: PACK_DESC,
      exports: ['docx'],
      docx: { templates: { a4: DOCX_A4 }, mapping: DOCX_MAPPING },
    };
    await fs.mkdir(base, { recursive: true });
    await writeStandardFiles(base, manifest);

    const mod = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { validateContract } = mod;
    try {
      const errors: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
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
      titleKey: PACK_TITLE,
      descriptionKey: PACK_DESC,
      exports: ['json'],
      docx: { templates: { a4: '/abs/a4.docx' }, mapping: '..\\mapping.json' },
    };
    await fs.mkdir(base, { recursive: true });
    await writeStandardFiles(base, manifest);

    const mod = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { validateContract } = mod;
    try {
      const errors: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
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
      titleKey: PACK_TITLE,
      descriptionKey: PACK_DESC,
      exports: ['json', 'docx'],
      docx: { templates: { a4: '/abs/a4.docx' }, mapping: '..\\mapping.json' },
    };
    await fs.mkdir(base, { recursive: true });
    await writeStandardFiles(base, manifest);

    const mod = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { validateContract } = mod;
    try {
      const errors: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
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
      titleKey: PACK_TITLE,
      descriptionKey: PACK_DESC,
      exports: ['docx', 'json'],
      docx: { templates: { a4: DOCX_A4 }, mapping: DOCX_MAPPING },
    };
    // schema references a t: key that is missing in translations
    const schema = {
      type: 'object',
      properties: { label: { const: 't:pack.missing' } },
    };
    await fs.writeFile(
      path.join(base, MANIFEST_JSON),
      JSON.stringify(manifest, null, 2),
    );
    await fs.writeFile(
      path.join(base, SCHEMA_JSON),
      JSON.stringify(schema, null, 2),
    );
    await fs.writeFile(path.join(base, UI_SCHEMA_JSON), JSON.stringify({}));
    // example mismatches schema
    await fs.mkdir(path.join(base, 'examples'), { recursive: true });
    await fs.writeFile(
      path.join(base, EXAMPLE_JSON),
      JSON.stringify({ label: 'not-a-match' }),
    );
    await fs.mkdir(path.join(base, 'i18n'), { recursive: true });
    await fs.writeFile(path.join(base, 'i18n', 'de.json'), JSON.stringify({}));
    await fs.writeFile(path.join(base, 'i18n', 'en.json'), JSON.stringify({}));
    await fs.mkdir(path.join(base, 'docx'), { recursive: true });
    await fs.writeFile(
      path.join(base, DOCX_MAPPING),
      JSON.stringify({ fields: [{ var: 'label' }] }),
    );
    await fs.writeFile(path.join(base, DOCX_A4), Buffer.from('fake'));

    const mod = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { validateContract } = mod;
    try {
      const errors: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
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
    const mod1 = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { validateTemplate } = mod1;
    try {
      const errors: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
      const warnings: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
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
    const modA = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { run } = modA;
    const oldArgv = process.argv;
    const oldExit = process.exitCode;
    const oldStdout = process.stdout.write;
    const oldStderr = process.stderr.write;
    try {
      process.argv = ['node', 'script', '--id', 'no-such-id'];
      process.exitCode = 0;
      process.stdout.write = () => true;
      process.stderr.write = () => true;
      await run();
      expect(process.exitCode !== 0).toBe(true);
    } finally {
      process.argv = oldArgv;
      process.exitCode = oldExit;
      process.stdout.write = oldStdout;
      process.stderr.write = oldStderr;
    }

    // case 2: valid formpack and createReport succeeds -> pass
    vi.resetModules();
    // mock createReport to succeed
    vi.doMock('docx-templates', () => ({
      createReport: vi.fn().mockResolvedValue(Buffer.from('ok')),
    }));
    const modB = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
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
      titleKey: PACK_TITLE,
      descriptionKey: PACK_DESC,
      exports: ['docx', 'json'],
      docx: {
        templates: { a4: DOCX_A4, wallet: WALLET_DOCX },
        mapping: DOCX_MAPPING,
      },
    };
    await fs.writeFile(
      path.join(base, MANIFEST_JSON),
      JSON.stringify(manifest, null, 2),
    );
    await fs.writeFile(
      path.join(base, SCHEMA_JSON),
      JSON.stringify({ type: 'object' }),
    );
    await fs.writeFile(path.join(base, UI_SCHEMA_JSON), JSON.stringify({}));
    await fs.writeFile(path.join(base, EXAMPLE_JSON), JSON.stringify({}));
    await fs.writeFile(
      path.join(base, 'i18n', 'de.json'),
      JSON.stringify({ [PACK_TITLE]: 'TDE', [PACK_DESC]: 'DDE' }),
    );
    await fs.writeFile(
      path.join(base, 'i18n', 'en.json'),
      JSON.stringify({ [PACK_TITLE]: 'TEN', [PACK_DESC]: 'DEN' }),
    );
    await fs.writeFile(
      path.join(base, DOCX_MAPPING),
      JSON.stringify({ fields: [] }),
    );
    await fs.writeFile(path.join(base, DOCX_A4), Buffer.from('ok'));
    await fs.writeFile(path.join(base, WALLET_DOCX), Buffer.from('ok'));

    const oldArgv2 = process.argv;
    const oldExit2 = process.exitCode;
    const writes: string[] = [];
    const oldWrite = process.stdout.write;
    try {
      process.argv = ['node', 'script', '--id', id];
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
