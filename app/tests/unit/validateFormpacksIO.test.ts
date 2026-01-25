import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const formpacksDir = path.join(repoRoot, 'formpacks');

const uniqueId = (prefix = 'tpack') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function createFormpackFixture(id) {
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
    docx: { templates: { a4: 'docx/a4.docx' }, mapping: 'docx/mapping.json' },
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
    JSON.stringify({ 'pack.title': 'TDE', 'pack.desc': 'DDE' }),
  );
  await fs.writeFile(
    path.join(base, 'i18n', 'en.json'),
    JSON.stringify({ 'pack.title': 'TEN', 'pack.desc': 'DEN' }),
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
    const mod = await import('../../scripts/validate-formpacks.mjs');
    const { validateContract } = mod;

    const id = uniqueId('valid');
    const base = await createFormpackFixture(id);

    try {
      const errors = new Map();
      const result = await validateContract({ formpackId: id, errors });
      expect(result.manifest).toBeDefined();
      expect(result.manifest.id).toBe(id);
      expect(result.translations['pack.title']).toBeDefined();
      expect(errors.size).toBe(0);
    } finally {
      await fs.rm(base, { recursive: true, force: true });
    }
  });

  it('validateContract collects errors for missing required files', async () => {
    const mod = await import('../../scripts/validate-formpacks.mjs');
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
      titleKey: 'pack.title',
      descriptionKey: 'pack.desc',
      exports: ['docx', 'json'],
      docx: { templates: { a4: 'docx/a4.docx' }, mapping: 'docx/mapping.json' },
    };
    await fs.writeFile(
      path.join(base, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    );

    try {
      const errors = new Map();
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
    const mod = await import('../../scripts/validate-formpacks.mjs');
    const { validateTemplate } = mod;

    const id = uniqueId('tpl');
    const base = await createFormpackFixture(id);

    try {
      const errors = new Map();
      const warnings = new Map();
      // unsafe template path should produce an error
      await validateTemplate({
        templatePath: '/abs/path.docx',
        mappingPath: 'docx/mapping.json',
        formpackId: id,
        errors,
        warnings,
        translations: {},
      });
      expect(errors.has(id)).toBe(true);

      // valid relative path but createReport throws -> recorded as warning
      const errors2 = new Map();
      const warnings2 = new Map();
      await validateTemplate({
        templatePath: 'docx/a4.docx',
        mappingPath: 'docx/mapping.json',
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
    const mod = await import('../../scripts/validate-formpacks.mjs');
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
    const mod = await import('../../scripts/validate-formpacks.mjs');
    const { readJson } = mod;

    const tmp = path.join(process.cwd(), 'tmp-read-json.json');
    await fs.writeFile(tmp, JSON.stringify({ a: 1 }));
    try {
      const obj = await readJson(tmp);
      expect(obj).toEqual({ a: 1 });
    } finally {
      await fs.rm(tmp, { force: true });
    }
  });
});
