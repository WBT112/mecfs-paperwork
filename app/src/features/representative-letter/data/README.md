# Representative contact catalog

`representatives.json` is a versioned static snapshot for the offline
representative-letter tool. The application never updates it at runtime and
does not contact any source service.

`constituency-locations.json` is a separate versioned snapshot for local place
and postcode lookup. It contains only constituency numbers/names, federal
states, municipality/locality labels, county labels, and five-digit postcodes.
It contains no addresses or user data.

## Sources and attribution

- The German Bundestag member master data XML is the primary source for the
  stable official ID and federal-state assignment:
  <https://www.bundestag.de/services/opendata>
- Official profile and contact-form links come from the Bundestag member
  directory: <https://www.bundestag.de/abgeordnete>
- Public service email addresses come from the official Bundestag address
  book: <https://www.bundestag.de/dokumente/adressbuch>
- The active mandate list and abgeordnetenwatch profile links come from the
  abgeordnetenwatch API. The API response declares its data as CC0 1.0:
  <https://www.abgeordnetenwatch.de/api/>

The Bundestag sources are public official information. Reusers remain
responsible for checking the current Bundestag reuse and attribution terms.
No email address is derived from a naming convention. An unmatched address is
stored as `null` with status `missing`, and the official contact form remains
available as an alternative.

### Constituency locations

The place/postcode snapshot combines two official sources for the 21st German
Bundestag:

- The German Bundestag constituency-search asset supplies the location and
  five-digit postcode assignments used by the official search UI:
  <https://www.bundestag.de/static/appdata/filter/wks.json>. The snapshot cites
  “Deutscher Bundestag” and links the Bundestag website terms at
  <https://www.bundestag.de/services/impressum>. The repository does not
  relicense this source material under its software license; maintainers must
  recheck the applicable reuse terms before publishing an updated snapshot.
- The Federal Returning Officer municipality assignment for the 2025 election
  is published under Datenlizenz Deutschland – Namensnennung – Version 2.0:
  <https://bundeswahlleiterin.de/dam/jcr/aa868597-0e60-476c-bd2b-279c1e9a142a/btw25_wkr_gemeinden_20241130_utf8.csv>.
  Attribution: “Die Bundeswahlleiterin, Statistische Ämter des Bundes und der
  Länder, Wiesbaden 2024”. The constituency territorial status is 2024-11-30.

The import verifies all 299 constituency numbers and names against the Federal
Returning Officer source. For constituencies where the Bundestag search groups
an entire county without municipality rows, the official municipality CSV
supplies fallback municipality labels and the published administrative
postcode. Entries marked by that source as having multiple postcodes therefore
remain intentionally conservative; the UI retains the official Bundestag
search link whenever the local mapping is missing or ambiguous.

Each checked-in source record contains its HTTPS URL, attribution, license
label and URL, and SHA-256 digest. The catalog records term 21, election date
2025-02-23, territorial status 2024-11-30, and the explicit verification date.

## Intentional update process

Use Node.js 24 and install the locked dependencies with `npm ci`. Then run:

```sh
npm run representative-data:update -- --verified-at YYYY-MM-DD
npm run representative-data:validate
npm run constituency-location-data:update -- --verified-at YYYY-MM-DD
npm run constituency-location-data:validate
```

The updater uses the repository's Playwright Chromium installation to pass the
public address book's browser challenge. If Chromium is not installed yet,
run `npx playwright install chromium` once before updating.

The date is mandatory so a maintainer explicitly records the verification
date. The updater downloads all documented sources, rejects ambiguous
cross-source name matches, retains the stable official Bundestag ID, sorts the
result, records SHA-256 source digests, and validates the complete snapshot
before writing it.

Review the diff, especially membership changes and entries with a missing
email, before committing it. The updater is not part of installation, tests,
builds, or application runtime. Validation is part of the normal repository
quality gate, but it reads only the checked-in snapshot and performs no
network request.

The constituency-location updater is likewise maintainer-triggered only. It
downloads both documented official sources, strips election results, member
profiles, and images, cross-checks the constituency list, and writes the
minimal searchable snapshot. Builds, tests, and application runtime never run
the updater. The built JSON asset is precached for complete offline use.

Location and postcode queries exist only in React component state. They are not
written to the URL, session/local storage, IndexedDB, profiles, or logs. A
selected constituency used to reveal representative candidates is also
transient; selecting a representative remains the existing explicit action.

## Letter content

`letter-content.de.json` preserves the German source text supplied in issue
#553. The maintainer approved this exact text for technical integration on
2026-10-19. The catalog deliberately retains bracketed alternatives in the
source material so the generator can resolve them without changing the
archived wording.

No English letter translation is approved yet. Both interface locales resolve
to the complete German catalog and the UI must disclose that language instead
of silently mixing translated and untranslated paragraphs. A later English
catalog requires separate editorial approval and the same structural checks.

Run `npm run representative-content:validate` after every content change. The
validator enforces the catalog version, approval metadata, the complete set of
20 source blocks, unique selection keys, required template sections, and both
long-form source links. It performs no network requests.

### Generator behavior

The generator reads only the bundled subject, template, and source references.
It is deterministic and does not call an API, read profile data, or accept any
severity, care-grade, or custom health input. The short output is a complete
letter immediately; the long output additionally includes the two cataloged
source links and the template disclosure.

The 20 personal `sourceText` blocks remain unchanged in the catalog as an
editorially approved archive. They are not displayed, selected, transformed,
or included in generated letters. Changing the archived content or adding an
English letter catalog requires explicit editorial approval and a new content
version.
