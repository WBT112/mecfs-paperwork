import rawGermanLetterContent from './letter-content.de.json';

/** Supported source-language identifiers for approved letter content. */
export type RepresentativeLetterContentLanguage = 'de';

/** Categories of archived personal source blocks. */
export type RepresentativeLetterBlockCategory = 'severity' | 'care';

/** One archived source block and its stable catalog identifiers. */
export type RepresentativeLetterContentBlock = {
  id: string;
  category: RepresentativeLetterBlockCategory;
  selectionId: string;
  variantId: string;
  label: string;
  sourceText: string;
};

/** One source shown with the approved long-form letter. */
export type RepresentativeLetterSourceReference = {
  id: string;
  label: string;
  url: string;
};

/** Versioned, maintainer-approved source catalog for letter generation. */
export type RepresentativeLetterContentCatalog = {
  schemaVersion: 1;
  contentVersion: string;
  contentLanguage: RepresentativeLetterContentLanguage;
  approval: {
    status: 'approved-as-provided';
    approvedAt: string;
    sourceIssue: number;
    notes: string;
  };
  subject: string;
  template: {
    opening: string[];
    requestHeading: string;
    requests: string[];
    responseRequest: string;
    templateDisclosure: string;
    signOff: string;
  };
  sourceReferences: RepresentativeLetterSourceReference[];
  personalBlocks: RepresentativeLetterContentBlock[];
};

/**
 * Approved German source catalog bundled with the offline application.
 *
 * @remarks Personal blocks remain archived verbatim for provenance but are not
 * used by the current minimal-click letter workflow.
 */
export const representativeLetterContent =
  rawGermanLetterContent as RepresentativeLetterContentCatalog;

/**
 * Resolves approved content for an interface locale.
 *
 * @param interfaceLocale - Current application locale.
 * @returns The approved German catalog until a separate English translation is
 * approved.
 * @remarks Returning one complete source language prevents partially translated
 * letters. The UI must disclose the returned catalog's `contentLanguage`.
 */
export const getRepresentativeLetterContent = (
  interfaceLocale: 'de' | 'en',
): RepresentativeLetterContentCatalog => {
  if (interfaceLocale === 'en') {
    return representativeLetterContent;
  }
  return representativeLetterContent;
};
