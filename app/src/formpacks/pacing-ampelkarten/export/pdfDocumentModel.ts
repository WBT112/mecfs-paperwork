import i18n from '../../../i18n';
import type { SupportedLocale } from '../../../i18n/locale';
import type {
  DocumentBlock,
  DocumentModel,
  DocumentSection,
} from '../../../export/pdf/types';
import { getPathValue } from '../../../lib/pathAccess';
import {
  PACING_CARD_COLORS,
  getPacingCardTheme,
  type PacingCardColor,
} from './cardTheme';

type PacingVariant = 'adult' | 'child';

type PacingCardSection = {
  id: 'canDo' | 'needHelp' | 'visitRules' | 'stimuli';
  label: string;
  items: string[];
};

type PacingPdfCard = {
  color: PacingCardColor;
  title: string;
  animalLabel: string;
  imageAlt: string;
  imageSrc: string;
  accentColor: string;
  borderColor: string;
  surfaceColor: string;
  titleColor: string;
  sectionLabelColor: string;
  hintLabel: string;
  hint: string;
  thanksLabel: string;
  thanks: string;
  sections: PacingCardSection[];
};

type PacingPdfNotes = {
  title: string;
  items: string[];
};

/**
 * Template payload for the pacing-card PDF renderer.
 *
 * @remarks
 * RATIONALE: The generic `DocumentModel.sections` are useful for previews and
 * fallback inspection, while the PDF renderer needs a layout-oriented payload
 * with already resolved variant/card labels.
 */
export type PacingAmpelkartenPdfTemplateData = {
  locale: SupportedLocale;
  createdAtIso: string;
  variant: PacingVariant;
  cutLineLabel: string;
  signatureLabel: string;
  signature: string;
  cards: [PacingPdfCard, PacingPdfCard, PacingPdfCard];
  notes: PacingPdfNotes;
};

/**
 * Options for building the pacing-card PDF document model.
 *
 * @param formData - Current RJSF form data for the pacing formpack.
 * @param locale - Active UI/export locale.
 * @param exportedAt - Optional export timestamp used for document metadata.
 */
export type BuildPacingAmpelkartenPdfDocumentModelOptions = {
  formData: Record<string, unknown>;
  locale: SupportedLocale;
  exportedAt?: Date;
};

const CARD_SECTION_KEYS = [
  'canDo',
  'needHelp',
  'visitRules',
  'stimuli',
] as const;

const asTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const asStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => asTrimmedString(entry))
    .filter((entry) => entry.length > 0);
};

const resolveVariant = (value: unknown): PacingVariant =>
  value === 'child' ? 'child' : 'adult';

const buildSectionBlocks = (card: PacingPdfCard): DocumentBlock[] =>
  card.sections.flatMap((section) => {
    if (section.items.length === 0) {
      return [];
    }

    return [
      { type: 'paragraph', text: section.label } satisfies DocumentBlock,
      { type: 'bullets', items: section.items } satisfies DocumentBlock,
    ];
  });

const buildCard = (
  formData: Record<string, unknown>,
  locale: SupportedLocale,
  variant: PacingVariant,
  color: PacingCardColor,
): PacingPdfCard => {
  const t = i18n.getFixedT(locale, 'formpack:pacing-ampelkarten');
  const basePath = `${variant}.cards.${color}`;
  const theme = getPacingCardTheme(color);
  const titleKey = `pacing-ampelkarten.${variant}.cards.${color}.title`;

  return {
    color,
    title: t(titleKey, { defaultValue: titleKey }),
    animalLabel: t(theme.animalLabelKey, {
      defaultValue: theme.animalLabelKey,
    }),
    imageAlt: t(theme.imageAltKey, { defaultValue: theme.imageAltKey }),
    imageSrc: theme.imageSrc,
    accentColor: theme.accentColor,
    borderColor: theme.borderColor,
    surfaceColor: theme.surfaceColor,
    titleColor: theme.titleColor,
    sectionLabelColor: theme.sectionLabelColor,
    hintLabel: t('pacing-ampelkarten.card.hint.label', {
      defaultValue: 'pacing-ampelkarten.card.hint.label',
    }),
    hint: asTrimmedString(getPathValue(formData, `${basePath}.hint`)),
    thanksLabel: t('pacing-ampelkarten.card.thanks.label', {
      defaultValue: 'pacing-ampelkarten.card.thanks.label',
    }),
    thanks: asTrimmedString(getPathValue(formData, `${basePath}.thanks`)),
    sections: CARD_SECTION_KEYS.map((sectionKey) => ({
      id: sectionKey,
      label: t(`pacing-ampelkarten.card.${sectionKey}.label`, {
        defaultValue: `pacing-ampelkarten.card.${sectionKey}.label`,
      }),
      items: asStringList(getPathValue(formData, `${basePath}.${sectionKey}`)),
    })),
  };
};

