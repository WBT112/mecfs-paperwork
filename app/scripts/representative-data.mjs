import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';

export const REPRESENTATIVE_DATA_PATH = new URL(
  '../src/features/representative-letter/data/representatives.json',
  import.meta.url,
);

export const REPRESENTATIVE_SOURCES = {
  bundestagMasterData:
    'https://www.bundestag.de/resource/blob/472878/MdB-Stammdaten.zip',
  bundestagMembers:
    'https://www.bundestag.de/ajax/filterlist/de/abgeordnete/1040594-1040594?offset=0&all=true&view=cards',
  bundestagAddressBook: 'https://www.bundestag.de/dokumente/adressbuch',
  abgeordnetenwatchMandates:
    'https://www.abgeordnetenwatch.de/api/v2/candidacies-mandates?parliament_period=161&range_end=1000',
};

export const STATE_NAMES = {
  BB: 'Brandenburg',
  BE: 'Berlin',
  BW: 'Baden-Württemberg',
  BY: 'Bayern',
  HB: 'Bremen',
  HE: 'Hessen',
  HH: 'Hamburg',
  MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen',
  NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz',
  SH: 'Schleswig-Holstein',
  SL: 'Saarland',
  SN: 'Sachsen',
  ST: 'Sachsen-Anhalt',
  TH: 'Thüringen',
};

