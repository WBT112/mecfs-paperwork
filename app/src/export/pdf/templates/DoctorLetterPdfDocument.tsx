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

const formatPatientLine = (d?: DoctorLetterTemplateData) => {
  const p = d?.patient ?? {};
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  const street = p.streetAndNumber ?? '';
  const city = [p.postalCode, p.city].filter(Boolean).join(' ').trim();

  return [fullName, street, city].filter(Boolean).join(' – ');
};

const formatDoctorNameLine = (d?: DoctorLetterTemplateData) => {
  const doc = d?.doctor ?? {};
  const title = doc.title && doc.title !== 'kein' ? doc.title : '';
  return [title, doc.name].filter(Boolean).join(' ').trim();
};

const buildSalutation = (d?: DoctorLetterTemplateData) => {
  const doc = d?.doctor ?? {};
  const title = doc.title && doc.title !== 'kein' ? doc.title : '';
  const full = [title, doc.name].filter(Boolean).join(' ').trim();

  if (doc.gender === 'Frau') {
    return `Sehr geehrte Frau${full ? ` ${full}` : ''},`;
  }
  if (doc.gender === 'Herr') {
    return `Sehr geehrter Herr${full ? ` ${full}` : ''},`;
  }
  return 'Sehr geehrte Damen und Herren,';
};

