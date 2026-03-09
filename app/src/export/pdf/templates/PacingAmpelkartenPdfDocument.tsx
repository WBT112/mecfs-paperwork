import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { ensurePdfFontsRegistered, PDF_FONT_FAMILY_SANS } from '../fonts';
import { toKeyedEntries } from '../keyedEntries';
import type { DocumentModel } from '../types';
import type { PacingAmpelkartenPdfTemplateData } from '../../../formpacks/pacing-ampelkarten/export/pdfDocumentModel';

type PacingPdfCard = PacingAmpelkartenPdfTemplateData['cards'][number];

const BRAND_LABEL = 'MEcfs-paperwork';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f4efe8',
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 26,
    paddingRight: 26,
    fontFamily: PDF_FONT_FAMILY_SANS,
    fontSize: 10.5,
    lineHeight: 1.35,
  },
  pageHeader: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pageBody: {
    flexGrow: 1,
  },
  brand: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#163f69',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  card: {
    borderWidth: 2.2,
    borderRadius: 14,
    height: '100%',
    overflow: 'hidden',
  },
  halfPageSlot: {
    flexGrow: 1,
    flexBasis: 0,
  },
  notesCard: {
    backgroundColor: '#f4f7fb',
    borderColor: '#8faecc',
  },
  cardRail: {
    height: 10,
    width: '100%',
  },
  cardInner: {
    padding: 14,
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: 700,
    marginBottom: 6,
  },
  animalLabel: {
    fontSize: 8.5,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    alignSelf: 'flex-start',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  backgroundImage: {
    width: '100%',
    height: 96,
    objectFit: 'cover',
    borderRadius: 10,
    marginBottom: 10,
  },
  section: {
    marginBottom: 10,
    borderLeftWidth: 2,
    paddingLeft: 8,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    marginBottom: 3,
  },
  bulletItem: {
    marginBottom: 2,
    paddingLeft: 8,
  },
  helperText: {
    marginTop: 6,
    fontSize: 9.5,
    color: '#334155',
  },
  cutLine: {
    marginVertical: 10,
    textAlign: 'center',
    color: '#456381',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.6,
  },
  notesTitle: {
    color: '#174A7E',
  },
});

ensurePdfFontsRegistered();

const normalizePdfLanguage = (locale: string): string =>
  locale.toLowerCase().startsWith('de') ? 'de-DE' : 'en-US';

const renderBulletList = (items: string[], prefix: string) =>
  toKeyedEntries(items, prefix).map((entry) => (
    <Text key={entry.key} style={styles.bulletItem}>
      • {entry.value}
    </Text>
  ));

const renderCard = (card: PacingPdfCard) => (
  <View
    key={card.color}
    style={[
      styles.card,
      {
        borderColor: card.borderColor,
        backgroundColor: card.surfaceColor,
      },
    ]}
  >
    <View style={[styles.cardRail, { backgroundColor: card.accentColor }]} />
    <View style={styles.cardInner}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: card.titleColor }]}>
          {card.title}
        </Text>
        <Text
          style={[styles.animalLabel, { backgroundColor: card.accentColor }]}
        >
          {card.animalLabel}
        </Text>
        <Image src={card.imageSrc} style={styles.backgroundImage} />
      </View>

      {card.sections.map((section) =>
        section.items.length > 0 ? (
          <View
            key={`${card.color}:${section.id}`}
            style={[styles.section, { borderLeftColor: card.accentColor }]}
          >
            <Text
              style={[styles.sectionLabel, { color: card.sectionLabelColor }]}
            >
              {section.label}
            </Text>
            {renderBulletList(section.items, `${card.color}:${section.id}`)}
          </View>
        ) : null,
      )}

      {card.hint ? (
        <Text style={styles.helperText}>
          {card.hintLabel}: {card.hint}
        </Text>
      ) : null}
      {card.thanks ? (
        <Text style={styles.helperText}>
          {card.thanksLabel}: {card.thanks}
        </Text>
      ) : null}
    </View>
  </View>
);

const PacingAmpelkartenPdfDocument = ({ model }: { model: DocumentModel }) => {
  const locale = model.meta?.locale ?? 'de';
  const pdfLanguage = normalizePdfLanguage(locale);
  const templateData = model.meta?.templateData as
    | PacingAmpelkartenPdfTemplateData
    | undefined;
  const title = model.title?.trim() || 'Pacing-Ampelkarten';
  const cards =
    templateData?.cards ??
    ([
      {
        color: 'green',
        title: '',
        animalLabel: '',
        imageAlt: '',
        imageSrc: '',
        accentColor: '',
        borderColor: '',
        surfaceColor: '',
        titleColor: '',
        sectionLabelColor: '',
        hintLabel: '',
        hint: '',
        thanksLabel: '',
        thanks: '',
        sections: [],
      },
      {
        color: 'yellow',
        title: '',
        animalLabel: '',
        imageAlt: '',
        imageSrc: '',
        accentColor: '',
        borderColor: '',
        surfaceColor: '',
        titleColor: '',
        sectionLabelColor: '',
        hintLabel: '',
        hint: '',
        thanksLabel: '',
        thanks: '',
        sections: [],
      },
      {
        color: 'red',
        title: '',
        animalLabel: '',
        imageAlt: '',
        imageSrc: '',
        accentColor: '',
        borderColor: '',
        surfaceColor: '',
        titleColor: '',
        sectionLabelColor: '',
        hintLabel: '',
        hint: '',
        thanksLabel: '',
        thanks: '',
        sections: [],
      },
    ] as PacingAmpelkartenPdfTemplateData['cards']);
  const notes = templateData?.notes ?? { title: '', items: [] };
  const signatureLabel = templateData?.signatureLabel ?? '';
  const signature = templateData?.signature ?? '';
  const cutLineLabel = templateData?.cutLineLabel ?? '✂';

  return (
    <Document
      title={title}
      subject={title}
      creator="mecfs-paperwork"
      producer="@react-pdf/renderer"
      keywords="ME/CFS, Pacing, Signal cards, PDF"
      language={pdfLanguage}
      pageMode="useOutlines"
    >
      <Page size="A4" style={styles.page} bookmark={cards[0].title || title}>
        <View style={styles.pageHeader}>
          <Text style={styles.brand}>{BRAND_LABEL}</Text>
        </View>
        <View style={styles.pageBody}>
          <View style={styles.halfPageSlot}>{renderCard(cards[0])}</View>
          <Text style={styles.cutLine}>{cutLineLabel}</Text>
          <View style={styles.halfPageSlot}>{renderCard(cards[1])}</View>
        </View>
      </Page>

      <Page
        size="A4"
        style={styles.page}
        bookmark={cards[2].title || notes.title || title}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.brand}>{BRAND_LABEL}</Text>
        </View>
        <View style={styles.pageBody}>
          <View style={styles.halfPageSlot}>{renderCard(cards[2])}</View>
          <Text style={styles.cutLine}>{cutLineLabel}</Text>
          <View style={styles.halfPageSlot}>
            <View style={[styles.card, styles.notesCard]}>
              <View style={[styles.cardRail, { backgroundColor: '#174A7E' }]} />
              <View style={styles.cardInner}>
                <Text style={[styles.cardTitle, styles.notesTitle]}>
                  {notes.title}
                </Text>
                {renderBulletList(notes.items, 'notes')}
                {signature ? (
                  <Text style={styles.helperText}>
                    {signatureLabel}: {signature}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PacingAmpelkartenPdfDocument;
