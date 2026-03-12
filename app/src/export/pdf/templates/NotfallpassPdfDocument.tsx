import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { ensurePdfFontsRegistered, PDF_FONT_FAMILY_SANS } from '../fonts';
import type { DocumentModel } from '../types';
import type { NotfallpassPdfTemplateData } from '../../../formpacks/notfallpass/export/pdfDocumentModel';

const PAGE_PADDING = 16;

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f6f1e8',
    color: '#18212b',
    fontFamily: PDF_FONT_FAMILY_SANS,
    fontSize: 8.8,
    lineHeight: 1.3,
    paddingTop: PAGE_PADDING,
    paddingBottom: PAGE_PADDING,
    paddingLeft: PAGE_PADDING,
    paddingRight: PAGE_PADDING,
    position: 'relative',
  },
  foldGuide: {
    position: 'absolute',
    top: PAGE_PADDING,
    bottom: PAGE_PADDING,
    width: 1,
    backgroundColor: '#c9b99d',
  },
  foldGuideFirst: {
    left: '25%',
  },
  foldGuideSecond: {
    left: '50%',
  },
  foldGuideThird: {
    left: '75%',
  },
  panelRow: {
    flexDirection: 'row',
    flex: 1,
    borderWidth: 1,
    borderColor: '#c9b99d',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fffdf9',
  },
  panel: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 10,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#d8ccba',
  },
  panelLast: {
    borderRightWidth: 0,
  },
  coverPanel: {
    backgroundColor: '#f2ede4',
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#163f69',
    marginBottom: 6,
  },
  panelSubtitle: {
    color: '#304255',
    fontSize: 8.4,
    marginBottom: 8,
  },
  foldHint: {
    color: '#5d6b7d',
    fontSize: 7.2,
    marginBottom: 10,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 7.3,
    color: '#5d6b7d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  row: {
    marginBottom: 4,
  },
  rowLabel: {
    fontSize: 7.1,
    color: '#5d6b7d',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  rowValue: {
    fontSize: 8.8,
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
    marginTop: 6,
    fontSize: 7.4,
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

const renderSections = (
  sections: NotfallpassPdfTemplateData['pages'][number]['panels'][number]['sections'],
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

const renderPanel = (
  panel: NotfallpassPdfTemplateData['pages'][number]['panels'][number],
  foldHint: string,
  index: number,
) => (
  <View
    key={`${panel.title}:${index}`}
    style={[
      styles.panel,
      ...(panel.isCover ? [styles.coverPanel] : []),
      ...(index === 3 ? [styles.panelLast] : []),
    ]}
    wrap={false}
  >
    <Text style={styles.panelTitle}>{panel.title}</Text>
    {panel.subtitle ? (
      <Text style={styles.panelSubtitle}>{panel.subtitle}</Text>
    ) : null}
    {panel.isCover ? <Text style={styles.foldHint}>{foldHint}</Text> : null}
    {renderSections(panel.sections)}
  </View>
);

const renderFallbackPage = (title: string) => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View style={[styles.foldGuide, styles.foldGuideFirst]} />
    <View style={[styles.foldGuide, styles.foldGuideSecond]} />
    <View style={[styles.foldGuide, styles.foldGuideThird]} />
    <View style={styles.panelRow}>
      <View style={[styles.panel, styles.coverPanel]}>
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      <View style={styles.panel} />
      <View style={styles.panel} />
      <View style={[styles.panel, styles.panelLast]} />
    </View>
  </Page>
);

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
        {renderFallbackPage(title)}
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
      {templateData.pages.map((page, pageIndex) => (
        <Page
          key={`notfallpass-page-${pageIndex + 1}`}
          size="A4"
          orientation="landscape"
          style={styles.page}
        >
          <View style={[styles.foldGuide, styles.foldGuideFirst]} />
          <View style={[styles.foldGuide, styles.foldGuideSecond]} />
          <View style={[styles.foldGuide, styles.foldGuideThird]} />
          <View style={styles.panelRow}>
            {page.panels.map((panel, panelIndex) =>
              renderPanel(panel, templateData.foldHint, panelIndex),
            )}
          </View>
          <Text style={styles.footer}>
            {templateData.createdAtIso} · {pageIndex + 1}/
            {templateData.pages.length}
          </Text>
        </Page>
      ))}
    </Document>
  );
};

export default NotfallpassPdfDocument;
