import type { SupportedLocale } from '../../i18n/locale';
import {
  buildOffLabelAntragDocumentModel,
  parseOfflabelAttachments,
  type OffLabelExportBundle,
  type OffLabelLetterSection,
} from './export/documentModel';
import type { OfflabelAntragExportDefaults } from '../../export/offlabelAntragDefaults';

export type OfflabelAntragLetter = OffLabelLetterSection;
export type OfflabelAntragExportBundle = OffLabelExportBundle;

type OfflabelAntragBundleInput = {
  patient?: {
    firstName?: string | null;
    lastName?: string | null;
    birthDate?: string | null;
    insuranceNumber?: string | null;
    streetAndNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
  doctor?: {
    name?: string | null;
    practice?: string | null;
    streetAndNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
  insurer?: {
    name?: string | null;
    department?: string | null;
    streetAndNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
  request?: {
    drug?: string | null;
    standardOfCareTriedFreeText?: string | null;
    otherDrugName?: string | null;
    otherIndication?: string | null;
    otherTreatmentGoal?: string | null;
    otherDose?: string | null;
    otherDuration?: string | null;
    otherMonitoring?: string | null;
  };
  attachmentsFreeText?: string | null;
  attachments?: {
    items?: string[];
  };
};

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
