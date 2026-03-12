import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { ensurePdfFontsRegistered, PDF_FONT_FAMILY_SANS } from '../fonts';
import type { DocumentModel } from '../types';
import type { NotfallpassPdfTemplateData } from '../../../formpacks/notfallpass/export/pdfDocumentModel';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f7f4ee',
    color: '#18212b',
    fontFamily: PDF_FONT_FAMILY_SANS,
    fontSize: 10,
    lineHeight: 1.35,
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    paddingRight: 24,
  },
  hero: {
    backgroundColor: '#163f69',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    color: '#dbe7f6',
    fontSize: 10.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  panel: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7dee8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  panelWide: {
    width: '100%',
  },
  panelHeading: {
    fontSize: 11,
    fontWeight: 700,
    color: '#163f69',
    marginBottom: 8,
  },
  row: {
    marginBottom: 5,
  },
  rowLabel: {
    fontSize: 8.5,
    color: '#5d6b7d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  rowValue: {
    fontSize: 10.5,
    color: '#18212b',
  },
  bulletItem: {
    marginBottom: 3,
    paddingLeft: 8,
  },
  paragraph: {
    marginBottom: 4,
  },
  footer: {
    marginTop: 8,
    fontSize: 8.5,
    color: '#5d6b7d',
  },
});

ensurePdfFontsRegistered();

const normalizePdfLanguage = (locale: string): string =>
  locale.toLowerCase().startsWith('de') ? 'de-DE' : 'en-US';

const renderRows = (rows: Array<[string, string]>) =>
  rows.map(([label, value]) => (
    <View key={`${label}:${value}`} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  ));

const renderBullets = (items: string[]) =>
  items.map((item) => (
    <Text key={item} style={styles.bulletItem}>
      • {item}
    </Text>
  ));

const NotfallpassPdfDocument = ({ model }: { model: DocumentModel }) => {
  const templateData = model.meta?.templateData as
    | NotfallpassPdfTemplateData
    | undefined;
  const locale = model.meta?.locale ?? 'de';
  const pdfLanguage = normalizePdfLanguage(locale);
  const title = model.title?.trim() || templateData?.title || 'Notfallpass';

  if (!templateData) {
    return (
      <Document title={title} subject={title} language={pdfLanguage}>
        <Page size="A4" style={styles.page}>
          <View style={styles.hero}>
            <Text style={styles.title}>{title}</Text>
          </View>
        </Page>
      </Document>
    );
  }

  const medicationItems =
    templateData.medications.length > 0
      ? templateData.medications.map((medication) =>
          [medication.name, medication.dosage, medication.schedule]
            .filter((entry, index) => !(index > 0 && entry === '—'))
            .join(' · '),
        )
      : ['—'];

  const contactItems =
    templateData.contacts.length > 0
      ? templateData.contacts.map(
          (contact) =>
            [contact.name, contact.phone]
              .filter((entry) => entry !== '—')
              .join(' · ') || '—',
        )
      : ['—'];

  return (
    <Document
      title={title}
      subject={title}
      creator="mecfs-paperwork"
      producer="@react-pdf/renderer"
      keywords="Notfallpass, emergency pass, ME/CFS"
      language={pdfLanguage}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <Text style={styles.title}>{templateData.title}</Text>
          <Text style={styles.subtitle}>{templateData.subtitle}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.panel}>
            <Text style={styles.panelHeading}>
              {templateData.personHeading}
            </Text>
            {renderRows(templateData.personRows)}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelHeading}>
              {templateData.doctorHeading}
            </Text>
            {renderRows(templateData.doctorRows)}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelHeading}>
              {templateData.contactsHeading}
            </Text>
            {renderBullets(contactItems)}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelHeading}>
              {templateData.medicationsHeading}
            </Text>
            {renderBullets(medicationItems)}
          </View>

          <View style={[styles.panel, styles.panelWide]}>
            <Text style={styles.panelHeading}>
              {templateData.diagnosesHeading}
            </Text>
            <Text style={styles.paragraph}>
              {templateData.diagnosesSummary}
            </Text>
            {templateData.diagnosisParagraphs.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>

          <View style={[styles.panel, styles.panelWide]}>
            <Text style={styles.panelHeading}>
              {templateData.symptomsHeading}
            </Text>
            <Text style={styles.paragraph}>{templateData.symptoms}</Text>
          </View>

          <View style={[styles.panel, styles.panelWide]}>
            <Text style={styles.panelHeading}>
              {templateData.allergiesHeading}
            </Text>
            <Text style={styles.paragraph}>{templateData.allergies}</Text>
          </View>
        </View>

        <Text style={styles.footer}>{templateData.createdAtIso}</Text>
      </Page>
    </Document>
  );
};

export default NotfallpassPdfDocument;
