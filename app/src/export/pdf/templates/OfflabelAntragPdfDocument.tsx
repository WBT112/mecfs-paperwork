import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { DocumentModel } from '../types';
import { ensurePdfFontsRegistered, PDF_FONT_FAMILY_SANS } from '../fonts';
import type { OfflabelPdfTemplateData } from '../../../formpacks/offlabel-antrag/export/pdfDocumentModel';

type LetterLike = {
  senderLines: string[];
  addresseeLines: string[];
  dateLine: string;
  subject: string;
  paragraphs: string[];
  liabilityHeading?: string;
  liabilityParagraphs?: string[];
  liabilityDateLine?: string;
  liabilitySignerName?: string;
  attachments?: string[];
  attachmentsHeading?: string;
};

const GREETING_LINES = new Set(['Mit freundlichen Grüßen', 'Kind regards']);

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
    fontFamily: PDF_FONT_FAMILY_SANS,
    fontWeight: 700,
    fontSize: 11,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 2,
  },
  spacerParagraph: {
    marginBottom: 2,
  },
  attachmentsBlock: {
    marginTop: 10,
  },
  attachmentsHeading: {
    fontFamily: PDF_FONT_FAMILY_SANS,
    fontWeight: 700,
    marginBottom: 4,
  },
  bulletItem: {
    marginBottom: 2,
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

const looksLikePostalCityLine = (line: string): boolean =>
  /^\d{4,5}\s+\S+/.test(line.trim());

const looksLikeStreetLine = (line: string): boolean =>
  /\d/.test(line) && !looksLikePostalCityLine(line);

const buildCompactSenderLines = (senderLines: string[]): string[] => {
  const lines = senderLines.map((line) => line.trim()).filter(Boolean);
  if (lines.length < 3) {
    return lines;
  }

  const postalCityIndex = lines.findIndex((line) =>
    looksLikePostalCityLine(line),
  );
  if (postalCityIndex < 0) {
    return lines;
  }

  const streetIndex = lines.findIndex(
    (line, index) => index < postalCityIndex && looksLikeStreetLine(line),
  );
  if (streetIndex < 0) {
    return lines;
  }

  const nameIndex = lines.findIndex(
    (_, index) => index !== streetIndex && index !== postalCityIndex,
  );
  if (nameIndex < 0) {
    return lines;
  }

  const compactLine = `${lines[nameIndex]} – ${lines[streetIndex]} – ${lines[postalCityIndex]}`;
  const remainingLines = lines.filter(
    (_, index) =>
      index !== nameIndex && index !== streetIndex && index !== postalCityIndex,
  );

  return [compactLine, ...remainingLines];
};

const formatDateValue = (rawDateLine: string, locale: string): string => {
  const match = rawDateLine.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (!match) {
    return rawDateLine.trim();
  }

  const [, left, middle, year] = match;
  if (locale.toLowerCase().startsWith('de')) {
    return `${left.padStart(2, '0')}.${middle.padStart(2, '0')}.${year}`;
  }

  return `${left.padStart(2, '0')}/${middle.padStart(2, '0')}/${year}`;
};

const formatDateLine = (rawDateLine: string, locale: string): string => {
  const label = locale.toLowerCase().startsWith('en') ? 'Date' : 'Datum';
  const dateValue = formatDateValue(rawDateLine, locale);
  return dateValue.length > 0 ? `${label}: ${dateValue}` : `${label}:`;
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

const splitParagraphsForClosingBlock = (paragraphs: string[]) => {
  const greetingIndex = paragraphs.findIndex((line) =>
    GREETING_LINES.has(line.trim()),
  );
  if (greetingIndex < 0) {
    return {
      before: paragraphs,
      closing: [] as string[],
      after: [] as string[],
    };
  }

  const signatureIndex = paragraphs.findIndex(
    (line, index) => index > greetingIndex && line.trim().length > 0,
  );
  if (signatureIndex < 0) {
    return {
      before: paragraphs,
      closing: [] as string[],
      after: [] as string[],
    };
  }

  return {
    before: paragraphs.slice(0, greetingIndex),
    closing: paragraphs.slice(greetingIndex, signatureIndex + 1),
    after: paragraphs.slice(signatureIndex + 1),
  };
};

const splitLiabilityParagraphsAtConsent = (paragraphs: string[]) => {
  const consentIndex = paragraphs.findIndex((line) => /^3\.\s+/.test(line));
  if (consentIndex < 0) {
    return { before: paragraphs, fromConsent: [] as string[] };
  }

  return {
    before: paragraphs.slice(0, consentIndex),
    fromConsent: paragraphs.slice(consentIndex),
  };
};

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
  const compactSenderLines = buildCompactSenderLines(data.senderLines);
  const formattedDateLine = formatDateLine(data.dateLine, locale);
  const { before, closing, after } = splitParagraphsForClosingBlock(
    data.paragraphs,
  );

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.senderBlock}>
        {toKeyedEntries(compactSenderLines, 'sender').map((entry) => (
          <Text key={entry.key} style={styles.senderLine}>
            {entry.value}
          </Text>
        ))}
      </View>
      <View style={styles.headerDivider} />

      {renderLineBlock(data.addresseeLines, 'addressee')}

      <Text style={styles.dateLine}>{formattedDateLine}</Text>
      <Text style={styles.subject}>{data.subject}</Text>

      {renderParagraphs(before, 'paragraph-before')}
      {closing.length > 0 ? (
        <View wrap={false}>
          {renderParagraphs(closing, 'paragraph-closing')}
        </View>
      ) : null}
      {renderParagraphs(after, 'paragraph-after')}

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

const renderLiabilityPage = ({ data }: { data: LetterLike }) => {
  if (!data.liabilityHeading || !data.liabilityParagraphs?.length) {
    return null;
  }

  const { before, fromConsent } = splitLiabilityParagraphsAtConsent(
    data.liabilityParagraphs,
  );

  return (
    <>
      <Page size="A4" style={styles.page}>
        <Text style={styles.subject}>{data.liabilityHeading}</Text>
        {renderParagraphs(before, 'liability-before-consent')}
      </Page>
      {fromConsent.length > 0 ? (
        <Page size="A4" style={styles.page}>
          {renderParagraphs(fromConsent, 'liability-from-consent')}
        </Page>
      ) : null}
    </>
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
        includeSources: true,
        sourcesHeading: templateData?.sourcesHeading,
        sources: templateData?.sources,
      })}
      {renderLetterPage({
        data: part2,
        locale,
      })}
      {renderLiabilityPage({ data: part2 })}
      {renderLetterPage({
        data: part3,
        locale,
      })}
    </Document>
  );
};

export default OfflabelAntragPdfDocument;
