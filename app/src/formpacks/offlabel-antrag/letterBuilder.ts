import type { SupportedLocale } from '../../i18n/locale';
import {
  buildOffLabelAntragDocumentModel,
  parseOfflabelAttachments,
  type OffLabelAntragDocumentModel,
  type OffLabelExportBundle,
  type OffLabelLetterSection,
} from './export/documentModel';
import type { OfflabelAntragExportDefaults } from '../../export/offlabelAntragDefaults';

/**
 * RATIONALE: This module is currently a compatibility/test facade.
 * The runtime export path uses `buildOffLabelAntragDocumentModel` directly.
 * Keep this wrapper stable for existing unit tests; removal can happen in a
 * dedicated aggressive cleanup once test contracts are migrated.
 */
export type OfflabelAntragLetter = OffLabelLetterSection;
export type OfflabelAntragExportBundle = OffLabelExportBundle;

type DeepPartial<T> = {
  [Key in keyof T]?: T[Key] extends Array<infer Item>
    ? Array<DeepPartial<Item>>
    : T[Key] extends object
      ? DeepPartial<T[Key]>
      : T[Key];
};

type OfflabelAntragBundleInput = DeepPartial<
  Omit<
    OffLabelAntragDocumentModel,
    | 'kk'
    | 'arzt'
    | 'part3'
    | 'sourcesHeading'
    | 'sources'
    | 'exportedAtIso'
    | 'exportBundle'
  >
>;

type BuildOfflabelAntragExportBundleArgs = {
  locale: SupportedLocale;
  documentModel: OfflabelAntragBundleInput;
  defaults?: OfflabelAntragExportDefaults;
  exportedAt?: Date;
};

type BuildLetterContext = {
  locale: SupportedLocale;
  model: OfflabelAntragBundleInput;
  exportedAt: Date;
};

type LetterSectionKey = 'kk' | 'arzt';

export const parseAttachments = (
  attachmentsFreeText: string | null | undefined,
): string[] => parseOfflabelAttachments(attachmentsFreeText);

const buildLetterSection = (
  section: LetterSectionKey,
  context: BuildLetterContext,
): OfflabelAntragLetter => {
  const { locale, model, exportedAt } = context;
  const projected = buildOffLabelAntragDocumentModel(model, locale, {
    exportedAt,
  });
  return projected[section];
};

export const buildPart1KkLetter = (context: BuildLetterContext) =>
  buildLetterSection('kk', context);

export const buildPart2DoctorLetter = (context: BuildLetterContext) =>
  buildLetterSection('arzt', context);

export const buildOfflabelAntragExportBundle = ({
  locale,
  documentModel,
  defaults,
  exportedAt = new Date(),
}: BuildOfflabelAntragExportBundleArgs): OfflabelAntragExportBundle =>
  buildOffLabelAntragDocumentModel(documentModel, locale, {
    defaults,
    exportedAt,
  }).exportBundle;
