import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const formpacksDir = path.join(repoRoot, 'app', 'public', 'formpacks');

const uniqueId = (prefix = 'tpack') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const DOCX_A4 = 'docx/a4.docx';
const DOCX_MAPPING = 'docx/mapping.json';
const PACK_TITLE = 'pack.title';
const PACK_DESC = 'pack.desc';
const VALIDATE_FORMPACKS_MODULE = '../../scripts/validate-formpacks.mjs';
type ValidateFormpacksModule =
  typeof import('../../scripts/validate-formpacks.mjs');

async function createFormpackFixture(id: string) {
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
    docx: { templates: { a4: DOCX_A4 }, mapping: DOCX_MAPPING },
  };

  const schema = {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  };

  const mapping = {
    fields: [{ var: 'name' }],
    loops: [],
    i18n: { prefix: 'pack' },
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
  await fs.writeFile(
    path.join(base, 'examples', 'example.json'),
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
    path.join(base, 'docx', 'mapping.json'),
    JSON.stringify(mapping, null, 2),
  );
  await fs.writeFile(
    path.join(base, 'docx', 'a4.docx'),
    Buffer.from('fake docx'),
  );

  return base;
}

describe('validate-formpacks I/O integration', () => {
  it('validateContract returns manifest and translations for a valid formpack', async () => {
    const mod = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { validateContract } = mod;

    const id = uniqueId('valid');
    const base = await createFormpackFixture(id);

    try {
      const errors: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
      const result = await validateContract({ formpackId: id, errors });
      expect(result.manifest).toBeDefined();
      expect(JSON.stringify(result.manifest)).toContain(id);
      expect(JSON.stringify(result.translations)).toContain(PACK_TITLE);
      expect(errors.size).toBe(0);
    } finally {
      await fs.rm(base, { recursive: true, force: true });
    }
  });

  it('validateContract collects errors for missing required files', async () => {
    const mod = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { validateContract } = mod;

    const id = uniqueId('missing');
    const base = path.join(formpacksDir, id);
    await fs.mkdir(base, { recursive: true });
    // only write a manifest, leave out schema/example/i18n
    const manifest = {
      id,
      version: '1.0',
      defaultLocale: 'de',
      locales: ['de'],
      titleKey: PACK_TITLE,
      descriptionKey: PACK_DESC,
      exports: ['docx', 'json'],
      docx: { templates: { a4: DOCX_A4 }, mapping: DOCX_MAPPING },
    };
    await fs.writeFile(
      path.join(base, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    );

    try {
      const errors: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
      await validateContract({ formpackId: id, errors });
      expect(errors.has(id)).toBe(true);
      const packErrors = errors.get(id) || [];
      expect(packErrors.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(base, { recursive: true, force: true });
    }
  });

  it('validateTemplate records warnings when createReport throws and rejects unsafe paths', async () => {
    // Ensure module is freshly loaded with mocked docx-templates
    vi.resetModules();
    vi.doMock('docx-templates', () => ({
      createReport: vi.fn().mockRejectedValue(new Error('boom')),
    }));
    const mod = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { validateTemplate } = mod;

    const id = uniqueId('tpl');
    const base = await createFormpackFixture(id);

    try {
      const errors: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
      const warnings: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
      // unsafe template path should produce an error
      await validateTemplate({
        templatePath: '/abs/path.docx',
        mappingPath: DOCX_MAPPING,
        formpackId: id,
        errors,
        warnings,
        translations: {},
      });
      expect(errors.has(id)).toBe(true);

      // valid relative path but createReport throws -> recorded as warning
      const errors2: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
      const warnings2: Map<
        string,
        Array<{ contextPath: string; error: Error }>
      > = new Map();
      await validateTemplate({
        templatePath: DOCX_A4,
        mappingPath: DOCX_MAPPING,
        formpackId: id,
        errors: errors2,
        warnings: warnings2,
        translations: {},
      });
      expect(warnings2.has(id)).toBe(true);
      const w = warnings2.get(id) || [];
      expect(w.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(base, { recursive: true, force: true });
      vi.resetModules();
    }
  });

  it('listFormpacks returns the specific id when provided', async () => {
    const mod = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { listFormpacks } = mod;

    const id = uniqueId('list');
    const base = path.join(formpacksDir, id);
    await fs.mkdir(base, { recursive: true });
    try {
      const res = await listFormpacks(id);
      expect(Array.isArray(res)).toBe(true);
      expect(res).toContain(id);
    } finally {
      await fs.rm(base, { recursive: true, force: true });
    }
  });

  it('readJson parses a JSON file correctly', async () => {
    const mod = (await import(
      VALIDATE_FORMPACKS_MODULE
    )) as unknown as ValidateFormpacksModule;
    const { readJson } = mod;

    const tmp = path.join(process.cwd(), 'tmp-read-json.json');
    await fs.writeFile(tmp, JSON.stringify({ a: 1 }));
    try {
      await expect(readJson(tmp)).resolves.toEqual({ a: 1 });
    } finally {
      await fs.rm(tmp, { force: true });
    }
  });
});
