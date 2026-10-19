/* global console, document, process */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import JSZip from 'jszip';
import {
  REPRESENTATIVE_DATA_PATH,
  REPRESENTATIVE_SOURCES,
  STATE_NAMES,
  findAddressBookEmail,
  findBundestagProfile,
  normalizePersonName,
  parseAddressBookPage,
  parseBundestagProfiles,
  parseBundestagXml,
  sha256,
  validateRepresentativeCatalog,
} from './representative-data.mjs';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

const ADDRESS_BOOK_RESULTS_URL =
  'https://www.bundestag.de/apps/adressbuch/results.form';
const ADDRESS_BOOK_PAGE_SIZE = 5;
const CONCURRENCY = 12;

const parseArguments = () => {
  const valueIndex = process.argv.indexOf('--verified-at');
  const verifiedAt = valueIndex === -1 ? '' : process.argv[valueIndex + 1];
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(verifiedAt ?? '')) {
    throw new Error(
      'Pass the intentional snapshot date as --verified-at YYYY-MM-DD.',
    );
  }
  return { verifiedAt };
};

const fetchJson = async (url) => {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(url, {
      headers: { 'user-agent': 'mecfs-paperwork representative data updater' },
    });
    if (response.status === 429 && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      continue;
    }
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}): ${url}`);
    }
    const raw = await response.text();
    const payload = JSON.parse(raw);
    if (payload?.meta?.status !== 'ok') {
      throw new Error(`API returned an error for ${url}.`);
    }
    return { payload, raw };
  }
  throw new Error(`Request retries exhausted for ${url}.`);
};

const mapConcurrent = async (values, mapper, concurrency = CONCURRENCY) => {
  const results = new Array(values.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index], index);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
  return results;
};

const readBundestagMasterData = async (request) => {
  const archive = await request(REPRESENTATIVE_SOURCES.bundestagMasterData);
  const zip = await JSZip.loadAsync(archive);
  const xmlEntry = zip.file('MDB_STAMMDATEN.XML');
  if (!xmlEntry) {
    throw new Error('Bundestag archive does not contain MDB_STAMMDATEN.XML.');
  }
  const xml = await xmlEntry.async('string');
  return { members: parseBundestagXml(xml), digest: sha256(archive) };
};

const readActiveMandates = async () => {
  const { payload, raw } = await fetchJson(
    REPRESENTATIVE_SOURCES.abgeordnetenwatchMandates,
  );
  if (payload.data.length !== payload.meta.result.total) {
    throw new Error('Abgeordnetenwatch mandate response is incomplete.');
  }
  return {
    mandates: payload.data,
    raw,
    digest: sha256(raw),
  };
};

const fetchPoliticianDetails = async (mandates) => {
  const responses = await mapConcurrent(
    mandates,
    async (mandate, index) => {
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return fetchJson(mandate.politician.api_url);
    },
    1,
  );
  return new Map(
    responses.map(({ payload }) => [payload.data.id, payload.data]),
  );
};

const readBundestagProfiles = async (request) => {
  const html = await request(REPRESENTATIVE_SOURCES.bundestagMembers);
  return { profiles: parseBundestagProfiles(html), digest: sha256(html) };
};

const addressBookUrl = (startAt) => {
  const url = new URL(ADDRESS_BOOK_RESULTS_URL);
  url.searchParams.set('surname', '');
  url.searchParams.set('firstname', '');
  url.searchParams.set('email', '*@bundestag.de');
  url.searchParams.set('fraction', '');
  url.searchParams.set('associatedTo', 'MdB');
  url.searchParams.set('startAt', String(startAt));
  url.searchParams.set('sort', 'surname');
  return url;
};

const readAddressBook = async (context, page) => {
  await page.goto(addressBookUrl(1).toString(), {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await page.waitForFunction(
    () => document.body.textContent?.includes('Anzahl der Fundstellen:'),
    undefined,
    { timeout: 60_000 },
  );
  const firstPage = await page.content();
  const parsedFirstPage = parseAddressBookPage(firstPage);
  if (!parsedFirstPage.hits) {
    throw new Error('Bundestag address book returned no result count.');
  }
  const offsets = [];
  for (
    let offset = ADDRESS_BOOK_PAGE_SIZE + 1;
    offset <= parsedFirstPage.hits;
    offset += ADDRESS_BOOK_PAGE_SIZE
  ) {
    offsets.push(offset);
  }
  const remainingPages = await mapConcurrent(offsets, async (offset) => {
    const response = await context.request.get(
      addressBookUrl(offset).toString(),
    );
    if (!response.ok()) {
      throw new Error(
        `Bundestag address-book page ${offset} failed (${response.status()}).`,
      );
    }
    return response.text();
  });
  const pages = [firstPage, ...remainingPages];
  const entries = pages.flatMap(
    (source) => parseAddressBookPage(source).entries,
  );
  if (entries.length !== parsedFirstPage.hits) {
    throw new Error(
      `Bundestag address book returned ${entries.length} of ${parsedFirstPage.hits} entries.`,
    );
  }
  return { entries, digest: sha256(pages.join('\n')), hits: entries.length };
};

const readBundestagSources = async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const addressBook = await readAddressBook(context, page);
    const requestText = async (url) => {
      const response = await context.request.get(url);
      if (!response.ok()) {
        throw new Error(
          `Bundestag request failed (${response.status()}): ${url}`,
        );
      }
      return response.text();
    };
    const requestBytes = async (url) => {
      const response = await context.request.get(url);
      if (!response.ok()) {
        throw new Error(
          `Bundestag request failed (${response.status()}): ${url}`,
        );
      }
      return Buffer.from(await response.body());
    };
    const [masterData, profiles] = await Promise.all([
      readBundestagMasterData(requestBytes),
      readBundestagProfiles(requestText),
    ]);
    return { addressBook, masterData, profiles };
  } finally {
    await browser.close();
  }
};

const parseConstituency = (mandate, fallbackPeriod) => {
  const label = mandate.electoral_data?.constituency?.label ?? '';
  const match = /^(\d+)\s+-\s+(.+?)\s+\(Bundestag/u.exec(label);
  if (match) {
    return { number: Number(match[1]), name: match[2] };
  }
  if (fallbackPeriod.number && fallbackPeriod.name) {
    return { number: fallbackPeriod.number, name: fallbackPeriod.name };
  }
  return null;
};

const stateCodeForConstituency = (number) => {
  const ranges = [
    [1, 11, 'SH'],
    [12, 17, 'MV'],
    [18, 23, 'HH'],
    [24, 53, 'NI'],
    [54, 55, 'HB'],
    [56, 65, 'BB'],
    [66, 73, 'ST'],
    [74, 85, 'BE'],
    [86, 149, 'NW'],
    [150, 165, 'SN'],
    [166, 187, 'HE'],
    [188, 195, 'TH'],
    [196, 210, 'RP'],
    [211, 257, 'BY'],
    [258, 295, 'BW'],
    [296, 299, 'SL'],
  ];
  return ranges.find(([start, end]) => number >= start && number <= end)?.[2];
};

const stateCodeForMandate = (mandate) => {
  const listLabel = mandate.electoral_data?.electoral_list?.label ?? '';
  const stateName = /^Landesliste (.+?) \(Bundestag/u.exec(listLabel)?.[1];
  const byStateName = Object.entries(STATE_NAMES).find(
    ([, name]) => name === stateName,
  )?.[0];
  if (byStateName) return byStateName;

  const constituencyLabel = mandate.electoral_data?.constituency?.label ?? '';
  const number = Number(/^(\d+)/u.exec(constituencyLabel)?.[1]);
  return Number.isInteger(number) ? stateCodeForConstituency(number) : null;
};

const syntheticMember = (mandate, politician, officialProfileUrl) => {
  const constituency = parseConstituency(mandate, {});
  return {
    id:
      politician.ext_id_bundestagsverwaltung ??
      `bundestag-profile-${profileCmsId(officialProfileUrl)}`,
    firstName: politician.first_name,
    lastName: politician.last_name,
    academicTitle: politician.field_title,
    currentPeriod: null,
    latestPeriod: {
      number: constituency?.number ?? null,
      name: constituency?.name ?? null,
      stateCode: stateCodeForMandate(mandate),
      mandateType: 'successor',
      mandateStart: mandate.start_date ?? '2025-03-25',
      mandateEnd: mandate.end_date,
    },
  };
};

const memberMatchesPolitician = (member, politician) =>
  normalizePersonName(member.firstName.split(/[\s-]+/u)[0]) ===
    normalizePersonName(politician.first_name.split(/[\s-]+/u)[0]) &&
  normalizePersonName(member.lastName.trim().split(/\s+/u).at(-1)) ===
    normalizePersonName(politician.last_name.trim().split(/\s+/u).at(-1));

const getMandateType = (mandate, xmlMember) => {
  const won = mandate.electoral_data?.mandate_won;
  if (won === 'moved_up') return 'successor';
  if (won === 'constituency') return 'direct';
  if (won === 'list') return 'state-list';
  if (xmlMember.currentPeriod) return xmlMember.currentPeriod.mandateType;
  throw new Error(`Unknown mandate type for ${mandate.politician.label}.`);
};

const activeParliamentaryGroup = (mandate) => {
  const membership = mandate.fraction_membership.find(
    (candidate) => candidate.valid_until === null,
  );
  const label = membership?.fraction?.label ?? membership?.label ?? '';
  return label.replace(/\s+\(Bundestag.*$/u, '').trim();
};

const profileCmsId = (profileUrl) => {
  const match = /-(\d+)$/u.exec(profileUrl);
  if (!match) {
    throw new Error(`Official profile has no CMS id: ${profileUrl}`);
  }
  return match[1];
};

const createRepresentative = ({
  mandate,
  xmlMember,
  profiles,
  addressBook,
  verifiedAt,
}) => {
  const fallbackPeriod = xmlMember.currentPeriod ?? xmlMember.latestPeriod;
  const stateCode = fallbackPeriod.stateCode;
  const fullName = [xmlMember.academicTitle, mandate.politician.label]
    .filter(Boolean)
    .join(' ');
  const profileUrl = findBundestagProfile(
    profiles,
    xmlMember.firstName,
    xmlMember.lastName,
  );
  if (!profileUrl) {
    throw new Error(`No official profile matched ${fullName}.`);
  }
  if (!stateCode || !STATE_NAMES[stateCode]) {
    throw new Error(`No federal state matched ${fullName}.`);
  }
  const email = findAddressBookEmail(
    addressBook,
    xmlMember.firstName,
    xmlMember.lastName,
  );

  return {
    id: xmlMember.id,
    fullName,
    firstName: xmlMember.firstName,
    lastName: xmlMember.lastName,
    state: STATE_NAMES[stateCode],
    stateCode,
    constituency: parseConstituency(mandate, fallbackPeriod),
    mandateType: getMandateType(mandate, xmlMember),
    mandateStart: mandate.start_date ?? fallbackPeriod.mandateStart,
    mandateEnd: mandate.end_date,
    parliamentaryGroup: activeParliamentaryGroup(mandate),
    email,
    emailStatus: email ? 'verified' : 'missing',
    emailSourceUrl: REPRESENTATIVE_SOURCES.bundestagAddressBook,
    officialProfileUrl: profileUrl,
    officialContactUrl: `https://www.bundestag.de/services/formular/contactform?mdbId=${profileCmsId(profileUrl)}`,
    abgeordnetenwatchProfileUrl: mandate.politician.abgeordnetenwatch_url,
    verifiedAt,
  };
};

