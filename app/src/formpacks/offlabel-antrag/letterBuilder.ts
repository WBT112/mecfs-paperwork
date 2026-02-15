import type { SupportedLocale } from '../../i18n/locale';
import {
  buildOffLabelAntragDocumentModel,
  parseOfflabelAttachments,
  type OffLabelExportBundle,
  type OffLabelLetterSection,
} from './export/documentModel';
import type { OfflabelAntragExportDefaults } from '../../export/offlabelAntragDefaults';

type OfflabelAntragSignatureBlock = {
  label: string;
  name: string;
  extraLines?: string[];
};

export type OfflabelAntragLetter = {
  senderLines: string[];
  addresseeLines: string[];
  dateLine: string;
  subject: string;
  bodyParagraphs: string[];
  attachmentsHeading: string;
  attachmentsItems: string[];
  signatureBlocks: OfflabelAntragSignatureBlock[];
};

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

const toLegacyLetter = (
  section: OffLabelLetterSection,
): OfflabelAntragLetter => ({
  senderLines: section.senderLines,
  addresseeLines: section.addresseeLines,
  dateLine: section.dateLine,
  subject: section.subject,
  bodyParagraphs: section.paragraphs,
  attachmentsHeading: section.attachmentsHeading,
  attachmentsItems: section.attachments,
  signatureBlocks: section.signatureBlocks.map((block) => ({
    label: block.label,
    name: block.name,
    ...(block.extraLine ? { extraLines: [block.extraLine] } : {}),
  })),
});

export const parseAttachments = (
  attachmentsFreeText: string | null | undefined,
): string[] => parseOfflabelAttachments(attachmentsFreeText);

export const buildPart1KkLetter = ({
  locale,
  model,
  exportedAt,
}: BuildLetterContext): OfflabelAntragLetter => {
  const projected = buildOffLabelAntragDocumentModel(model, locale, {
    exportedAt,
  });
  return toLegacyLetter(projected.kk);
};

export const buildPart2DoctorLetter = ({
  locale,
  model,
  exportedAt,
}: BuildLetterContext): OfflabelAntragLetter => {
  const projected = buildOffLabelAntragDocumentModel(model, locale, {
    exportedAt,
  });
  return toLegacyLetter(projected.arzt);
};

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
