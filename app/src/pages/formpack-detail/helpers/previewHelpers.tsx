import { resolveDisplayValue } from '../../../lib/displayValueResolver';
import { hasPreviewValue } from '../../../lib/previewValue';
import { getFirstItem, isRecord } from '../../../lib/utils';
import { normalizeParagraphText } from '../../../lib/text/paragraphs';
import type { ReactNode } from 'react';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

type PreviewValueResolver = (
  value: unknown,
  schema?: RJSFSchema,
  uiSchema?: UiSchema,
  fieldPath?: string,
) => ReactNode;

const getOrderedKeys = (
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | null | undefined,
  value: Record<string, unknown>,
): string[] => {
  const schemaProps =
    schemaNode && isRecord(schemaNode.properties)
      ? (schemaNode.properties as Record<string, RJSFSchema>)
      : null;
  const keys = Array.from(
    new Set([
      ...(schemaProps ? Object.keys(schemaProps) : []),
      ...Object.keys(value),
    ]),
  );
  const uiOrderRaw =
    isRecord(uiNode) && Array.isArray(uiNode['ui:order'])
      ? uiNode['ui:order']
      : null;
  if (!uiOrderRaw) {
    return keys;
  }
  const order = uiOrderRaw.filter((entry) => typeof entry === 'string');
  const remaining = keys.filter((key) => !order.includes(key) && key !== '*');
  if (order.includes('*')) {
    const ordered: string[] = [];
    order.forEach((entry) => {
      if (entry === '*') {
        ordered.push(...remaining);
        return;
      }
      if (keys.includes(entry)) {
        ordered.push(entry);
      }
    });
    return ordered;
  }
  return [...order.filter((entry) => entry !== '*'), ...remaining];
};

const getUiSchemaNode = (
  uiNode: UiSchema | null | undefined,
  key: string,
): UiSchema | undefined => {
  if (!isRecord(uiNode)) {
    return undefined;
  }
  const entry = (uiNode as Record<string, unknown>)[key];
  return isRecord(entry) ? (entry as UiSchema) : undefined;
};

const getItemSchema = (
  schemaNode: RJSFSchema | undefined,
): RJSFSchema | undefined =>
  getFirstItem(schemaNode?.items) as RJSFSchema | undefined;

const getItemUiSchema = (
  uiNode: UiSchema | null | undefined,
): UiSchema | undefined => getFirstItem(uiNode?.items) as UiSchema | undefined;

const buildFieldPath = (segment: string, prefix?: string): string =>
  prefix ? `${prefix}.${segment}` : segment;

const normalizeParagraphs = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
};

const isDecisionCaseTextPath = (
  fieldPath?: string,
): fieldPath is 'decision.caseText' | 'decision.resolvedCaseText' =>
  fieldPath === 'decision.caseText' ||
  fieldPath === 'decision.resolvedCaseText';

const isDecisionCaseParagraphsPath = (
  fieldPath?: string,
): fieldPath is 'decision.caseParagraphs' =>
  fieldPath === 'decision.caseParagraphs';

const renderParagraphs = (
  paragraphs: string[],
  keyPrefix: string,
): ReactNode => {
  const counts = new Map<string, number>();

  return (
    <>
      {paragraphs.map((paragraph) => {
        const count = counts.get(paragraph) ?? 0;
        counts.set(paragraph, count + 1);
        const key = `${keyPrefix}-${paragraph}-${count}`;

        return <p key={key}>{paragraph}</p>;
      })}
    </>
  );
};

const hasDecisionCaseText = (value: Record<string, unknown>): boolean =>
  typeof value.caseText === 'string' ||
  typeof value.resolvedCaseText === 'string';

const getDecisionVisibleKeys = (
  keys: string[],
  decisionParagraphs: string[],
  includesDecisionCaseText: boolean,
): string[] =>
  decisionParagraphs.length && includesDecisionCaseText
    ? keys.filter((key) => key !== 'caseParagraphs')
    : keys;

const getDecisionParagraphsForEntry = (
  entry: unknown,
  decisionParagraphs: string[],
): string[] => {
  if (decisionParagraphs.length) {
    return decisionParagraphs;
  }
  if (typeof entry === 'string') {
    return normalizeParagraphText(entry).paragraphs;
  }
  return [];
};