const main = async () => {
  const { verifiedAt } = parseArguments();
  console.log('Fetching representative source data...');
  const [bundestagData, activeData] = await Promise.all([
    readBundestagSources(),
    readActiveMandates(),
  ]);
  const {
    masterData,
    profiles: profileData,
    addressBook: addressBookData,
  } = bundestagData;

  const membersByName = new Map();
  for (const member of masterData.members.values()) {
    const key = normalizePersonName(`${member.firstName} ${member.lastName}`);
    const matchingMembers = membersByName.get(key) ?? [];
    matchingMembers.push(member);
    membersByName.set(key, matchingMembers);
  }
  const initiallyUnmatched = activeData.mandates.filter(
    (mandate) =>
      (membersByName.get(normalizePersonName(mandate.politician.label)) ?? [])
        .length !== 1,
  );
  const politicianDetails = await fetchPoliticianDetails(initiallyUnmatched);
  activeData.digest = sha256(
    `${activeData.raw}\n${JSON.stringify(
      [...politicianDetails.values()].toSorted(
        (left, right) => left.id - right.id,
      ),
    )}`,
  );
  const representatives = activeData.mandates.map((mandate) => {
    const matchingMembers =
      membersByName.get(normalizePersonName(mandate.politician.label)) ?? [];
    let xmlMember = matchingMembers.length === 1 ? matchingMembers[0] : null;
    if (!xmlMember) {
      const politician = politicianDetails.get(mandate.politician.id);
      const officialProfileUrl = findBundestagProfile(
        profileData.profiles,
        politician?.first_name ?? '',
        politician?.last_name ?? '',
      );
      if (politician) {
        const linkedMember = masterData.members.get(
          politician.ext_id_bundestagsverwaltung,
        );
        xmlMember =
          linkedMember && memberMatchesPolitician(linkedMember, politician)
            ? linkedMember
            : syntheticMember(mandate, politician, officialProfileUrl);
      }
    }
    if (!xmlMember?.id) {
      throw new Error(
        `Official Bundestag id missing for ${mandate.politician.label}.`,
      );
    }
    return createRepresentative({
      mandate,
      xmlMember,
      profiles: profileData.profiles,
      addressBook: addressBookData.entries,
      verifiedAt,
    });
  });
  representatives.sort((left, right) =>
    left.fullName.localeCompare(right.fullName, 'de'),
  );

  const catalog = {
    schemaVersion: 1,
    version: verifiedAt,
    verifiedAt,
    term: {
      number: 21,
      startDate: '2025-03-25',
      endDate: '2029-02-22',
    },
    sourceCounts: {
      activeMandates: activeData.mandates.length,
      addressBookEntries: addressBookData.hits,
      officialProfiles: profileData.profiles.size,
    },
    sources: [
      {
        id: 'bundestag-master-data',
        url: REPRESENTATIVE_SOURCES.bundestagMasterData,
        attribution: 'Deutscher Bundestag, MdB master data XML',
        sha256: masterData.digest,
      },
      {
        id: 'bundestag-member-profiles',
        url: REPRESENTATIVE_SOURCES.bundestagMembers,
        attribution: 'Deutscher Bundestag, member biographies',
        sha256: profileData.digest,
      },
      {
        id: 'bundestag-address-book',
        url: REPRESENTATIVE_SOURCES.bundestagAddressBook,
        attribution: 'Deutscher Bundestag, public email address book',
        sha256: addressBookData.digest,
      },
      {
        id: 'abgeordnetenwatch-active-mandates',
        url: REPRESENTATIVE_SOURCES.abgeordnetenwatchMandates,
        attribution: 'abgeordnetenwatch.de API, CC0 1.0',
        sha256: activeData.digest,
      },
    ],
    representatives,
  };

  validateRepresentativeCatalog(catalog);
  await fs.writeFile(
    REPRESENTATIVE_DATA_PATH,
    `${JSON.stringify(catalog, null, 2)}\n`,
    'utf8',
  );
  const verifiedEmailCount = representatives.filter(
    (entry) => entry.emailStatus === 'verified',
  ).length;
  console.log(
    `Wrote ${representatives.length} representatives (${verifiedEmailCount} verified emails).`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