/**
 * Builds the PDF document model for the pacing-card formpack.
 *
 * @param options - Export input data, locale, and optional timestamp.
 * @returns A generic `DocumentModel` plus pacing-specific template payload.
 * @remarks
 * RATIONALE: The model resolves variant-dependent titles and section labels once
 * so the PDF template can stay layout-focused and deterministic.
 */
export const buildPacingAmpelkartenPdfDocumentModel = ({
  formData,
  locale,
  exportedAt = new Date(),
}: BuildPacingAmpelkartenPdfDocumentModelOptions): DocumentModel => {
  const t = i18n.getFixedT(locale, 'formpack:pacing-ampelkarten');
  const variant = resolveVariant(getPathValue(formData, 'meta.variant'));
  const cards = PACING_CARD_COLORS.map((color) =>
    buildCard(formData, locale, variant, color),
  ) as [PacingPdfCard, PacingPdfCard, PacingPdfCard];
  const notes: PacingPdfNotes = {
    title:
      asTrimmedString(getPathValue(formData, 'notes.title')) ||
      t('pacing-ampelkarten.notes.title.label', {
        defaultValue: 'pacing-ampelkarten.notes.title.label',
      }),
    items: asStringList(getPathValue(formData, 'notes.items')),
  };
  const signature = asTrimmedString(getPathValue(formData, 'sender.signature'));
  const templateData: PacingAmpelkartenPdfTemplateData = {
    locale,
    createdAtIso: exportedAt.toISOString(),
    variant,
    cutLineLabel: t('pacing-ampelkarten.export.cutLine', {
      defaultValue: 'pacing-ampelkarten.export.cutLine',
    }),
    signatureLabel: t('pacing-ampelkarten.sender.signature.label', {
      defaultValue: 'pacing-ampelkarten.sender.signature.label',
    }),
    signature,
    cards,
    notes,
  };

  const sections: DocumentSection[] = cards.map((card) => ({
    id: card.color,
    heading: card.title,
    blocks: [
      { type: 'paragraph', text: card.animalLabel },
      ...buildSectionBlocks(card),
      ...(card.hint
        ? [
            {
              type: 'paragraph',
              text: `${card.hintLabel}: ${card.hint}`,
            } satisfies DocumentBlock,
          ]
        : []),
      ...(card.thanks
        ? [
            {
              type: 'paragraph',
              text: `${card.thanksLabel}: ${card.thanks}`,
            } satisfies DocumentBlock,
          ]
        : []),
    ],
  }));

  sections.push({
    id: 'notes',
    heading: notes.title,
    blocks: [
      ...(notes.items.length
        ? [{ type: 'bullets', items: notes.items } satisfies DocumentBlock]
        : []),
      ...(signature
        ? [
            {
              type: 'paragraph',
              text: `${templateData.signatureLabel}: ${signature}`,
            } satisfies DocumentBlock,
          ]
        : []),
    ],
  });

  return {
    title: t('pacing-ampelkarten.title', {
      defaultValue: 'pacing-ampelkarten.title',
    }),
    meta: {
      createdAtIso: exportedAt.toISOString(),
      locale,
      templateData,
    },
    sections,
  };
};