const ALLOWED_MANDATE_TYPES = new Set(['direct', 'state-list', 'successor']);
const ALLOWED_CONTACT_STATUSES = new Set(['verified', 'missing']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const SHA256_PATTERN = /^[a-f\d]{64}$/u;

const text = (element, selector) =>
  element.querySelector(selector)?.textContent?.trim() ?? '';

const parseGermanDate = (value) => {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/u.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
};

const activeName = (member) => {
  const names = [...member.querySelectorAll(':scope > NAMEN > NAME')];
  return (
    names.find((name) => text(name, 'HISTORIE_BIS') === '') ?? names.at(-1)
  );
};

const periodDetails = (period) => ({
  number: Number(text(period, 'WKR_NUMMER')) || null,
  name: text(period, 'WKR_NAME') || null,
  stateCode: text(period, 'WKR_LAND') || text(period, 'LISTE') || null,
  mandateType:
    text(period, 'MANDATSART') === 'Direktwahl' ? 'direct' : 'state-list',
  mandateStart: parseGermanDate(text(period, 'MDBWP_VON')),
  mandateEnd: parseGermanDate(text(period, 'MDBWP_BIS')),
});

export const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex');

export const normalizePersonName = (value) =>
  value
    .trim()
    .toLocaleLowerCase('de')
    .replaceAll(/\b(?:prof|dr)\.?\s*/gu, '')
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .replaceAll('ı', 'i')
    .normalize('NFKD')
    .replaceAll(/\p{Mark}/gu, '')
    .replaceAll(/[^a-z\d]/gu, '');

export const parseBundestagXml = (xml) => {
  const document = new JSDOM(xml, { contentType: 'text/xml' }).window.document;
  const parsed = new Map();

  for (const member of document.querySelectorAll('MDB')) {
    const id = text(member, ':scope > ID');
    const name = activeName(member);
    const periods = [
      ...member.querySelectorAll(':scope > WAHLPERIODEN > WAHLPERIODE'),
    ];
    const currentPeriod = periods.find(
      (period) =>
        text(period, 'WP') === '21' && text(period, 'MDBWP_BIS') === '',
    );
    const latestPeriod = currentPeriod ?? periods.at(-1);

    if (!id || !name || !latestPeriod) {
      continue;
    }

    parsed.set(id, {
      id,
      firstName: text(name, 'VORNAME'),
      lastName: [
        text(name, 'PRAEFIX'),
        text(name, 'ADEL'),
        text(name, 'NACHNAME'),
      ]
        .filter(Boolean)
        .join(' '),
      academicTitle: text(name, 'AKAD_TITEL') || null,
      currentPeriod: currentPeriod ? periodDetails(currentPeriod) : null,
      latestPeriod: periodDetails(latestPeriod),
    });
  }

  return parsed;
};

export const parseBundestagProfiles = (html) => {
  const document = new JSDOM(html).window.document;
  const profiles = new Map();

  for (const article of document.querySelectorAll('article')) {
    const link = article.querySelector('a[href*="/abgeordnete/biografien/"]');
    const image = article.querySelector('img[alt]');
    const url = link?.getAttribute('href') ?? '';
    const fullName = image?.getAttribute('alt')?.trim() ?? '';

    if (url && fullName) {
      profiles.set(normalizePersonName(fullName), url);
    }
  }

  return profiles;
};

export const findBundestagProfile = (profiles, firstName, lastName) => {
  const normalizedFirstName = normalizePersonName(
    firstName.split(/[\s-]+/u)[0],
  );
  const normalizedLastName = normalizePersonName(
    lastName.trim().split(/\s+/u).at(-1),
  );
  const matches = [...profiles.entries()].filter(
    ([name]) =>
      name.startsWith(normalizedFirstName) && name.endsWith(normalizedLastName),
  );
  return matches.length === 1 ? matches[0][1] : null;
};

const addressBookCell = (table, label) => {
  const row = [...table.querySelectorAll('tr')].find(
    (candidate) => text(candidate, 'th') === label,
  );
  return row ? text(row, 'td') : '';
};

export const parseAddressBookPage = (html) => {
  const document = new JSDOM(html).window.document;
  const entries = [];

  for (const table of document.querySelectorAll('table')) {
    const firstName = addressBookCell(table, 'Vorname');
    const lastName = addressBookCell(table, 'Nachname');
    const email = addressBookCell(table, 'E-Mail Adresse');

    if (firstName && lastName && email) {
      entries.push({ firstName, lastName, email });
    }
  }

  const hitsMatch = /Anzahl der Fundstellen:\s*(\d+)/u.exec(
    document.body.textContent ?? '',
  );
  return {
    entries,
    hits: hitsMatch ? Number(hitsMatch[1]) : null,
  };
};

export const findAddressBookEmail = (entries, firstName, lastName) => {
  const targetFirstName = normalizePersonName(firstName);
  const targetLastName = normalizePersonName(lastName);
  const matches = entries.filter((entry) => {
    const entryFirstName = normalizePersonName(entry.firstName);
    const entryLastName = normalizePersonName(entry.lastName);
    return (
      (entryFirstName === targetFirstName ||
        targetFirstName.startsWith(entryFirstName) ||
        entryFirstName.startsWith(targetFirstName)) &&
      (entryLastName === targetLastName ||
        targetLastName.endsWith(entryLastName))
    );
  });

  return matches.length === 1 ? matches[0].email : null;
};

const assertString = (value, path) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path} must be a non-empty string.`);
  }
};

const assertDate = (value, path) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new Error(`${path} must use YYYY-MM-DD.`);
  }
};

const assertHttpsUrl = (value, path) => {
  assertString(value, path);
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') {
    throw new Error(`${path} must use HTTPS.`);
  }
};

const assertContact = (entry, index) => {
  const prefix = `representatives[${index}]`;
  if (!ALLOWED_CONTACT_STATUSES.has(entry.emailStatus)) {
    throw new Error(`${prefix}.emailStatus is invalid.`);
  }
  if (entry.emailStatus === 'verified') {
    if (typeof entry.email !== 'string' || !EMAIL_PATTERN.test(entry.email)) {
      throw new Error(`${prefix}.email must contain a valid verified address.`);
    }
  } else if (entry.email !== null) {
    throw new Error(
      `${prefix}.email must be null when the contact is missing.`,
    );
  }
  assertHttpsUrl(entry.emailSourceUrl, `${prefix}.emailSourceUrl`);
  assertDate(entry.verifiedAt, `${prefix}.verifiedAt`);
};

const assertRepresentative = (entry, index) => {
  const prefix = `representatives[${index}]`;
  for (const field of [
    'id',
    'fullName',
    'firstName',
    'lastName',
    'state',
    'stateCode',
    'parliamentaryGroup',
  ]) {
    assertString(entry[field], `${prefix}.${field}`);
  }
  if (!Object.hasOwn(STATE_NAMES, entry.stateCode)) {
    throw new Error(`${prefix}.stateCode is invalid.`);
  }
  if (!ALLOWED_MANDATE_TYPES.has(entry.mandateType)) {
    throw new Error(`${prefix}.mandateType is invalid.`);
  }
  if (entry.constituency !== null) {
    const { number, name } = entry.constituency;
    if (!Number.isInteger(number) || number < 1 || number > 299) {
      throw new Error(`${prefix}.constituency.number is invalid.`);
    }
    assertString(name, `${prefix}.constituency.name`);
  }
  assertDate(entry.mandateStart, `${prefix}.mandateStart`);
  if (entry.mandateEnd !== null) {
    assertDate(entry.mandateEnd, `${prefix}.mandateEnd`);
  }
  assertHttpsUrl(entry.officialProfileUrl, `${prefix}.officialProfileUrl`);
  assertHttpsUrl(entry.officialContactUrl, `${prefix}.officialContactUrl`);
  assertHttpsUrl(
    entry.abgeordnetenwatchProfileUrl,
    `${prefix}.abgeordnetenwatchProfileUrl`,
  );
  assertContact(entry, index);
};

export const validateRepresentativeCatalog = (catalog) => {
  if (catalog?.schemaVersion !== 1) {
    throw new Error('schemaVersion must be 1.');
  }
  assertDate(catalog.version, 'version');
  assertDate(catalog.verifiedAt, 'verifiedAt');
  if (catalog.term?.number !== 21) {
    throw new Error('term.number must be 21.');
  }
  assertDate(catalog.term.startDate, 'term.startDate');
  assertDate(catalog.term.endDate, 'term.endDate');
  if (!Array.isArray(catalog.sources) || catalog.sources.length < 4) {
    throw new Error('sources must document every imported source.');
  }
  for (const [index, source] of catalog.sources.entries()) {
    assertString(source.id, `sources[${index}].id`);
    assertHttpsUrl(source.url, `sources[${index}].url`);
    assertString(source.attribution, `sources[${index}].attribution`);
    if (!SHA256_PATTERN.test(source.sha256)) {
      throw new Error(`sources[${index}].sha256 must be a SHA-256 digest.`);
    }
  }
  if (!Array.isArray(catalog.representatives)) {
    throw new Error('representatives must be an array.');
  }
  if (catalog.representatives.length !== catalog.sourceCounts?.activeMandates) {
    throw new Error('representative count must match the active source count.');
  }

  const ids = new Set();
  for (const [index, entry] of catalog.representatives.entries()) {
    assertRepresentative(entry, index);
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate representative id: ${entry.id}.`);
    }
    ids.add(entry.id);
  }

  const sortedNames = catalog.representatives
    .map((entry) => entry.fullName)
    .toSorted((left, right) => left.localeCompare(right, 'de'));
  const actualNames = catalog.representatives.map((entry) => entry.fullName);
  if (JSON.stringify(sortedNames) !== JSON.stringify(actualNames)) {
    throw new Error('representatives must be sorted by fullName.');
  }

  return catalog;
};
