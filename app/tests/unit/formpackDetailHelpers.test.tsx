import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

const mocked = vi.hoisted(() => ({
  isCompletedCase0Path: vi.fn(),
  isFormpackVisible: vi.fn(),
  isMedicationKey: vi.fn(),
  loadFormpackI18n: vi.fn(),
  loadFormpackManifest: vi.fn(),
  loadFormpackSchema: vi.fn(),
  loadFormpackUiSchema: vi.fn(),
  normalizeDecisionAnswers: vi.fn(),
  resolveDecisionTree: vi.fn(),
  resolveMedicationProfile: vi.fn(),
  getVisibleMedicationKeys: vi.fn(),
}));

vi.mock('../../src/i18n/formpack', () => ({
  loadFormpackI18n: mocked.loadFormpackI18n,
}));

vi.mock('../../src/formpacks/doctor-letter/decisionAnswers', () => ({
  isCompletedCase0Path: mocked.isCompletedCase0Path,
  normalizeDecisionAnswers: mocked.normalizeDecisionAnswers,
}));

vi.mock('../../src/formpacks/offlabel-antrag/medications', () => ({
  getVisibleMedicationKeys: mocked.getVisibleMedicationKeys,
  isMedicationKey: mocked.isMedicationKey,
  resolveMedicationProfile: mocked.resolveMedicationProfile,
}));

vi.mock('../../src/formpacks', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/formpacks')>();
  return {
    ...original,
    isFormpackVisible: mocked.isFormpackVisible,
    loadFormpackManifest: mocked.loadFormpackManifest,
    loadFormpackSchema: mocked.loadFormpackSchema,
    loadFormpackUiSchema: mocked.loadFormpackUiSchema,
    resolveDecisionTree: mocked.resolveDecisionTree,
  };
});

import { __formpackDetailTestUtils as detail } from '../../src/pages/FormpackDetailPage';
import { FormpackLoaderError } from '../../src/formpacks';

