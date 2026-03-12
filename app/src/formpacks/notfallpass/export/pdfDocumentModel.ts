import i18n from '../../../i18n';
import type { SupportedLocale } from '../../../i18n/locale';
import {
  buildDocumentModel,
  type DocumentModel as FormpackDocumentModel,
} from '../../documentModel';
import type { DocumentModel } from '../../../export/pdf/types';

type NotfallpassPdfContact = {
  name: string;
  phone: string;
  relation: string;
};

type NotfallpassPdfMedication = {
  name: string;
  dosage: string;
  schedule: string;
};

/**
 * Layout-oriented payload for the notfallpass PDF renderer.
 *
 * @remarks
 * RATIONALE: The PDF layout needs fully resolved labels and normalized fallback
 * text so the renderer stays deterministic and offline-safe.
 */
export type NotfallpassPdfTemplateData = {
  createdAtIso: string;
  locale: SupportedLocale;
  title: string;
  subtitle: string;
  personHeading: string;
  personRows: Array<[string, string]>;
  contactsHeading: string;
  contacts: NotfallpassPdfContact[];
  diagnosesHeading: string;
  diagnosesSummary: string;
  diagnosisParagraphs: string[];
  symptomsHeading: string;
  symptoms: string;
  medicationsHeading: string;
  medications: NotfallpassPdfMedication[];
  allergiesHeading: string;
  allergies: string;
  doctorHeading: string;
  doctorRows: Array<[string, string]>;
};

/**
 * Options for building the notfallpass PDF document model.
 *
 * @param formData - Current RJSF form data for the emergency pass.
 * @param locale - Active UI/export locale.
 * @param exportedAt - Optional export timestamp used for document metadata.
 * @returns Generic PDF document model with notfallpass-specific template data.
 */
export type BuildNotfallpassPdfDocumentModelOptions = {
  formData: Record<string, unknown>;
  locale: SupportedLocale;
  exportedAt?: Date;
};

const FALLBACK_VALUE = '—';

const asDisplayValue = (value: string | null | undefined): string =>
  value && value.trim().length > 0 ? value.trim() : FALLBACK_VALUE;

const asDisplayRows = (
  entries: Array<[string, string | null | undefined]>,
): Array<[string, string]> =>
  entries.map(([label, value]) => [label, asDisplayValue(value)]);

const buildFallbackDiagnosisSummary = (
  formData: Record<string, unknown>,
): string => {
  const diagnoses = formData.diagnoses;
  if (typeof diagnoses !== 'object' || diagnoses === null) {
    return FALLBACK_VALUE;
  }

  const diagnosisRecord = diagnoses as Record<string, unknown>;
  const labels: string[] = [];
  if (diagnosisRecord.meCfs === true) {
    labels.push('ME/CFS');
  }
  if (diagnosisRecord.pots === true) {
    labels.push('POTS');
  }
  if (diagnosisRecord.longCovid === true) {
    labels.push('Long Covid');
  }

  return labels.length > 0 ? labels.join(', ') : FALLBACK_VALUE;
};

const joinDiagnosisSummary = (
  formData: Record<string, unknown>,
  documentModel: FormpackDocumentModel,
): string => {
  const fixedSummary = documentModel.diagnoses.formatted?.trim();
  if (fixedSummary) {
    return fixedSummary;
  }

  return buildFallbackDiagnosisSummary(formData);
};

const buildContactLabel = (
  contact: FormpackDocumentModel['contacts'][number],
): string =>
  [contact.name, contact.relation]
    .filter((entry): entry is string => Boolean(entry?.trim()))
    .join(' · ');

const buildMedicationItem = (medication: NotfallpassPdfMedication): string => {
  const supplementalParts = [medication.dosage, medication.schedule].filter(
    (entry): entry is string => entry !== FALLBACK_VALUE,
  );

  return [medication.name, ...supplementalParts].join(' · ');
};

/**
 * Builds the PDF document model for the notfallpass formpack.
 *
 * @param options - Export input data, locale, and optional timestamp.
 * @returns Generic PDF model plus notfallpass-specific template payload.
 */