const resolveDecisionCaseTextValue = (
  entry: unknown,
  childPath: string | undefined,
  decisionParagraphs: string[],
): ReactNode | null => {
  if (!isDecisionCaseTextPath(childPath)) {
    return null;
  }

  const paragraphs = getDecisionParagraphsForEntry(entry, decisionParagraphs);
  if (!paragraphs.length) {
    return null;
  }

  return renderParagraphs(paragraphs, childPath);
};

const buildDecisionPreviewContext = (
  value: Record<string, unknown>,
  fieldPath: string | undefined,
  keys: string[],
  resolveWithFallback: PreviewValueResolver,
): { visibleKeys: string[]; resolveValue: PreviewValueResolver } => {
  if (fieldPath !== 'decision') {
    return { visibleKeys: keys, resolveValue: resolveWithFallback };
  }

  const decisionParagraphs = normalizeParagraphs(value.caseParagraphs);
  const visibleKeys = getDecisionVisibleKeys(
    keys,
    decisionParagraphs,
    hasDecisionCaseText(value),
  );
  const resolveValue: PreviewValueResolver = (
    entry,
    schemaNode,
    uiNode,
    childPath,
  ) => {
    const caseText = resolveDecisionCaseTextValue(
      entry,
      childPath,
      decisionParagraphs,
    );
    if (caseText) {
      return caseText;
    }
    return resolveWithFallback(entry, schemaNode, uiNode, childPath);
  };

  return { visibleKeys, resolveValue };
};

const getLabel = (
  key: string,
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | null | undefined,
): string => {
  if (isRecord(uiNode) && typeof uiNode['ui:title'] === 'string') {
    return uiNode['ui:title'];
  }
  if (typeof schemaNode?.title === 'string' && schemaNode.title.length > 0) {
    return schemaNode.title;
  }
  return key;
};

type PreviewEntry =
  | { type: 'row'; node: ReactNode }
  | { type: 'nested'; node: ReactNode };

type PreviewEntryOptions = {
  entry: unknown;
  key: string;
  childSchema: RJSFSchema | undefined;
  childUi: UiSchema | undefined;
  childLabel: string;
  resolveValue: PreviewValueResolver;
  fieldPath: string;
  sectionKey?: string;
};

const buildPreviewRow = (
  key: string,
  label: string,
  entry: unknown,
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | undefined,
  resolveValue: PreviewValueResolver,
  fieldPath: string,
) => (
  <div key={`row-${key}`}>
    <dt>{label}</dt>
    <dd>{resolveValue(entry, schemaNode, uiNode, fieldPath)}</dd>
  </div>
);

const buildPreviewEntry = ({
  entry,
  key,
  childSchema,
  childUi,
  childLabel,
  resolveValue,
  fieldPath,
  sectionKey,
}: PreviewEntryOptions): PreviewEntry | null => {
  if (!hasPreviewValue(entry)) {
    return null;
  }

  const nestedKey = `${sectionKey ?? 'section'}-${key}`;
  if (Array.isArray(entry)) {
    const section = renderPreviewArray(
      entry,
      childSchema,
      childUi,
      childLabel,
      resolveValue,
      fieldPath,
      nestedKey,
    );
    return { type: 'nested', node: section };
  }

  if (isRecord(entry)) {
    const section = renderPreviewObject(
      entry,
      childSchema,
      childUi,
      childLabel,
      resolveValue,
      fieldPath,
      nestedKey,
    );
    return { type: 'nested', node: section };
  }

  return {
    type: 'row',
    node: buildPreviewRow(
      key,
      childLabel,
      entry,
      childSchema,
      childUi,
      resolveValue,
      fieldPath,
    ),
  };
};

const buildArrayItem = (
  entry: unknown,
  index: number,
  itemSchema: RJSFSchema | undefined,
  itemUi: UiSchema | undefined,
  resolveValue: PreviewValueResolver,
  fieldPath: string,
  sectionKey?: string,
): ReactNode | null => {
  if (!hasPreviewValue(entry)) {
    return null;
  }

  const nestedKey = `${sectionKey ?? 'array'}-${index}`;
  if (Array.isArray(entry)) {
    const nested = renderPreviewArray(
      entry,
      itemSchema,
      itemUi,
      undefined,
      resolveValue,
      fieldPath,
      nestedKey,
    );
    return <li key={`nested-${index}`}>{nested}</li>;
  }

  if (isRecord(entry)) {
    const nested = renderPreviewObject(
      entry,
      itemSchema,
      itemUi,
      undefined,
      resolveValue,
      fieldPath,
      nestedKey,
    );
    return <li key={`object-${index}`}>{nested}</li>;
  }

  return (
    <li key={`value-${index}`}>
      {resolveValue(entry, itemSchema, itemUi, fieldPath)}
    </li>
  );
};

