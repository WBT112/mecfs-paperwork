import React from 'react';
import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { DocumentBlock, DocumentModel } from '../types';

import annex1SchemaImg from '../../../assets/formpacks/doctor-letter/annex-1-icd10-schema.jpg';
import annex2GuideExcerptImg from '../../../assets/formpacks/doctor-letter/annex-2-practiceguide-excerpt.png';

type DoctorLetterTemplateData = {
  patient?: {
    firstName?: string;
    lastName?: string;
    streetAndNumber?: string;
    postalCode?: string;
    city?: string;
  };
  doctor?: {
    practice?: string;
    gender?: string;
    title?: string;
    name?: string;
    streetAndNumber?: string;
    postalCode?: string;
    city?: string;
  };
  decision?: {
    caseText?: string;
  };
  dateLabel?: string;
  formattedDate?: string;
  labels?: {
    patient?: {
      firstName?: string;
      lastName?: string;
      streetAndNumber?: string;
      postalCode?: string;
      city?: string;
    };
    doctor?: {
      practice?: string;
      title?: string;
      gender?: string;
      name?: string;
      streetAndNumber?: string;
      postalCode?: string;
      city?: string;
    };
  };
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 42,
    fontSize: 11,
    lineHeight: 1.35,
  },
  headerPatientLine: {
    fontSize: 10,
    marginBottom: 6,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addressBlock: {
    flexGrow: 1,
    paddingRight: 12,
  },
  dateBlock: {
    width: 150,
    alignItems: 'flex-end',
  },
  subject: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 14,
  },
  columns: {
    flexDirection: 'row',
    gap: 18,
  },
  leftColumn: {
    flexGrow: 1,
    flexBasis: 0,
  },
  rightColumn: {
    width: 170,
  },
  attachmentsTitle: {
    fontWeight: 700,
    marginBottom: 2,
  },
  attachmentsItem: {
    fontSize: 9,
    lineHeight: 1.25,
  },
  paragraph: {
    marginBottom: 10,
  },
  signatureSpacer: {
    marginTop: 16,
  },
  signatureName: {
    marginTop: 18,
  },
  // Annex pages
  annexTitle: {
    fontWeight: 700,
    textDecoration: 'underline',
    marginBottom: 12,
  },
  annexSubTitle: {
    fontSize: 10,
    marginBottom: 6,
  },
  annexImage: {
    width: '100%',
    objectFit: 'contain',
  },
  annexCaption: {
    fontSize: 9,
    marginTop: 8,
  },
  link: {
    fontSize: 9,
    color: '#000000',
    textDecoration: 'underline',
  },
  small: {
    fontSize: 9,
  },
});

const renderBlock = (block: DocumentBlock, idx: number) => {
  if (block.type === 'paragraph') {
    return (
      <Text key={idx} style={styles.paragraph}>
        {block.text}
      </Text>
    );
  }

  if (block.type === 'lineBreaks') {
    // Keep explicit line breaks *within* the same paragraph.
    return (
      <Text key={idx} style={styles.paragraph}>
        {block.lines.map((line, lineIdx) => (
          <React.Fragment key={lineIdx}>
            {lineIdx > 0 ? '\n' : ''}
            {line}
          </React.Fragment>
        ))}
      </Text>
    );
  }

  // doctor-letter PDF uses a dedicated layout (not a generic KV table),
  // so we intentionally do not render KV tables here.
  return null;
};

type TemplateCopy = {
  subject: string;
  introParagraphs: string[];
  closingParagraphs: string[];
  closingGreeting: string;
  attachmentsTitle: string;
  attachmentsItems: string[];
  annex1: {
    title: string;
    caption: string;
    sourceLabel: string;
    sourceLinkText: string;
    sourceLinkUrl: string;
  };
  annex2: {
    title: string;
    subtitle: string;
    sourceLabel: string;
    sourceLinkText: string;
    sourceLinkUrl: string;
    preImageParagraphs: string[];
    postImageParagraphs: string[];
  };
};

