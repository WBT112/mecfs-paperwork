import i18n from '../i18n';
import type { SupportedLocale } from '../i18n/locale';

type DiagnosisFlags = {
  meCfs?: boolean;
  pots?: boolean;
  longCovid?: boolean;
};

export type DocumentModel = {
  diagnosisParagraphs: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDiagnosisFlags = (
  formData: Record<string, unknown>,
): DiagnosisFlags => {
  const diagnoses = isRecord(formData.diagnoses) ? formData.diagnoses : null;
  return {
    meCfs: diagnoses?.meCfs === true,
    pots: diagnoses?.pots === true,
    longCovid: diagnoses?.longCovid === true,
  };
};

/**
 * Builds a document projection for exports using formpack i18n content.
 */
export const buildDocumentModel = (
  formpackId: string | null,
  locale: SupportedLocale,
  formData: Record<string, unknown>,
): DocumentModel => {
  if (!formpackId) {
    return { diagnosisParagraphs: [] };
  }

  const t = i18n.getFixedT(locale, `formpack:${formpackId}`);

  if (formpackId !== 'notfallpass') {
    return { diagnosisParagraphs: [] };
  }

  const diagnosisParagraphs: string[] = [];
  const { meCfs, pots, longCovid } = getDiagnosisFlags(formData);

  if (!meCfs) {
    return { diagnosisParagraphs };
  }

  diagnosisParagraphs.push(
    t('notfallpass.export.diagnoses.meCfs.paragraph', {
      defaultValue: 'notfallpass.export.diagnoses.meCfs.paragraph',
    }),
  );

  if (pots) {
    diagnosisParagraphs.push(
      t('notfallpass.export.diagnoses.pots.paragraph', {
        defaultValue: 'notfallpass.export.diagnoses.pots.paragraph',
      }),
    );
  }

  if (longCovid) {
    diagnosisParagraphs.push(
      t('notfallpass.export.diagnoses.longCovid.paragraph', {
        defaultValue: 'notfallpass.export.diagnoses.longCovid.paragraph',
      }),
    );
  }

  return { diagnosisParagraphs };
};
