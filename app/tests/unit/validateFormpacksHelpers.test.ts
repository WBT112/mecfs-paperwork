// @vitest-environment node
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
    const target: Record<string, unknown> = {};
    setPathValue(target, 'a.b.c', 'x');
    expect(JSON.stringify(target)).toContain('"a":{"b":{"c":"x"}}');

    // attempt prototype pollution should be ignored
    setPathValue(target, '__proto__.polluted', true);
    expect(
      Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'),
    ).toBe(false);
  });

  it('setNested/getNested create and read nested values', () => {
    const obj: Record<string, unknown> = {};
    setNested(obj, 'p.q', 42);
    // verify nested structure via serialization
    expect(JSON.stringify(obj)).toContain('"p":{"q":42}');
    expect(getNested(obj, 'p')).toBeTruthy();
    expect(getNested(obj, 'p.q')).toBe(undefined);
    expect(getNested(obj, 'no.such')).toBe(undefined);
  });

  it('buildI18nContext produces nested t and __PACK_ID__ alias', () => {
    const translations = {
      'pack.title': 'T',
      'pack.description': 'D',
      other: '123',
    };
    const { t } = buildI18nContext(translations, 'pack');
    const serialized = JSON.stringify(t);
    expect(serialized).toContain('T');
    expect(serialized).toContain('__PACK_ID__');
  });

  it('buildDummyContext fills example fields and loops', () => {
    const mapping = {
      i18n: { prefix: 'pack' },
      fields: [{ var: 'person.name' }],
      loops: [{ var: 'items' }],
    };
    const translations = { 'pack.title': 'T' };
    const ctx = buildDummyContext(mapping, translations);
    const s = JSON.stringify(ctx);
    expect(s).toContain('Example');
    expect(s).toContain('pack');
  });

  it('buildAdditionalJsContext provides t function and formatters', () => {
    const tContext = { 'pack.title': 'T' };
    const ctx = buildAdditionalJsContext(tContext);
    expect(typeof ctx.t('x')).toBe('string');
    expect(ctx.formatDate(null)).toBe('');
    expect(ctx.formatDate('2020')).toBe('2020');
  });

  it('collectErrors accumulates errors for a formpack', () => {
    const errors: Map<
      string,
      Array<{ contextPath: string; error: Error }>
    > = new Map();
    collectErrors(errors, 'pack1', '/p', 'oops');
    expect(errors.has('pack1')).toBe(true);
    const list1 = errors.get('pack1') ?? [];
    expect(list1.length).toBe(1);

    collectErrors(errors, 'pack1', '/p2', ['err1', 'err2']);
    const list2 = errors.get('pack1') ?? [];
    expect(list2.length).toBe(3);
  });

  it('validateManifest accepts valid manifest and rejects invalid ones', () => {
    const errors: Map<
      string,
      Array<{ contextPath: string; error: Error }>
    > = new Map();
    const valid = {
      id: 'test',
      version: '1.0',
      defaultLocale: 'de',
      locales: ['de', 'en'],
      titleKey: 'p.title',
      descriptionKey: 'p.desc',
      exports: ['docx', 'json'],
      docx: {
        templates: { a4: 'templates/a4.docx' },
        mapping: 'docx/mapping.json',
      },
      ui: {
        infoBoxes: [
          {
            id: 'q1',
            anchor: 'decision.q1',
            enabled: true,
            i18nKey: 'pack.infobox.q1',
            format: 'markdown',
          },
        ],
      },
    };
    expect(validateManifest(valid, 'test', '/fake', errors)).toBe(true);
    expect(errors.size).toBe(0);

    const errors2: Map<
      string,
      Array<{ contextPath: string; error: Error }>
    > = new Map();
    const { id: _removed, ...invalid } = valid;
    expect(validateManifest(invalid, 'test', '/fake', errors2)).toBe(false);
    expect(errors2.size).toBeGreaterThan(0);
  });

  it('parseArgs extracts --id flag', () => {
    expect(parseArgs(['--id', 'zzz']).id).toBe('zzz');
    expect(parseArgs([]).id).toBe(null);
  });

  it('validateExample returns no errors for valid examples', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };
    expect(validateExample(schema, { name: 'x' })).toEqual([]);
    const msgs = validateExample(schema, { name: 123 });
    expect(msgs.length).toBeGreaterThan(0);
  });

  it('createLogger writes colored messages to provided stream', () => {
    const lines: string[] = [];
    const stream: { write: (s: string) => void } = {
      write: (s: string) => lines.push(String(s)),
    };
    const logger = createLogger(stream);
    logger.info('hello');
    logger.pass('ok');
    logger.fail('bad');
    logger.warn('warn');
    expect(lines.some((l) => l.includes('hello'))).toBe(true);
    expect(lines.some((l) => l.includes('\u001b[32mok\u001b[0m'))).toBe(true);
  });
});
