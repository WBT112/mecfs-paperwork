import { describe, it, expect } from 'vitest';
import {
  isRecord,
  isSafeAssetPath,
  setPathValue,
  setNested,
  getNested,
  buildI18nContext,
  buildDummyContext,
  buildAdditionalJsContext,
  collectErrors,
  validateManifest,
  parseArgs,
  validateExample,
  createLogger,
} from '../../scripts/validate-formpacks.mjs';

describe('validate-formpacks helpers', () => {
  it('isRecord identifies plain objects only', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord('str')).toBe(false);
  });

  it('isSafeAssetPath validates relative safe paths', () => {
    expect(isSafeAssetPath('templates/a4.docx')).toBe(true);
    expect(isSafeAssetPath('/abs/path')).toBe(false);
    expect(isSafeAssetPath('..\\secret')).toBe(false);
    expect(isSafeAssetPath('')).toBe(false);
  });

  it('setPathValue sets nested values and prevents prototype pollution', () => {
    const target = {};
    setPathValue(target, 'a.b.c', 'x');
    expect(target.a.b.c).toBe('x');
    expect(Object.getPrototypeOf(target.a)).toBe(null);

    // attempt prototype pollution should be ignored
    setPathValue(target, '__proto__.polluted', true);
    expect(Object.prototype.polluted).toBe(undefined);
  });

  it('setNested/getNested create and read nested values', () => {
    const obj = {};
    setNested(obj, 'p.q', 42);
    // leaf values are primitives; getNested returns object nodes
    expect(obj.p.q).toBe(42);
    expect(getNested(obj, 'p')).toBe(obj.p);
    expect(Object.getPrototypeOf(obj.p)).toBe(null);
    expect(getNested(obj, 'p.q')).toBe(undefined);
    expect(getNested(obj, 'no.such')).toBe(undefined);
  });

  it('buildI18nContext produces nested t and __PACK_ID__ alias', () => {
    const translations = { 'pack.title': 'T', 'pack.description': 'D', other: 123 };
    const { t } = buildI18nContext(translations, 'pack');
    expect(t.pack.title).toBe('T');
    expect(t.__PACK_ID__).toBe(t.pack);
  });

  it('buildDummyContext fills example fields and loops', () => {
    const mapping = {
      i18n: { prefix: 'pack' },
      fields: [{ var: 'person.name' }],
      loops: [{ var: 'items' }],
    };
    const translations = { 'pack.title': 'T' };
    const ctx = buildDummyContext(mapping, translations);
    expect(ctx.t.pack.title).toBe('T');
    expect(ctx.person.name).toBe('Example');
    expect(Array.isArray(ctx.items)).toBe(true);
    expect(ctx.items.length).toBeGreaterThan(0);
  });

  it('buildAdditionalJsContext provides t function and formatters', () => {
    const tContext = { 'pack.title': 'T' };
    const ctx = buildAdditionalJsContext(tContext);
    expect(typeof ctx.t('x')).toBe('string');
    expect(ctx.t['pack.title']).toBe('T');
    expect(ctx.formatDate(null)).toBe('');
    expect(ctx.formatDate('2020')).toBe('2020');
  });

  it('collectErrors accumulates errors for a formpack', () => {
    const errors = new Map();
    collectErrors(errors, 'pack1', '/p', 'oops');
    expect(errors.has('pack1')).toBe(true);
    expect(errors.get('pack1').length).toBe(1);

    collectErrors(errors, 'pack1', '/p2', ['err1', 'err2']);
    expect(errors.get('pack1').length).toBe(3);
  });

  it('validateManifest accepts valid manifest and rejects invalid ones', () => {
    const errors = new Map();
    const valid = {
      id: 'test',
      version: '1.0',
      defaultLocale: 'de',
      locales: ['de', 'en'],
      titleKey: 'p.title',
      descriptionKey: 'p.desc',
      exports: ['docx', 'json'],
      docx: { templates: { a4: 'templates/a4.docx' }, mapping: 'docx/mapping.json' },
    };
    expect(validateManifest(valid, 'test', '/fake', errors)).toBe(true);
    expect(errors.size).toBe(0);

    const errors2 = new Map();
    const invalid = { ...valid };
    delete invalid.id;
    expect(validateManifest(invalid, 'test', '/fake', errors2)).toBe(false);
    expect(errors2.size).toBeGreaterThan(0);
  });

  it('parseArgs extracts --id flag', () => {
    expect(parseArgs(['--id', 'zzz']).id).toBe('zzz');
    expect(parseArgs([]).id).toBe(null);
  });

  it('validateExample returns no errors for valid examples', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
    expect(validateExample(schema, { name: 'x' })).toEqual([]);
    const msgs = validateExample(schema, { name: 123 });
    expect(msgs.length).toBeGreaterThan(0);
  });

  it('createLogger writes colored messages to provided stream', () => {
    const lines = [];
    const stream = { write: (s: string) => lines.push(s) };
    const logger = createLogger(stream as any);
    logger.info('hello');
    logger.pass('ok');
    logger.fail('bad');
    logger.warn('warn');
    expect(lines.some((l) => l.includes('hello'))).toBe(true);
    expect(lines.some((l) => l.includes('\u001b[32mok\u001b[0m'))).toBe(true);
  });
});
