import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { DocumentBlock, DocumentModel } from '../types';

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
    color: '#1f1f1f',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 6,
  },
  kvTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  kvKey: {
    width: '35%',
    fontWeight: 600,
    paddingRight: 8,
  },
  kvValue: {
    width: '65%',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletSymbol: {
    width: 14,
    fontWeight: 600,
  },
  bulletText: {
    flex: 1,
  },
});

const renderBlock = (block: DocumentBlock, index: number) => {
  switch (block.type) {
    case 'paragraph':
      return (
        <Text key={`paragraph-${index}`} style={styles.paragraph}>
          {block.text}
        </Text>
      );
    case 'lineBreaks':
      return (
        <Text key={`linebreaks-${index}`} style={styles.paragraph}>
          {block.lines.map((line, lineIndex) => (
            <Text key={`line-${index}-${lineIndex}`}>
              {line}
              {lineIndex < block.lines.length - 1 ? '\n' : ''}
            </Text>
          ))}
        </Text>
      );
    case 'bullets':
      return (
        <View key={`bullets-${index}`}>
          {block.items.map((item, itemIndex) => (
            <View key={`bullet-${index}-${itemIndex}`} style={styles.bulletRow}>
              <Text style={styles.bulletSymbol}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'kvTable':
      return (
        <View key={`kv-${index}`} style={styles.kvTable}>
          {block.rows.map(([key, value], rowIndex) => (
            <View key={`kv-${index}-${rowIndex}`} style={styles.kvRow}>
              <Text style={styles.kvKey}>{key}</Text>
              <Text style={styles.kvValue}>{value}</Text>
            </View>
          ))}
        </View>
      );
    default:
      return null;
  }
};

type DoctorLetterPdfDocumentProps = {
  model: DocumentModel;
};

const DoctorLetterPdfDocument = ({ model }: DoctorLetterPdfDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page} wrap>
      {model.title ? <Text style={styles.title}>{model.title}</Text> : null}
      {model.sections.map((section, sectionIndex) => (
        <View key={`section-${sectionIndex}`} style={styles.section}>
          {section.heading ? (
            <Text style={styles.sectionHeading}>{section.heading}</Text>
          ) : null}
          {section.blocks.map((block, blockIndex) =>
            renderBlock(block, blockIndex),
          )}
        </View>
      ))}
    </Page>
  </Document>
);

export default DoctorLetterPdfDocument;