describe('formpack detail helpers', () => {
  beforeEach(() => {
    mocked.isCompletedCase0Path.mockReset();
    mocked.isFormpackVisible.mockReset();
    mocked.isMedicationKey.mockReset();
    mocked.loadFormpackI18n.mockReset();
    mocked.loadFormpackManifest.mockReset();
    mocked.loadFormpackSchema.mockReset();
    mocked.loadFormpackUiSchema.mockReset();
    mocked.normalizeDecisionAnswers.mockReset();
    mocked.resolveDecisionTree.mockReset();
    mocked.resolveMedicationProfile.mockReset();
    mocked.getVisibleMedicationKeys.mockReset();
  });

  it('loads formpack assets and returns not-found for invisible formpacks', async () => {
    mocked.loadFormpackManifest.mockResolvedValue({
      id: 'x',
      visibility: 'dev',
    });
    mocked.isFormpackVisible.mockReturnValue(false);

    const result = await detail.loadFormpackAssets('x', 'de', (key) => key);

    expect(result).toEqual({
      manifest: null,
      schema: null,
      uiSchema: null,
      errorMessage: 'formpackNotFound',
    });
    expect(mocked.loadFormpackI18n).not.toHaveBeenCalled();
  });

  it('loads schema and ui schema for visible formpacks', async () => {
    mocked.loadFormpackManifest.mockResolvedValue({
      id: 'x',
      visibility: 'public',
    });
    mocked.isFormpackVisible.mockReturnValue(true);
    mocked.loadFormpackSchema.mockResolvedValue({ type: 'object' });
    mocked.loadFormpackUiSchema.mockResolvedValue({});
    mocked.loadFormpackI18n.mockResolvedValue(undefined);

    const result = await detail.loadFormpackAssets('x', 'de', (key) => key);

    expect(result.errorMessage).toBeNull();
    expect(result.manifest).toMatchObject({ id: 'x' });
    expect(mocked.loadFormpackI18n).toHaveBeenCalledWith('x', 'de');
  });

  it('maps loader errors and generic errors to translated messages', () => {
    const loaderError = new FormpackLoaderError('schema_invalid', 'boom');
    expect(detail.buildErrorMessage(loaderError, (key) => key)).toBe(
      'formpackSchemaInvalid',
    );
    expect(detail.buildErrorMessage(new Error('plain'), (key) => key)).toBe(
      'plain',
    );
    expect(detail.buildErrorMessage(123, (key) => key)).toBe(
      'formpackLoadError',
    );
  });

  it('detects json encryption runtime errors and envelopes', () => {
    expect(detail.isJsonEncryptionRuntimeError(null)).toBe(false);
    expect(
      detail.isJsonEncryptionRuntimeError({
        name: 'JsonEncryptionError',
        code: 'decrypt_failed',
      }),
    ).toBe(true);
    expect(detail.tryParseEncryptedEnvelope('')).toBeNull();
    expect(detail.tryParseEncryptedEnvelope('123')).toBeNull();
    expect(detail.tryParseEncryptedEnvelope('not-json')).toBeNull();
    expect(detail.tryParseEncryptedEnvelope('{"kind":"x"}')).toBeNull();
    expect(
      detail.tryParseEncryptedEnvelope(
        '{"kind":"mecfs-paperwork-json-encrypted","cipher":"AES-GCM"}',
      ),
    ).toMatchObject({ kind: 'mecfs-paperwork-json-encrypted' });
  });

  it('handles decision visibility and case-0 hiding logic', () => {
    const decisionUi: Record<string, unknown> = {};
    const visibility: Parameters<typeof detail.applyFieldVisibility>[1] = {
      q1: true,
      q2: false,
      q3: true,
      q4: false,
      q5: true,
      q6: false,
      q7: true,
      q8: false,
      resolvedCaseText: true,
    };
    detail.applyFieldVisibility(decisionUi, visibility);
    expect((decisionUi.q2 as Record<string, unknown>)['ui:widget']).toBe(
      'hidden',
    );
    expect((decisionUi.q4 as Record<string, unknown>)['ui:widget']).toBe(
      'hidden',
    );

    mocked.normalizeDecisionAnswers.mockReturnValue({});
    mocked.resolveDecisionTree.mockReturnValue({ caseId: 1 });
    expect(detail.shouldHideCase0Result({} as never)).toBe(false);
    mocked.resolveDecisionTree.mockReturnValue({ caseId: 0 });
    mocked.isCompletedCase0Path.mockReturnValue(true);
    expect(detail.shouldHideCase0Result({} as never)).toBe(false);
    mocked.isCompletedCase0Path.mockReturnValue(false);
    expect(detail.shouldHideCase0Result({} as never)).toBe(true);
  });

  it('merges dummy patches and normalizes offlabel request variants', () => {
    expect(detail.toStringArray(['a', 1, 'b'])).toEqual(['a', 'b']);
    expect(detail.hasSameStringArray(['a'], ['a'])).toBe(true);
    expect(detail.hasSameStringArray(['a'], ['b'])).toBe(false);
    expect(detail.mergeDummyPatch({ a: 1 }, undefined)).toEqual({ a: 1 });
    expect(detail.mergeDummyPatch({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    expect(detail.mergeDummyPatch({ a: 1 }, ['x'])).toEqual(['x']);

    mocked.getVisibleMedicationKeys.mockReturnValue(['med-a', 'other']);
    mocked.isMedicationKey.mockImplementation(
      (value: unknown) => value === 'med-a',
    );
    mocked.resolveMedicationProfile.mockReturnValue({
      isOther: false,
      indications: [{ key: 'indication-a' }],
    });
    expect(
      detail.normalizeOfflabelRequest(
        { drug: 'med-a', selectedIndicationKey: 'missing' },
        false,
      ),
    ).toMatchObject({
      drug: 'med-a',
      selectedIndicationKey: 'indication-a',
    });

    mocked.resolveMedicationProfile.mockReturnValue({
      isOther: true,
      indications: [{ key: 'ignored' }],
    });
    expect(
      detail.normalizeOfflabelRequest(
        { drug: 'med-a', selectedIndicationKey: 'ignored', other: true },
        false,
      ),
    ).toMatchObject({
      drug: 'med-a',
      other: true,
    });
  });

  it('builds dynamic offlabel schema enums and keeps unchanged schemas intact', () => {
    mocked.getVisibleMedicationKeys.mockReturnValue(['med-a', 'other']);
    mocked.isMedicationKey.mockImplementation(
      (value: unknown) => value === 'med-a',
    );
    mocked.resolveMedicationProfile.mockReturnValue({
      isOther: false,
      indications: [{ key: 'k1' }, { key: 'k2' }],
    });

    const schema = {
      type: 'object',
      properties: {
        request: {
          type: 'object',
          properties: {
            drug: { type: 'string', enum: ['med-a'] },
            selectedIndicationKey: { type: 'string', enum: ['old'] },
          },
        },
      },
    } as RJSFSchema;

    const next = detail.buildOfflabelFormSchema(
      schema,
      { request: { drug: 'med-a' } },
      false,
    );
    expect(next).not.toBe(schema);
    const requestNode = (next.properties as Record<string, unknown>)
      .request as {
      properties: Record<string, unknown>;
    };
    expect((requestNode.properties.drug as { enum: string[] }).enum).toEqual([
      'med-a',
      'other',
    ]);
    expect(
      (requestNode.properties.selectedIndicationKey as { enum: string[] }).enum,
    ).toEqual(['k1', 'k2']);

    expect(
      detail.buildOfflabelFormSchema(
        { type: 'object' } as RJSFSchema,
        { request: {} },
        false,
      ),
    ).toEqual({ type: 'object' });

    const unchangedSchema = {
      type: 'object',
      properties: {
        request: {
          type: 'object',
          properties: {
            drug: { type: 'string', enum: ['med-a', 'other'] },
            selectedIndicationKey: { type: 'string', enum: ['k1', 'k2'] },
          },
        },
      },
    } as RJSFSchema;
    expect(
      detail.buildOfflabelFormSchema(
        unchangedSchema,
        { request: { drug: 'med-a' } },
        false,
      ),
    ).toBe(unchangedSchema);

    expect(
      detail.buildOfflabelFormSchema(
        {
          type: 'object',
          properties: {
            request: {
              type: 'object',
              properties: {
                drug: { type: 'string' },
                selectedIndicationKey: null,
              },
            },
          },
        } as unknown as RJSFSchema,
        { request: {} },
        false,
      ),
    ).toMatchObject({
      type: 'object',
    });

    const structuredCloneSpy = vi
      .spyOn(globalThis, 'structuredClone')
      .mockReturnValueOnce({} as RJSFSchema)
      .mockReturnValueOnce({
        type: 'object',
        properties: {},
      } as RJSFSchema)
      .mockReturnValueOnce({
        type: 'object',
        properties: {
          request: { type: 'object', properties: {} },
        },
      } as RJSFSchema);
    try {
      expect(
        detail.buildOfflabelFormSchema(
          schema,
          { request: { drug: 'med-a' } },
          false,
        ),
      ).toBe(schema);
      expect(
        detail.buildOfflabelFormSchema(
          schema,
          { request: { drug: 'med-a' } },
          false,
        ),
      ).toBe(schema);
      expect(
        detail.buildOfflabelFormSchema(
          schema,
          { request: { drug: 'med-a' } },
          false,
        ),
      ).toBe(schema);
    } finally {
      structuredCloneSpy.mockRestore();
    }
  });

  it('orders keys, labels, and paths for preview rendering', () => {
    expect(
      detail.getOrderedKeys(
        { type: 'object', properties: { b: {}, a: {} } } as RJSFSchema,
        { 'ui:order': ['a', '*'] } as UiSchema,
        { c: 1 },
      ),
    ).toEqual(['a', 'b', 'c']);
    expect(
      detail.getUiSchemaNode({ foo: { 'ui:title': 'Foo' } }, 'foo'),
    ).toEqual({ 'ui:title': 'Foo' });
    expect(
      detail.getItemSchema({ items: [{ type: 'string' }] } as RJSFSchema),
    ).toBeDefined();
    expect(
      detail.getItemUiSchema({
        items: [{ 'ui:title': 'x' }],
      } as unknown as UiSchema),
    ).toEqual({ 'ui:title': 'x' });
    expect(detail.buildFieldPath('child', 'parent')).toBe('parent.child');
    expect(detail.normalizeParagraphs([' x ', null, ''])).toEqual(['x']);
    expect(detail.getLabel('fallback', undefined, undefined)).toBe('fallback');
  });

  it('renders offlabel preview blocks and documents', () => {
    expect(
      detail.getOfflabelPreviewBlockKey('doc', { kind: 'pageBreak' }),
    ).toBe('doc-pageBreak');
    const headingMarkup = renderToStaticMarkup(
      <>
        {detail.renderOfflabelPreviewBlock('doc', {
          kind: 'heading',
          text: 'H',
        })}
      </>,
    );
    expect(headingMarkup).toContain('<h3>H</h3>');
    const listMarkup = renderToStaticMarkup(
      <>
        {detail.renderOfflabelPreviewBlock('doc', {
          kind: 'list',
          items: ['a', 'b'],
        })}
      </>,
    );
    expect(listMarkup).toContain('<li>a</li>');
    expect(
      detail.renderOfflabelPreviewBlock('doc', { kind: 'list', items: [] }),
    ).toBeNull();

    const docMarkup = renderToStaticMarkup(
      <>
        {detail.renderOfflabelPreviewDocument({
          id: 'part1',
          title: 't',
          blocks: [{ kind: 'paragraph', text: 'P' }],
        })}
      </>,
    );
    expect(docMarkup).toContain('<p>P</p>');
  });

  it('builds decision preview context and array/object previews', () => {
    const paragraphs = detail.getDecisionParagraphsForEntry(
      'line one\n\nline two',
      [],
    );
    expect(paragraphs).toEqual(['line one', 'line two']);
    expect(detail.getDecisionParagraphsForEntry(42, [])).toEqual([]);
    expect(detail.hasDecisionCaseText({ resolvedCaseText: 'x' })).toBe(true);
    expect(
      detail.getDecisionVisibleKeys(['a', 'caseParagraphs'], ['x'], true),
    ).toEqual(['a']);
    expect(
      detail.resolveDecisionCaseTextValue('x', 'other.path', ['P1']),
    ).toBeNull();
    expect(
      detail.resolveDecisionCaseTextValue('x', 'decision.caseText', ['P1']),
    ).not.toBeNull();
    expect(
      detail.resolveDecisionCaseTextValue(
        { value: 'x' },
        'decision.caseText',
        [],
      ),
    ).toBeNull();

    const context = detail.buildDecisionPreviewContext(
      {
        caseParagraphs: ['P1'],
        caseText: 'x',
      },
      'decision',
      ['caseText', 'caseParagraphs'],
      (entry) => String(entry),
    );
    expect(context.visibleKeys).toEqual(['caseText']);

    const objectMarkup = renderToStaticMarkup(
      <>
        {detail.renderPreviewObject({ a: 'x' }, undefined, undefined, 'Label')}
      </>,
    );
    expect(objectMarkup).toContain('Label');
    expect(detail.renderPreviewObject({}, undefined, undefined)).toBeNull();
    const arrayMarkup = renderToStaticMarkup(
      <>
        {detail.renderPreviewArray(
          ['x', 'y'],
          undefined,
          undefined,
          'List',
          (entry) => String(entry),
        )}
      </>,
    );
    expect(arrayMarkup).toContain('<li>x</li>');
    expect(detail.renderPreviewArray([], undefined, undefined)).toBeNull();

    const paragraphArrayMarkup = renderToStaticMarkup(
      <>
        {detail.renderPreviewArray(
          ['P1', 'P2'],
          undefined,
          undefined,
          'Decision',
          undefined,
          'decision.caseParagraphs',
          'decision',
        )}
      </>,
    );
    expect(paragraphArrayMarkup).toContain('P1');

    const nonStringArrayMarkup = renderToStaticMarkup(
      <>{detail.renderPreviewArray([null, undefined], undefined, undefined)}</>,
    );
    expect(nonStringArrayMarkup).toBe('');

    const nestedObjectPreview = detail.buildPreviewEntry({
      entry: { nested: 'value' },
      key: 'entry',
      childSchema: { type: 'object' } as RJSFSchema,
      childUi: {} as UiSchema,
      childLabel: 'Entry',
      resolveValue: (value) => String(value),
      fieldPath: 'root.entry',
      sectionKey: 'root',
    });
    expect(nestedObjectPreview?.type).toBe('nested');

    const fallbackArrayMarkup = renderToStaticMarkup(
      <>{detail.renderPreviewArray(['alpha'], undefined, undefined)}</>,
    );
    expect(fallbackArrayMarkup).toContain('alpha');
  });

  it('exposes static helpers for letter layout detection', () => {
    expect(detail.hasLetterLayout('doctor-letter')).toBe(true);
    expect(detail.hasLetterLayout('offlabel-antrag')).toBe(true);
    expect(detail.hasLetterLayout('notfallpass')).toBe(false);
  });

  it('maps import and encryption errors to localized keys', () => {
    const t = (key: string) => key;
    expect(
      detail.resolveImportErrorMessage({ code: 'unknown_formpack' }, t),
    ).toBe('importUnknownFormpack');
    expect(
      detail.resolveImportErrorMessage({ code: 'schema_mismatch' }, t),
    ).toBe('importSchemaMismatch');
    expect(
      detail.resolveImportErrorMessage({ code: 'formpack_mismatch' }, t),
    ).toBe('importFormpackMismatch');
    expect(
      detail.resolveImportErrorMessage({ code: 'invalid_revisions' }, t),
    ).toBe('importInvalidRevisions');
    expect(
      detail.resolveImportErrorMessage({ code: 'unsupported_locale' }, t),
    ).toBe('importUnsupportedLocale');
    expect(detail.resolveImportErrorMessage({ code: 'other' }, t)).toBe(
      'importInvalidPayload',
    );

    expect(
      detail.resolveJsonEncryptionErrorMessage(
        { name: 'JsonEncryptionError', code: 'crypto_unsupported' },
        'import',
        t,
      ),
    ).toBe('jsonEncryptionUnsupported');
    expect(
      detail.resolveJsonEncryptionErrorMessage(
        { name: 'JsonEncryptionError', code: 'decrypt_failed' },
        'import',
        t,
      ),
    ).toBe('importPasswordInvalid');
    expect(
      detail.resolveJsonEncryptionErrorMessage(
        { name: 'JsonEncryptionError', code: 'invalid_envelope' },
        'import',
        t,
      ),
    ).toBe('importEncryptedPayloadInvalid');
    expect(
      detail.resolveJsonEncryptionErrorMessage(new Error('x'), 'export', t),
    ).toBe('formpackJsonExportError');
    expect(
      detail.resolveJsonEncryptionErrorMessage(new Error('x'), 'import', t),
    ).toBe('importInvalidJson');
  });

  it('extracts form action ids from click targets', () => {
    const action = 'docx-export';
    expect(detail.getActionButtonDataAction(null)).toBeNull();
    const div = document.createElement('div');
    expect(detail.getActionButtonDataAction(div)).toBeNull();
    const button = document.createElement('button');
    button.className = 'app__button';
    button.dataset.action = action;
    const span = document.createElement('span');
    span.textContent = 'reset';
    button.appendChild(span);
    expect(detail.getActionButtonDataAction(span)).toBe(action);
    expect(detail.getActionButtonDataAction(span.firstChild)).toBe(action);
  });
});