export const buildNotfallpassPdfDocumentModel = ({
  formData,
  locale,
  exportedAt = new Date(),
}: BuildNotfallpassPdfDocumentModelOptions): DocumentModel => {
  const t = i18n.getFixedT(locale, 'formpack:notfallpass');
  const documentModel: FormpackDocumentModel = buildDocumentModel(
    'notfallpass',
    locale,
    formData,
  );

  const templateData: NotfallpassPdfTemplateData = {
    createdAtIso: exportedAt.toISOString(),
    locale,
    title: t('notfallpass.title', { defaultValue: 'Notfallpass' }),
    subtitle: t('notfallpass.description', {
      defaultValue: 'Wichtige Gesundheitsinformationen für den Notfall.',
    }),
    personHeading: t('notfallpass.section.person.title', {
      defaultValue: 'Person',
    }),
    personRows: asDisplayRows([
      [
        t('notfallpass.person.firstName.label', { defaultValue: 'Vorname' }),
        documentModel.person.name,
      ],
      [
        t('notfallpass.person.birthDate.label', {
          defaultValue: 'Geburtsdatum',
        }),
        documentModel.person.birthDate,
      ],
    ]),
    contactsHeading: t('notfallpass.section.contacts.title', {
      defaultValue: 'Notfallkontakte',
    }),
    contacts: documentModel.contacts.map((contact) => ({
      name: asDisplayValue(buildContactLabel(contact)),
      phone: asDisplayValue(contact.phone),
      relation: asDisplayValue(contact.relation),
    })),
    diagnosesHeading: t('notfallpass.section.diagnoses.title', {
      defaultValue: 'Diagnosen',
    }),
    diagnosesSummary: joinDiagnosisSummary(formData, documentModel),
    diagnosisParagraphs:
      documentModel.diagnosisParagraphs.length > 0
        ? documentModel.diagnosisParagraphs
        : [],
    symptomsHeading: t('notfallpass.section.symptoms.title', {
      defaultValue: 'Symptome',
    }),
    symptoms: asDisplayValue(documentModel.symptoms),
    medicationsHeading: t('notfallpass.section.medications.title', {
      defaultValue: 'Medikamente',
    }),
    medications: documentModel.medications.map((medication) => ({
      name: asDisplayValue(medication.name),
      dosage: asDisplayValue(medication.dosage),
      schedule: asDisplayValue(medication.schedule),
    })),
    allergiesHeading: t('notfallpass.section.allergies.title', {
      defaultValue: 'Allergien',
    }),
    allergies: asDisplayValue(documentModel.allergies),
    doctorHeading: t('notfallpass.section.doctor.title', {
      defaultValue: 'Behandelnde Ärztin / Arzt',
    }),
    doctorRows: asDisplayRows([
      [
        t('notfallpass.doctor.name.label', {
          defaultValue: 'Praxis / Ärztin / Arzt',
        }),
        documentModel.doctor.name,
      ],
      [
        t('notfallpass.doctor.phone.label', { defaultValue: 'Telefon' }),
        documentModel.doctor.phone,
      ],
    ]),
  };

  return {
    title: templateData.title,
    meta: {
      createdAtIso: exportedAt.toISOString(),
      locale,
      templateData,
    },
    sections: [
      {
        id: 'person',
        heading: templateData.personHeading,
        blocks: [{ type: 'kvTable', rows: templateData.personRows }],
      },
      {
        id: 'contacts',
        heading: templateData.contactsHeading,
        blocks: [
          {
            type: 'bullets',
            items:
              templateData.contacts.length > 0
                ? templateData.contacts.map((contact) =>
                    [contact.name, contact.phone]
                      .filter((entry) => entry !== FALLBACK_VALUE)
                      .join(' · '),
                  )
                : [FALLBACK_VALUE],
          },
        ],
      },
      {
        id: 'diagnoses',
        heading: templateData.diagnosesHeading,
        blocks: [
          { type: 'paragraph', text: templateData.diagnosesSummary },
          ...(templateData.diagnosisParagraphs.length > 0
            ? [
                {
                  type: 'lineBreaks',
                  lines: templateData.diagnosisParagraphs,
                } as const,
              ]
            : []),
        ],
      },
      {
        id: 'symptoms',
        heading: templateData.symptomsHeading,
        blocks: [{ type: 'paragraph', text: templateData.symptoms }],
      },
      {
        id: 'medications',
        heading: templateData.medicationsHeading,
        blocks: [
          {
            type: 'bullets',
            items:
              templateData.medications.length > 0
                ? templateData.medications.map((medication) =>
                    buildMedicationItem(medication),
                  )
                : [FALLBACK_VALUE],
          },
        ],
      },
      {
        id: 'allergies',
        heading: templateData.allergiesHeading,
        blocks: [{ type: 'paragraph', text: templateData.allergies }],
      },
      {
        id: 'doctor',
        heading: templateData.doctorHeading,
        blocks: [{ type: 'kvTable', rows: templateData.doctorRows }],
      },
    ],
  };
};
