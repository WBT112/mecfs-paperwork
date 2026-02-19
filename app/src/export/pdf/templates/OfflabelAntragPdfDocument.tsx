import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { DocumentModel } from '../types';
import {
  ensurePdfFontsRegistered,
  PDF_FONT_FAMILY_SANS,
  PDF_FONT_FAMILY_SERIF,
} from '../fonts';
import type { OfflabelPdfTemplateData } from '../../../formpacks/offlabel-antrag/export/pdfDocumentModel';

type LetterLike = {
  senderLines: string[];
  addresseeLines: string[];
  dateLine: string;
  subject: string;
  paragraphs: string[];
  attachments?: string[];
  attachmentsHeading?: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 56,
    paddingLeft: 64,
    paddingRight: 56,
    fontFamily: PDF_FONT_FAMILY_SANS,
    fontSize: 11,
    lineHeight: 1.35,
  },
  senderBlock: {
    marginBottom: 10,
  },
  senderLine: {
    fontSize: 10,
  },
  headerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginBottom: 12,
  },
  addressBlock: {
    marginBottom: 10,
  },
  dateLine: {
    textAlign: 'right',
    marginBottom: 10,
  },
  subject: {
    fontFamily: PDF_FONT_FAMILY_SERIF,
    fontWeight: 700,
    fontSize: 11,
    marginBottom: 12,
  },
  paragraph: {
    marginBottom: 10,
  },
  spacerParagraph: {
    marginBottom: 10,
  },
  attachmentsBlock: {
    marginTop: 10,
  },
  attachmentsHeading: {
    fontFamily: PDF_FONT_FAMILY_SERIF,
    fontWeight: 700,
    marginBottom: 4,
  },
  bulletItem: {
    marginBottom: 3,
    fontSize: 10,
    lineHeight: 1.3,
  },
  sourcesBlock: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#000000',
  },
});

ensurePdfFontsRegistered();

const toKeyedEntries = (items: string[], prefix: string) => {
  const seenCounts = new Map<string, number>();

  return items.map((item) => {
    const count = (seenCounts.get(item) ?? 0) + 1;
    seenCounts.set(item, count);
    return {
      key: `${prefix}:${item}:${count}`,
      value: item,
    };
  });
};

const renderLineBlock = (lines: string[], keyPrefix: string) => {
  if (lines.length === 0) {
    return null;
  }

  return (
    <View style={styles.addressBlock}>
      {toKeyedEntries(lines, keyPrefix).map((entry) => (
        <Text key={entry.key}>{entry.value}</Text>
      ))}
    </View>
  );
};

const renderParagraphs = (paragraphs: string[], keyPrefix: string) =>
  toKeyedEntries(paragraphs, keyPrefix).map((entry) => {
    if (entry.value.trim().length === 0) {
      return (
        <Text key={`${entry.key}:spacer`} style={styles.spacerParagraph}>
          {' '}
        </Text>
      );
    }

    return (
      <Text key={entry.key} style={styles.paragraph}>
        {entry.value}
      </Text>
    );
  });

const renderAttachments = (
  heading: string | undefined,
  items: string[] | undefined,
  locale: string,
) => {
  if (!items || items.length === 0) {
    return null;
  }

  const fallbackHeading = locale.toLowerCase().startsWith('en')
    ? 'Attachments'
    : 'Anlagen';

  return (
    <View style={styles.attachmentsBlock}>
      <Text style={styles.attachmentsHeading}>
        {heading || fallbackHeading}
      </Text>
      {toKeyedEntries(items, 'attachment').map((entry) => (
        <Text key={entry.key} style={styles.bulletItem}>
          • {entry.value}
        </Text>
      ))}
    </View>
  );
};

const renderLetterPage = ({
  data,
  locale,
  includeSources = false,
  sourcesHeading,
  sources,
}: {
  data: LetterLike;
  locale: string;
  includeSources?: boolean;
  sourcesHeading?: string;
  sources?: string[];
}) => {
  const subjectLabel = locale.toLowerCase().startsWith('en')
    ? 'Subject'
    : 'Betreff';

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.senderBlock}>
        {toKeyedEntries(data.senderLines, 'sender').map((entry) => (
          <Text key={entry.key} style={styles.senderLine}>
            {entry.value}
          </Text>
        ))}
      </View>
      <View style={styles.headerDivider} />

      {renderLineBlock(data.addresseeLines, 'addressee')}

      <Text style={styles.dateLine}>{data.dateLine}</Text>
      <Text style={styles.subject}>
        {subjectLabel}: {data.subject}
      </Text>

      {renderParagraphs(data.paragraphs, 'paragraph')}

      {renderAttachments(data.attachmentsHeading, data.attachments, locale)}

      {includeSources && sources && sources.length > 0 ? (
        <View style={styles.sourcesBlock}>
          <Text style={styles.attachmentsHeading}>
            {sourcesHeading ||
              (locale.toLowerCase().startsWith('en') ? 'Sources' : 'Quellen')}
          </Text>
          {toKeyedEntries(sources, 'source').map((entry) => (
            <Text key={entry.key} style={styles.bulletItem}>
              • {entry.value}
            </Text>
          ))}
        </View>
      ) : null}
    </Page>
  );
};

const EMPTY_LETTER: LetterLike = {
  senderLines: [],
  addresseeLines: [],
  dateLine: '',
  subject: '',
  paragraphs: [],
};

const OfflabelAntragPdfDocument = ({ model }: { model: DocumentModel }) => {
  const locale = model.meta?.locale ?? 'de';
  const templateData = model.meta?.templateData as
    | OfflabelPdfTemplateData
    | undefined;

  const part1 = templateData?.exportBundle.part1 ?? {
    ...EMPTY_LETTER,
    attachments: [],
  };
  const part2 = templateData?.exportBundle.part2 ?? {
    ...EMPTY_LETTER,
    attachments: [],
  };
  const part3 = templateData?.exportBundle.part3 ?? EMPTY_LETTER;

  return (
    <Document>
      {renderLetterPage({
        data: part1,
        locale,
      })}
      {renderLetterPage({
        data: part2,
        locale,
      })}
      {renderLetterPage({
        data: part3,
        locale,
        includeSources: true,
        sourcesHeading: templateData?.sourcesHeading,
        sources: templateData?.sources,
      })}
    </Document>
  );
};

export default OfflabelAntragPdfDocument;