function resolvePreviewValueFallback(
  entryValue: unknown,
  entrySchema?: RJSFSchema,
  entryUi?: UiSchema,
  entryFieldPath?: string,
): ReactNode {
  return resolveDisplayValue(entryValue, {
    schema: entrySchema,
    uiSchema: entryUi,
    fieldPath: entryFieldPath,
  });
}

function renderPreviewObject(
  value: Record<string, unknown>,
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | null | undefined,
  label?: string,
  resolveValue?: PreviewValueResolver,
  fieldPath?: string,
  sectionKey?: string,
): ReactNode {
  const resolveWithFallback = resolveValue ?? resolvePreviewValueFallback;
  const schemaProps =
    schemaNode && isRecord(schemaNode.properties)
      ? (schemaNode.properties as Record<string, RJSFSchema>)
      : null;
  const keys = getOrderedKeys(schemaNode, uiNode, value);
  const { visibleKeys, resolveValue: resolveWithDecisionParagraphs } =
    buildDecisionPreviewContext(value, fieldPath, keys, resolveWithFallback);
  const rows: ReactNode[] = [];
  const nested: ReactNode[] = [];

  visibleKeys.forEach((key) => {
    const entry = value[key];
    const childSchema = schemaProps ? schemaProps[key] : undefined;
    const childUi = getUiSchemaNode(uiNode, key);
    const childLabel = getLabel(key, childSchema, childUi);
    const childPath = buildFieldPath(key, fieldPath);
    const preview = buildPreviewEntry({
      entry,
      key,
      childSchema,
      childUi,
      childLabel,
      resolveValue: resolveWithDecisionParagraphs,
      fieldPath: childPath,
      sectionKey,
    });
    if (!preview) {
      return;
    }
    if (preview.type === 'row') {
      rows.push(preview.node);
    } else {
      nested.push(preview.node);
    }
  });

  if (!rows.length && !nested.length) {
    return null;
  }

  const content = (
    <>
      {rows.length > 0 ? <dl>{rows}</dl> : null}
      {nested}
    </>
  );

  if (!label) {
    return content;
  }

  return (
    <div className="formpack-document-preview__section" key={sectionKey}>
      <h4>{label}</h4>
      {content}
    </div>
  );
}

function renderPreviewArray(
  values: unknown[],
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | null | undefined,
  label?: string,
  resolveValue?: PreviewValueResolver,
  fieldPath?: string,
  sectionKey?: string,
): ReactNode {
  if (isDecisionCaseParagraphsPath(fieldPath)) {
    const paragraphValues = normalizeParagraphs(values);
    if (paragraphValues.length) {
      return (
        <div className="formpack-document-preview__section" key={sectionKey}>
          {label ? <h4>{label}</h4> : null}
          {renderParagraphs(paragraphValues, fieldPath)}
        </div>
      );
    }
  }

  const itemSchema = getItemSchema(schemaNode);
  const itemUi = getItemUiSchema(uiNode);
  const resolveWithFallback = resolveValue ?? resolvePreviewValueFallback;
  const items = values
    .map<ReactNode>((entry, index) => {
      return buildArrayItem(
        entry,
        index,
        itemSchema,
        itemUi,
        resolveWithFallback,
        fieldPath ?? '',
        sectionKey,
      );
    })
    .filter((entry): entry is Exclude<ReactNode, null | undefined | false> =>
      Boolean(entry),
    );

  if (!items.length) {
    return null;
  }

  return (
    <div className="formpack-document-preview__section" key={sectionKey}>
      {label ? <h4>{label}</h4> : null}
      <ul className="formpack-document-preview__list">{items}</ul>
    </div>
  );
}

/**
 * Collects generic preview rendering helpers for formpack detail pages.
 */
export const previewHelpers = {
  buildDecisionPreviewContext,
  buildFieldPath,
  buildPreviewEntry,
  buildPreviewRow,
  getDecisionParagraphsForEntry,
  getDecisionVisibleKeys,
  getItemSchema,
  getItemUiSchema,
  getLabel,
  getOrderedKeys,
  getUiSchemaNode,
  hasDecisionCaseText,
  isDecisionCaseParagraphsPath,
  isDecisionCaseTextPath,
  normalizeParagraphs,
  renderParagraphs,
  renderPreviewArray,
  renderPreviewObject,
  resolveDecisionCaseTextValue,
};