const TEMPLATE_COPY: Record<'de' | 'en', TemplateCopy> = {
  de: {
    subject:
      'Information zu geänderten ICD-10-Kodierungen ab 01.01.2026 für ME/CFS',
    introParagraphs: [
      'wie Sie vielleicht bereits wissen, gibt es seit dem 01.01.2026 wichtige Änderungen in der ICD-10-GM Version 2026, die u. a. für eine meiner Diagnosen relevant sind.',
      'Die bisherige Kodierung G93.3 für Myalgische Enzephalomyelitis / Chronisches Fatigue-Syndrom (ME/CFS) ist nicht mehr abrechenbar. Stattdessen muss nun eine spezifischere Unterscheidung zwischen postinfektiösen und nicht-postinfektiösen Formen, unklarer Ursache und reiner chronischer Fatigue - mit oder ohne post-exertionelle Malaise (PEM) - getroffen werden.',
      'Im beigefügten Schema ist die neue Systematik übersichtlich und leicht nachvollziehbar dargestellt.',
    ],
    closingParagraphs: [
      'Ich bitte Sie daher, bei der nächsten Kodierung meiner Diagnose diese Änderungen zu berücksichtigen. Meines Wissens haben sich für meine anderen bestehenden Diagnosen keine Änderungen durch die neue ICD-10 GM2026 Version ergeben. Lassen Sie mich bitte wissen, ob Sie das genauso sehen. Gerne stehe ich für Rückfragen zur Verfügung.',
    ],
    closingGreeting: 'Mit freundlichen Grüßen',
    attachmentsTitle: 'Anlagen',
    attachmentsItems: [
      'Schema ICD-10 Kodierung bei ME/CFS & PEM',
      'Auszug aus dem Praxisleitfaden der Deutschen Gesellschaft für ME/CFS',
    ],
    annex1: {
      title: 'Anlage 1',
      caption: 'Quelle: Selbsthilfegruppe Molly',
      sourceLabel: 'online unter:',
      sourceLinkText: 'teemitmolly.de/icd-10-gm2026-me-cfs/',
      sourceLinkUrl: 'https://teemitmolly.de/icd-10-gm2026-me-cfs/',
    },
    annex2: {
      title: 'Anlage 2',
      subtitle:
        'Auszug aus dem Praxisleitfaden der Deutschen Gesellschaft für ME/CFS',
      sourceLabel: 'online unter:',
      sourceLinkText: 'mecfs.de/was-ist-me-cfs/',
      sourceLinkUrl: 'https://www.mecfs.de/was-ist-me-cfs/',
      preImageParagraphs: [
        'Sowohl die CCC- als auch IOM-Kriterien werden insbesondere dann für die Diagnose von ME/CFS empfohlen, wenn der Patient nachweislich eine anhaltende Beeinträchtigung der Funktionsfähigkeit als Folge eines Infektes aufweist.',
      ],
      postImageParagraphs: [
        'Die ME/CFS-Diagnosekriterien des CCC-Schemas enthalten aufgrund ihrer umfassenden Symptomerfassung neben den somatischen Beschwerden auch andere Bereiche, wie z. B. kognitive Störungen und autonome Symptome.',
        'Die IOM-Kriterien gelten als einfacher zu erfüllen und können als Einstiegshilfe zur Diagnose herangezogen werden. Für die Diagnosestellung ist es jedoch wichtig, dass ein anhaltend eingeschränktes Funktionsniveau und ein Mindestbeschwerdezeitraum von mehr als sechs Monaten gegeben sind.',
      ],
    },
  },
  en: {
    subject: 'Information on updated ICD-10 coding as of 01/01/2026 for ME/CFS',
    introParagraphs: [
      'As you may already know, since 01/01/2026 there have been important changes to the ICD-10-GM 2026 version, which are relevant for one of my diagnoses.',
      'The previous coding G93.3 for Myalgic Encephalomyelitis / Chronic Fatigue Syndrome (ME/CFS) is no longer billable. Instead, a more specific distinction must now be made between post-infectious and non-post-infectious forms, unclear cause, and pure chronic fatigue — with or without post-exertional malaise (PEM).',
      'The attached schema presents the new system clearly and is easy to follow.',
    ],
    closingParagraphs: [
      'I kindly ask you to take these changes into account when coding my diagnosis next time. To my knowledge, there are no changes for my other existing diagnoses due to the new ICD-10-GM 2026 version. Please let me know if you see it the same way. I am happy to answer any questions.',
    ],
    closingGreeting: 'Kind regards',
    attachmentsTitle: 'Attachments',
    attachmentsItems: [
      'ICD-10 coding schema for ME/CFS & PEM',
      'Excerpt from the practice guide of the German ME/CFS Society',
    ],
    annex1: {
      title: 'Annex 1',
      caption: 'Source: Molly support group',
      sourceLabel: 'online at:',
      sourceLinkText: 'teemitmolly.de/icd-10-gm2026-me-cfs/',
      sourceLinkUrl: 'https://teemitmolly.de/icd-10-gm2026-me-cfs/',
    },
    annex2: {
      title: 'Annex 2',
      subtitle: 'Excerpt from the practice guide of the German ME/CFS Society',
      sourceLabel: 'online at:',
      sourceLinkText: 'mecfs.de/was-ist-me-cfs/',
      sourceLinkUrl: 'https://www.mecfs.de/was-ist-me-cfs/',
      preImageParagraphs: [
        'Both the CCC and IOM criteria are particularly recommended for diagnosing ME/CFS when the patient demonstrably has a persistent impairment of functioning as a result of an infection.',
      ],
      postImageParagraphs: [
        'The CCC diagnostic criteria include, due to their comprehensive symptom coverage, not only somatic complaints but also other areas such as cognitive and autonomic symptoms.',
        'The IOM criteria are considered easier to meet and can serve as an entry-level aid for diagnosis. For a diagnosis, however, it is important that there is a persistently reduced functional level and a minimum symptom duration of more than six months.',
      ],
    },
  },
};