export const DoctorLetterPdfDocument = ({
  model,
}: {
  model: DocumentModel;
}) => {
  const templateData = model.meta?.templateData as DoctorLetterTemplateData | undefined;

  const locale = model.meta?.locale ?? 'de-DE';
  const formattedDate =
    templateData?.formattedDate ??
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      new Date(model.meta?.createdAtIso ?? new Date().toISOString()),
    );
  const dateLabel = templateData?.dateLabel ?? 'Datum';

  const pLine = formatPatientLine(templateData);
  const salutation = buildSalutation(templateData);
  const signatureName =
    [templateData?.patient?.firstName, templateData?.patient?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || '';

  // We expect the decision blocks to be the last section.
  const decisionBlocks = model.sections.at(-1)?.blocks ?? [];

  const doc = templateData?.doctor ?? {};
  const doctorCityLine = [doc.postalCode, doc.city].filter(Boolean).join(' ').trim();

  return (
    <Document>
      {/* Page 1: Letter + attachments */}
      <Page size="A4" style={styles.page}>
        {pLine ? <Text style={styles.headerPatientLine}>{pLine}</Text> : null}
        <View style={styles.hr} />

        <View style={styles.headerRow}>
          <View style={styles.addressBlock}>
            {doc.practice ? <Text>{doc.practice}</Text> : null}
            {formatDoctorNameLine(templateData) ? (
              <Text>{formatDoctorNameLine(templateData)}</Text>
            ) : null}
            {doc.streetAndNumber ? <Text>{doc.streetAndNumber}</Text> : null}
            {doctorCityLine ? <Text>{doctorCityLine}</Text> : null}
          </View>

          <View style={styles.dateBlock}>
            <Text>
              {dateLabel}: {formattedDate}
            </Text>
          </View>
        </View>

        <View style={styles.columns}>
          {/* Left: letter content */}
          <View style={styles.leftColumn}>
            <Text style={styles.subject}>
              Information zu geänderten ICD-10-Kodierungen ab 01.01.2026 für ME/CFS
            </Text>

            <Text style={styles.paragraph}>{salutation}</Text>

            <Text style={styles.paragraph}>
              wie Sie vielleicht bereits wissen, gibt es seit dem 01.01.2026 wichtige
              Änderungen in der ICD-10-GM Version 2026, die u. a. für eine meiner Diagnosen
              relevant sind.
            </Text>

            <Text style={styles.paragraph}>
              Die bisherige Kodierung G93.3 für Myalgische Enzephalomyelitis / Chronisches
              Fatigue-Syndrom (ME/CFS) ist nicht mehr abrechenbar. Stattdessen muss nun eine
              spezifischere Unterscheidung zwischen postinfektiösen und nicht-postinfektiösen
              Formen, unklarer Ursache und reiner chronischer Fatigue - mit oder ohne
              post-exertionelle Malaise (PEM) - getroffen werden.
            </Text>

            <Text style={styles.paragraph}>
              Im beigefügten Schema ist die neue Systematik übersichtlich und leicht
              nachvollziehbar dargestellt.
            </Text>

            {/* Decision / case text (dynamic) */}
            {decisionBlocks.map(renderBlock)}

            <Text style={styles.paragraph}>
              Ich bitte Sie daher, bei der nächsten Kodierung meiner Diagnose diese Änderungen
              zu berücksichtigen. Meines Wissens haben sich für meine anderen bestehenden
              Diagnosen keine Änderungen durch die neue ICD-10 GM2026 Version ergeben.
              Lassen Sie mich bitte wissen, ob Sie das genauso sehen. Gerne stehe ich für
              Rückfragen zur Verfügung.
            </Text>

            <Text style={styles.paragraph}>Mit freundlichen Grüßen</Text>

            <Text style={styles.signatureName}>{signatureName}</Text>
          </View>

          {/* Right: attachments */}
          <View style={styles.rightColumn}>
            <Text style={styles.attachmentsTitle}>Anlagen</Text>
            <Text style={styles.attachmentsItem}>
              Schema ICD-10 Kodierung bei ME/CFS &amp; PEM
            </Text>
            <Text style={styles.attachmentsItem}>
              Auszug aus dem Praxisleitfaden der Deutschen Gesellschaft für ME/CFS
            </Text>
          </View>
        </View>
      </Page>

      {/* Page 2: Annex 1 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.annexTitle}>Anlage 1</Text>

        <Image
          src={annex1SchemaImg}
          style={{ ...styles.annexImage, height: 650 }}
        />

        <Text style={styles.annexCaption}>Quelle: Selbsthilfegruppe Molly</Text>
        <Text style={styles.annexCaption}>
          (online unter:{' '}
          <Link style={styles.link} src="https://teemitmolly.de/icd-10-gm2026-me-cfs/">
            teemitmolly.de/icd-10-gm2026-me-cfs/
          </Link>
          )
        </Text>
      </Page>

      {/* Page 3: Annex 2 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.annexTitle}>Anlage 2</Text>
        <Text style={styles.annexSubTitle}>
          Auszug aus dem Praxisleitfaden der Deutschen Gesellschaft für ME/CFS
        </Text>
        <Text style={styles.annexCaption}>
          (online unter:{' '}
          <Link style={styles.link} src="https://www.mecfs.de/was-ist-me-cfs/">
            mecfs.de/was-ist-me-cfs/
          </Link>
          )
        </Text>

        <Text style={[styles.paragraph, styles.small]}>
          Sowohl die CCC- als auch IOM-Kriterien werden insbesondere dann für die Diagnose von
          ME/CFS empfohlen, wenn der Patient nachweislich eine anhaltende Beeinträchtigung der
          Funktionsfähigkeit als Folge eines Infektes aufweist.
        </Text>

        <Image
          src={annex2GuideExcerptImg}
          style={{ ...styles.annexImage, height: 360 }}
        />

        <Text style={[styles.paragraph, styles.small]}>
          Die ME/CFS-Diagnosekriterien des CCC-Schemas enthalten aufgrund ihrer umfassenden
          Symptomerfassung neben den somatischen Beschwerden auch andere Bereiche, wie z. B.
          kognitive Störungen und autonome Symptome.
        </Text>

        <Text style={[styles.paragraph, styles.small]}>
          Die IOM-Kriterien gelten als einfacher zu erfüllen und können als Einstiegshilfe zur
          Diagnose herangezogen werden. Für die Diagnosestellung ist es jedoch wichtig, dass
          ein anhaltend eingeschränktes Funktionsniveau und ein Mindestbeschwerdezeitraum von
          mehr als sechs Monaten gegeben sind.
        </Text>
      </Page>
    </Document>
  );
};
