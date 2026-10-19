# Representative contact catalog

`representatives.json` is a versioned static snapshot for the offline
representative-letter tool. The application never updates it at runtime and
does not contact any source service.

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

## Intentional update process

Use Node.js 24 and install the locked dependencies with `npm ci`. Then run:

```sh
npm run representative-data:update -- --verified-at YYYY-MM-DD
npm run representative-data:validate
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

The generator reads only the bundled catalog and tab-local selections. It is
deterministic and does not call an API, infer a severity or care grade, or read
profile data. Short output excludes all selected and custom personal
paragraphs until the user enables the short-form opt-in. Long output includes
selected personal paragraphs and the two cataloged source links.

The archived `sourceText` remains unchanged. Before display, the generator
resolves the bracketed drafting alternatives conservatively so no open
placeholder reaches the mail text:

- personal relationship alternatives become the neutral term “Pflegeperson”;
- the unknown number of care years is omitted;
- the mild-severity work/day-to-day alternative is omitted with its clause;
- the care-grade-1 household-help/appointment-companion sentence is omitted;
- the single “nicht selbstständig essen” option is retained without brackets.

These transformations introduce no new personal circumstances. Changing them
or adding an English letter catalog requires explicit editorial approval and a
new content version.
