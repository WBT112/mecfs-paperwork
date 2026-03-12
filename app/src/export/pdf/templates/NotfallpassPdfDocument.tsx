import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { ensurePdfFontsRegistered, PDF_FONT_FAMILY_SANS } from '../fonts';
import type { DocumentModel } from '../types';
import type { NotfallpassPdfTemplateData } from '../../../formpacks/notfallpass/export/pdfDocumentModel';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f7f4ee',
    color: '#18212b',
    fontFamily: PDF_FONT_FAMILY_SANS,
    fontSize: 9.4,
    lineHeight: 1.28,
    paddingTop: 18,
    paddingBottom: 18,
    paddingLeft: 18,
    paddingRight: 18,
    position: 'relative',
  },
  foldGuideVertical: {
    position: 'absolute',
    top: 18,
    bottom: 18,
    left: '50%',
    width: 1,
    backgroundColor: '#c5cfdb',
  },
  foldGuideHorizontal: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: '50%',
    height: 1,
    backgroundColor: '#c5cfdb',
  },
  foldGrid: {
    borderWidth: 1,
    borderColor: '#c5cfdb',
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
    flex: 1,
  },
  panel: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7dee8',
    padding: 14,
    flex: 1,
  },
  panelTopLeft: {
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  panelTopRight: {
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderLeftWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  panelBottomLeft: {
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0.5,
    borderTopWidth: 0.5,
  },
  panelBottomRight: {
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderLeftWidth: 0.5,
    borderTopWidth: 0.5,
  },
  panelEyebrow: {
    color: '#5d6b7d',
    fontSize: 7.8,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  panelTitle: {
    fontSize: 12.8,
    fontWeight: 700,
    color: '#163f69',
    marginBottom: 4,
  },
  panelSubtitle: {
    color: '#304255',
    fontSize: 9.2,
    marginBottom: 8,
  },
  foldHint: {
    color: '#5d6b7d',
    fontSize: 7.8,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 8,
    color: '#5d6b7d',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  section: {
    marginBottom: 8,
  },
  row: {
    marginBottom: 4,
  },
  rowLabel: {
    fontSize: 7.8,
    color: '#5d6b7d',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    marginBottom: 1,
  },
  rowValue: {
    fontSize: 9.4,
    color: '#18212b',
  },
  bulletItem: {
    marginBottom: 2,
    paddingLeft: 8,
  },
  paragraph: {
    marginBottom: 4,
  },
  footer: {
    marginTop: 6,
    fontSize: 8.5,
    color: '#5d6b7d',
    textAlign: 'right',
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

const renderPanelSections = (
  sections: NotfallpassPdfTemplateData['panels'][number]['sections'],
) =>
  sections.map((section) => (
    <View key={section.heading} style={styles.section}>
      <Text style={styles.sectionHeading}>{section.heading}</Text>
      {section.type === 'rows' ? renderRows(section.rows) : null}
      {section.type === 'bullets' ? renderBullets(section.items) : null}
      {section.type === 'paragraphs'
        ? section.paragraphs.map((paragraph) => (
            <Text
              key={`${section.heading}:${paragraph}`}
              style={styles.paragraph}
            >
              {paragraph}
            </Text>
          ))
        : null}
    </View>
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
        <Page size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.foldGrid}>
            <View style={styles.gridRow}>
              <View style={[styles.panel, styles.panelTopLeft]}>
                <Text style={styles.panelTitle}>{title}</Text>
              </View>
              <View style={[styles.panel, styles.panelTopRight]} />
            </View>
            <View style={styles.gridRow}>
              <View style={[styles.panel, styles.panelBottomLeft]} />
              <View style={[styles.panel, styles.panelBottomRight]} />
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  return (
    <Document
      title={title}
      subject={title}
      creator="mecfs-paperwork"
      producer="@react-pdf/renderer"
      keywords="Notfallpass, emergency pass, ME/CFS"
      language={pdfLanguage}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.foldGuideVertical} />
        <View style={styles.foldGuideHorizontal} />

        <View style={styles.foldGrid}>
          <View style={styles.gridRow}>
            <View style={[styles.panel, styles.panelTopLeft]}>
              <Text style={styles.panelEyebrow}>Notfallpass</Text>
              <Text style={styles.panelTitle}>{templateData.title}</Text>
              <Text style={styles.panelSubtitle}>{templateData.subtitle}</Text>
              <Text style={styles.foldHint}>{templateData.foldHint}</Text>
              {renderPanelSections(templateData.panels[0].sections)}
            </View>

            <View style={[styles.panel, styles.panelTopRight]}>
              <Text style={styles.panelEyebrow}>
                {templateData.panels[1].title}
              </Text>
              {renderPanelSections(templateData.panels[1].sections)}
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.panel, styles.panelBottomLeft]}>
              <Text style={styles.panelEyebrow}>
                {templateData.panels[2].title}
              </Text>
              {renderPanelSections(templateData.panels[2].sections)}
            </View>

            <View style={[styles.panel, styles.panelBottomRight]}>
              <Text style={styles.panelEyebrow}>
                {templateData.panels[3].title}
              </Text>
              {renderPanelSections(templateData.panels[3].sections)}
            </View>
          </View>
        </View>

        <Text style={styles.footer}>{templateData.createdAtIso}</Text>
      </Page>
    </Document>
  );
};

export default NotfallpassPdfDocument;
