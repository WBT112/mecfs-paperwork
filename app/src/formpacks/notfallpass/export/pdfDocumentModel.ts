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

type NotfallpassPdfPanelSection =
  | {
      heading: string;
      type: 'rows';
      rows: Array<[string, string]>;
    }
  | {
      heading: string;
      type: 'bullets';
      items: string[];
    }
  | {
      heading: string;
      type: 'paragraphs';
      paragraphs: string[];
    };

type NotfallpassPdfPanel = {
  title: string;
  subtitle?: string;
  sections: NotfallpassPdfPanelSection[];
  isCover?: boolean;
};

type NotfallpassPdfPage = {
  panels: [
    NotfallpassPdfPanel,
    NotfallpassPdfPanel,
    NotfallpassPdfPanel,
    NotfallpassPdfPanel,
  ];
};

/**
 * Layout-oriented payload for the notfallpass PDF renderer.
 *
 * @remarks
 * RATIONALE: DOCX and PDF must follow the same foldable panel order so both
 * exports remain printable and operationally consistent.
 */
export type NotfallpassPdfTemplateData = {
  createdAtIso: string;
  locale: SupportedLocale;
  title: string;
  subtitle: string;
  foldHint: string;
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
  pages: [NotfallpassPdfPage, NotfallpassPdfPage];
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

const buildContactItem = (contact: NotfallpassPdfContact): string =>
  [contact.name, contact.phone]
    .filter((entry) => entry !== FALLBACK_VALUE)
    .join(' · ');

const withFallbackParagraph = (value: string): string[] =>
  value === FALLBACK_VALUE ? [FALLBACK_VALUE] : [value];

const withFallbackBullets = (items: string[]): string[] =>
  items.length > 0 ? items : [FALLBACK_VALUE];

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

  const personRows = asDisplayRows([
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
  ]);
  const contactItems = withFallbackBullets(
    documentModel.contacts.map((contact) =>
      buildContactItem({
        name: asDisplayValue(buildContactLabel(contact)),
        phone: asDisplayValue(contact.phone),
        relation: asDisplayValue(contact.relation),
      }),
    ),
  );
  const medicationItems = withFallbackBullets(
    documentModel.medications.map((medication) =>
      buildMedicationItem({
        name: asDisplayValue(medication.name),
        dosage: asDisplayValue(medication.dosage),
        schedule: asDisplayValue(medication.schedule),
      }),
    ),
  );
  const diagnosesSummary = joinDiagnosisSummary(formData, documentModel);
  const treatmentNotes =
    documentModel.diagnosisParagraphs.length > 0
      ? documentModel.diagnosisParagraphs
      : withFallbackParagraph(diagnosesSummary);

  const templateData: NotfallpassPdfTemplateData = {
    createdAtIso: exportedAt.toISOString(),
    locale,
    title: t('notfallpass.title', { defaultValue: 'Notfallpass' }),
    subtitle: t('notfallpass.description', {
      defaultValue: 'Wichtige Gesundheitsinformationen für den Notfall.',
    }),
    foldHint: t('notfallpass.export.foldHint', {
      defaultValue:
        'Beidseitig drucken, an der kurzen Kante wenden und ziehharmonikaartig falten.',
    }),
    personHeading: t('notfallpass.section.person.title', {
      defaultValue: 'Person',
    }),
    personRows,
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
    diagnosesSummary,
    diagnosisParagraphs: documentModel.diagnosisParagraphs,
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
    pages: [
      {
        panels: [
          {
            title: t('notfallpass.export.panel.cover.title', {
              defaultValue: 'Notfallpass',
            }),
            subtitle: t('notfallpass.description', {
              defaultValue:
                'Wichtige Gesundheitsinformationen für den Notfall.',
            }),
            isCover: true,
            sections: [
              {
                heading: t('notfallpass.section.person.title', {
                  defaultValue: 'Person',
                }),
                type: 'rows',
                rows: personRows,
              },
            ],
          },
          {
            title: t('notfallpass.export.panel.diagnoses.title', {
              defaultValue: 'Diagnosen',
            }),
            sections: [
              {
                heading: t('notfallpass.section.diagnoses.title', {
                  defaultValue: 'Diagnosen',
                }),
                type: 'paragraphs',
                paragraphs: withFallbackParagraph(diagnosesSummary),
              },
            ],
          },
          {
            title: t('notfallpass.export.panel.symptoms.title', {
              defaultValue: 'Symptome',
            }),
            sections: [
              {
                heading: t('notfallpass.section.symptoms.title', {
                  defaultValue: 'Symptome',
                }),
                type: 'paragraphs',
                paragraphs: withFallbackParagraph(
                  asDisplayValue(documentModel.symptoms),
                ),
              },
            ],
          },
          {
            title: t('notfallpass.export.panel.medications.title', {
              defaultValue: 'Medikamente',
            }),
            sections: [
              {
                heading: t('notfallpass.section.medications.title', {
                  defaultValue: 'Medikamente',
                }),
                type: 'bullets',
                items: medicationItems,
              },
            ],
          },
        ],
      },
      {
        panels: [
          {
            title: t('notfallpass.export.panel.contact.title', {
              defaultValue: 'Notfallkontakt',
            }),
            sections: [
              {
                heading: t('notfallpass.section.contacts.title', {
                  defaultValue: 'Notfallkontakte',
                }),
                type: 'bullets',
                items: contactItems,
              },
            ],
          },
          {
            title: t('notfallpass.export.panel.practice.title', {
              defaultValue: 'Praxis',
            }),
            sections: [
              {
                heading: t('notfallpass.section.doctor.title', {
                  defaultValue: 'Praxis',
                }),
                type: 'rows',
                rows: asDisplayRows([
                  [
                    t('notfallpass.doctor.name.label', {
                      defaultValue: 'Praxis / Ärztin / Arzt',
                    }),
                    documentModel.doctor.name,
                  ],
                  [
                    t('notfallpass.doctor.phone.label', {
                      defaultValue: 'Telefon',
                    }),
                    documentModel.doctor.phone,
                  ],
                ]),
              },
            ],
          },
          {
            title: t('notfallpass.export.panel.allergies.title', {
              defaultValue: 'Allergien',
            }),
            sections: [
              {
                heading: t('notfallpass.section.allergies.title', {
                  defaultValue: 'Allergien',
                }),
                type: 'paragraphs',
                paragraphs: withFallbackParagraph(
                  asDisplayValue(documentModel.allergies),
                ),
              },
            ],
          },
          {
            title: t('notfallpass.export.panel.treatment.title', {
              defaultValue: 'Wichtige Hinweise',
            }),
            sections: [
              {
                heading: t(
                  'notfallpass.export.panel.treatment.detailsHeading',
                  {
                    defaultValue: 'Behandlungshinweise',
                  },
                ),
                type: 'paragraphs',
                paragraphs: treatmentNotes,
              },
            ],
          },
        ],
      },
    ],
  };

  return {
    title: templateData.title,
    meta: {
      locale,
      createdAtIso: templateData.createdAtIso,
      templateData,
    },
    sections: [
      {
        heading: templateData.personHeading,
        blocks: [{ type: 'kvTable', rows: templateData.personRows }],
      },
      {
        heading: templateData.contactsHeading,
        blocks: [{ type: 'bullets', items: contactItems }],
      },
      {
        heading: templateData.diagnosesHeading,
        blocks: [{ type: 'paragraph', text: templateData.diagnosesSummary }],
      },
      {
        heading: templateData.symptomsHeading,
        blocks: [{ type: 'paragraph', text: templateData.symptoms }],
      },
      {
        heading: templateData.medicationsHeading,
        blocks: [{ type: 'bullets', items: medicationItems }],
      },
      {
        heading: templateData.allergiesHeading,
        blocks: [{ type: 'paragraph', text: templateData.allergies }],
      },
      {
        heading: templateData.doctorHeading,
        blocks: [{ type: 'kvTable', rows: templateData.doctorRows }],
      },
    ],
  };
};