const getTemplateCopy = (locale: string): TemplateCopy =>
  locale.toLowerCase().startsWith('de') ? TEMPLATE_COPY.de : TEMPLATE_COPY.en;

const getSectionById = (model: DocumentModel, id: string) =>
  model.sections.find((section) => section.id === id);

const isKvTableBlock = (
  block: DocumentBlock,
): block is Extract<DocumentBlock, { type: 'kvTable' }> =>
  block.type === 'kvTable';

const getKvTableRows = (model: DocumentModel, id: string) => {
  const section = getSectionById(model, id);
  const kvBlock = section?.blocks.find(isKvTableBlock);
  return kvBlock ? kvBlock.rows : [];
};

const getRowValue = (rows: Array<[string, string]>, label?: string) => {
  if (!label) {
    return undefined;
  }
  return rows.find((row) => row[0] === label)?.[1];
};

const formatPatientLine = (patient: {
  firstName?: string;
  lastName?: string;
  streetAndNumber?: string;
  postalCode?: string;
  city?: string;
}) => {
  const fullName = [patient.firstName, patient.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const street = patient.streetAndNumber ?? '';
  const city = [patient.postalCode, patient.city]
    .filter(Boolean)
    .join(' ')
    .trim();

  return [fullName, street, city].filter(Boolean).join(' – ');
};

const formatDoctorNameLine = (doctor: { title?: string; name?: string }) => {
  const title = doctor.title && doctor.title !== 'kein' ? doctor.title : '';
  return [title, doctor.name].filter(Boolean).join(' ').trim();
};

const buildSalutation = (
  doctor: {
    title?: string;
    name?: string;
    gender?: string;
  },
  locale: string,
) => {
  const title = doctor.title && doctor.title !== 'kein' ? doctor.title : '';
  const full = [title, doctor.name].filter(Boolean).join(' ').trim();
  const isGerman = locale.toLowerCase().startsWith('de');
  const suffix = full ? ` ${full}` : '';

  if (doctor.gender === 'Frau') {
    return isGerman ? `Sehr geehrte Frau${suffix},` : `Dear Ms.${suffix},`;
  }
  if (doctor.gender === 'Herr') {
    return isGerman ? `Sehr geehrter Herr${suffix},` : `Dear Mr.${suffix},`;
  }
  return isGerman ? 'Sehr geehrte Damen und Herren,' : 'Dear Sir or Madam,';
};

const resolvePatient = (
  rows: Array<[string, string]>,
  labelMap: DoctorLetterTemplateData['labels'] | undefined,
  fallback: DoctorLetterTemplateData['patient'] | undefined,
) => ({
  firstName:
    getRowValue(rows, labelMap?.patient?.firstName) ?? fallback?.firstName,
  lastName:
    getRowValue(rows, labelMap?.patient?.lastName) ?? fallback?.lastName,
  streetAndNumber:
    getRowValue(rows, labelMap?.patient?.streetAndNumber) ??
    fallback?.streetAndNumber,
  postalCode:
    getRowValue(rows, labelMap?.patient?.postalCode) ?? fallback?.postalCode,
  city: getRowValue(rows, labelMap?.patient?.city) ?? fallback?.city,
});

const resolveDoctor = (
  rows: Array<[string, string]>,
  labelMap: DoctorLetterTemplateData['labels'] | undefined,
  fallback: DoctorLetterTemplateData['doctor'] | undefined,
) => ({
  practice: getRowValue(rows, labelMap?.doctor?.practice) ?? fallback?.practice,
  title: getRowValue(rows, labelMap?.doctor?.title) ?? fallback?.title,
  gender: getRowValue(rows, labelMap?.doctor?.gender) ?? fallback?.gender,
  name: getRowValue(rows, labelMap?.doctor?.name) ?? fallback?.name,
  streetAndNumber:
    getRowValue(rows, labelMap?.doctor?.streetAndNumber) ??
    fallback?.streetAndNumber,
  postalCode:
    getRowValue(rows, labelMap?.doctor?.postalCode) ?? fallback?.postalCode,
  city: getRowValue(rows, labelMap?.doctor?.city) ?? fallback?.city,
});

export const DoctorLetterPdfDocument = ({
  model,
}: {
  model: DocumentModel;
}) => {
  const templateData = model.meta?.templateData as
    | DoctorLetterTemplateData
    | undefined;

  const locale = model.meta?.locale ?? 'de-DE';
  const copy = getTemplateCopy(locale);
  const formattedDate =
    templateData?.formattedDate ??
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      new Date(model.meta?.createdAtIso ?? new Date().toISOString()),
    );
  const resolvedDateLabel =
    templateData?.dateLabel ??
    (locale.toLowerCase().startsWith('de') ? 'Datum' : 'Date');

  const patientRows = getKvTableRows(model, 'patient');
  const doctorRows = getKvTableRows(model, 'doctor');
  const labelMap = templateData?.labels;

  const patient = resolvePatient(patientRows, labelMap, templateData?.patient);
  const doctor = resolveDoctor(doctorRows, labelMap, templateData?.doctor);

  const resolvedDate =
    getRowValue(doctorRows, resolvedDateLabel) ?? formattedDate;

  const pLine = formatPatientLine(patient);
  const salutation = buildSalutation(doctor, locale);
  const signatureName = [patient.firstName, patient.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const caseSection = getSectionById(model, 'case') ?? model.sections.at(-1);
  const decisionBlocks = caseSection?.blocks ?? [];

  const doctorCityLine = [doctor.postalCode, doctor.city]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <Document>
      {/* Page 1: Letter + attachments */}
      <Page size="A4" style={styles.page}>
        {pLine ? <Text style={styles.headerPatientLine}>{pLine}</Text> : null}
        <View style={styles.hr} />

        <View style={styles.headerRow}>
          <View style={styles.addressBlock}>
            {doctor.practice ? <Text>{doctor.practice}</Text> : null}
            {formatDoctorNameLine(doctor) ? (
              <Text>{formatDoctorNameLine(doctor)}</Text>
            ) : null}
            {doctor.streetAndNumber ? (
              <Text>{doctor.streetAndNumber}</Text>
            ) : null}
            {doctorCityLine ? <Text>{doctorCityLine}</Text> : null}
          </View>

          <View style={styles.dateBlock}>
            <Text>
              {resolvedDateLabel}: {resolvedDate}
            </Text>
          </View>
        </View>

        <View style={styles.columns}>
          {/* Left: letter content */}
          <View style={styles.leftColumn}>
            <Text style={styles.subject}>{copy.subject}</Text>

            <Text style={styles.paragraph}>{salutation}</Text>

            {copy.introParagraphs.map((paragraph, index) => (
              <Text key={`intro-${index}`} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}

            {/* Decision / case text (dynamic) */}
            {decisionBlocks.map(renderBlock)}

            {copy.closingParagraphs.map((paragraph, index) => (
              <Text key={`closing-${index}`} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}

            <Text style={styles.paragraph}>{copy.closingGreeting}</Text>

            <Text style={styles.signatureName}>{signatureName}</Text>
          </View>

          {/* Right: attachments */}
          <View style={styles.rightColumn}>
            <Text style={styles.attachmentsTitle}>{copy.attachmentsTitle}</Text>
            {copy.attachmentsItems.map((item, index) => (
              <Text key={`attachment-${index}`} style={styles.attachmentsItem}>
                {item}
              </Text>
            ))}
          </View>
        </View>
      </Page>

      {/* Page 2: Annex 1 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.annexTitle}>{copy.annex1.title}</Text>

        <Image
          src={annex1SchemaImg}
          style={{ ...styles.annexImage, height: 650 }}
        />

        <Text style={styles.annexCaption}>{copy.annex1.caption}</Text>
        <Text style={styles.annexCaption}>
          ({copy.annex1.sourceLabel}{' '}
          <Link style={styles.link} src={copy.annex1.sourceLinkUrl}>
            {copy.annex1.sourceLinkText}
          </Link>
          )
        </Text>
      </Page>

      {/* Page 3: Annex 2 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.annexTitle}>{copy.annex2.title}</Text>
        <Text style={styles.annexSubTitle}>{copy.annex2.subtitle}</Text>
        <Text style={styles.annexCaption}>
          ({copy.annex2.sourceLabel}{' '}
          <Link style={styles.link} src={copy.annex2.sourceLinkUrl}>
            {copy.annex2.sourceLinkText}
          </Link>
          )
        </Text>

        {copy.annex2.preImageParagraphs.map((paragraph, index) => (
          <Text
            key={`annex2-pre-${index}`}
            style={[styles.paragraph, styles.small]}
          >
            {paragraph}
          </Text>
        ))}

        <Image
          src={annex2GuideExcerptImg}
          style={{ ...styles.annexImage, height: 360 }}
        />

        {copy.annex2.postImageParagraphs.map((paragraph, index) => (
          <Text
            key={`annex2-post-${index}`}
            style={[styles.paragraph, styles.small]}
          >
            {paragraph}
          </Text>
        ))}
      </Page>
    </Document>
  );
};

export default DoctorLetterPdfDocument;
