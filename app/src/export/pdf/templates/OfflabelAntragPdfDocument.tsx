import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { DocumentModel } from '../types';
import { ensurePdfFontsRegistered, PDF_FONT_FAMILY_SANS } from '../fonts';
import { formatLocalizedDate } from '../../../lib/version';
import type { OfflabelPdfTemplateData } from '../../../formpacks/offlabel-antrag/export/pdfDocumentModel';
import type { OffLabelPostExportChecklist } from '../../../formpacks/offlabel-antrag/export/documentModel';

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
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  checklistCheckbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: '#000000',
    marginTop: 1,
    marginRight: 6,
    flexShrink: 0,
  },
  checklistItemText: {
    flex: 1,
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

  const compactLine = `${lines[nameIndex]} – ${lines[streetIndex]} – ${lines[postalCityIndex]}`;
  const remainingLines = lines.filter(
    (_, index) =>
      index !== nameIndex && index !== streetIndex && index !== postalCityIndex,
  );

  return [compactLine, ...remainingLines];
};

const parseDayMonthYearDate = (rawDateLine: string): Date | null => {
  const match = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(rawDateLine);
  if (!match) {
    return null;
  }

  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const formatDateValue = (rawDateLine: string, locale: string): string => {
  const date = parseDayMonthYearDate(rawDateLine);
  if (!date) {
    return rawDateLine.trim();
  }

  return formatLocalizedDate(date, locale, { dateStyle: 'medium' });
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
  const isConsentHeading = (line: string): boolean => {
    const normalized = line.trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    const hasSectionPrefix = /^3(?:\s|[.)\-–:])/.test(normalized);
    if (!hasSectionPrefix) {
      return false;
    }

    return /(einwilligung|consent)/.test(normalized);
  };

  const consentIndex = paragraphs.findIndex((line) => isConsentHeading(line));
  if (consentIndex < 0) {
    const fallbackSectionIndex = paragraphs.findIndex((line) =>
      /^3(?:\s|[.)\-–:])/.test(line.trim()),
    );
    if (fallbackSectionIndex < 0) {
      return { before: paragraphs, fromConsent: [] as string[] };
    }

    return {
      before: paragraphs.slice(0, fallbackSectionIndex),
      fromConsent: paragraphs.slice(fallbackSectionIndex),
    };
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

const renderChecklistItems = (items: string[], keyPrefix: string) =>
  toKeyedEntries(items, keyPrefix).map((entry) => (
    <View key={entry.key} style={styles.checklistItemRow}>
      <View style={styles.checklistCheckbox} />
      <Text style={styles.checklistItemText}>{entry.value}</Text>
    </View>
  ));

const renderChecklistPage = ({
  checklist,
}: {
  checklist: OffLabelPostExportChecklist;
}) => {
  const attachmentItems =
    checklist.attachmentsItems.length > 0
      ? checklist.attachmentsItems
      : [checklist.attachmentsFallbackItem];

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.subject}>{checklist.title}</Text>
      <Text style={styles.paragraph}>{checklist.intro}</Text>

      <View style={styles.attachmentsBlock} wrap={false}>
        <Text style={styles.attachmentsHeading}>
          {checklist.documentsHeading}
        </Text>
        {renderChecklistItems(checklist.documentsItems, 'checklist-documents')}
      </View>

      <View style={styles.attachmentsBlock} wrap={false}>
        <Text style={styles.attachmentsHeading}>
          {checklist.signaturesHeading}
        </Text>
        {renderChecklistItems(
          checklist.signaturesItems,
          'checklist-signatures',
        )}
      </View>

      <View style={styles.attachmentsBlock} wrap={false}>
        <Text style={styles.attachmentsHeading}>
          {checklist.physicianSupportHeading}
        </Text>
        {renderChecklistItems(
          checklist.physicianSupportItems,
          'checklist-physician',
        )}
      </View>

      <View style={styles.attachmentsBlock} wrap={false}>
        <Text style={styles.attachmentsHeading}>
          {checklist.attachmentsHeading}
        </Text>
        {renderChecklistItems(attachmentItems, 'checklist-attachments')}
      </View>

      <View style={styles.attachmentsBlock} wrap={false}>
        <Text style={styles.attachmentsHeading}>
          {checklist.shippingHeading}
        </Text>
        {renderChecklistItems(checklist.shippingItems, 'checklist-shipping')}
      </View>

      <Text style={styles.paragraph}>{checklist.note}</Text>
    </Page>
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
        <View style={styles.sourcesBlock} wrap={false}>
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
  const checklist = templateData?.postExportChecklist;

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
      {checklist ? renderChecklistPage({ checklist }) : null}
    </Document>
  );
};

export default OfflabelAntragPdfDocument;
