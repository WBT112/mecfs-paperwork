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
query resolves directly to representative candidates with visible constituency
context; selecting a representative remains an explicit action.

## Letter content

`letter-variants.de.json` is the only runtime letter-content catalog. It contains
the 30 approved subjects, 30 complete German plaintext bodies, and their schema,
content-version, and approval provenance. Historical templates and personal
blocks remain available in Git history and are not shipped in the application.

Run `npm run representative-content:validate` after every content change. It
validates the active schema, approval metadata, exact counts, unique IDs and
texts, plaintext format, greetings, sign-offs, and approved information link.
It rejects unsupported catalog fields and performs no network requests. The
catalog tests additionally enforce medical and policy invariants and all 900
subject/body combinations. Both DE and EN interfaces use the same complete
German catalog until an English translation receives separate editorial approval.

### Generator behavior

The generator renders one selected pair from the bundled variant catalog. It
does not call an API, read profile data, or accept any severity, care-grade,
custom health input, or length selection. Its required input is a validated
variant pair and an optional recipient name. It personalizes only the greeting;
all other text, including the information link, comes directly from the selected
approved body. There is no legacy-template fallback.

### Approved wording variants (#558)

`letter-variants.de.json`, schema v1 and content version `2026-11-09.1`, contains
exactly 30 subjects and 30 complete German plaintext bodies. The maintainer
explicitly approved all 60 Revision 2 proposals on 2026-11-08 in the
implementation session. Its approval metadata links the source issue comment.
The maintainer subsequently requested natural German wording and varied closing
thanks on the same date. Version `2026-11-08.3` contains those editorial updates,
preserving the four substantive requests and medical information. The approval
metadata retains Revision 2 as the source and records the editorial request.
Generation changes only the neutral greeting to address a selected recipient.
Both DE and EN interfaces use these German texts; no English letter translation
is approved. A content-version mismatch triggers the existing fresh-pair policy
while preserving a valid selected recipient.

Version `2026-11-08.4` adds a distinct opening sentence to every body, stating
that the sender lives in the recipient's constituency, as requested by the
maintainer. These are bundled drafting statements, not inferred residence data:
the application collects no address and makes no assertion about citizenship,
voter eligibility, or voting history. Recipient selection remains explicit.

Version `2026-11-09.1` contains the corrections approved in #632 on 2026-11-09.
Bodies 03 and 22 consistently request a prior scientific assessment of whether
the grading process captures fluctuating and delayed ME trajectories. Body 10
clarifies continued separate billing of respite care. No other variant wording
changes. Approval metadata retains the original Revision 2 provenance and
records this subsequent editorial approval.

Selection algorithm v1 samples the subject and body independently and uniformly
with `Math.random`. A deliberate refresh uniformly samples one of the other
899 pairs by skipping the current pair in a flattened grid. It never retries or
promises uniqueness across users. Tests inject a deterministic random source and
exercise all pairs. Future catalog sizes must retain at least two combinations.

Tab-local session schema v5 stores only `recipientId` and a `variant` selection
containing catalog version, algorithm version, subject ID, and body ID. Reloads,
navigation, copying, and recipient changes retain the pair. Refresh replaces
only the pair and announces a numbered change without moving focus. Search is
never persisted. The immediately previous schema v4 retains only a valid
recipient and receives a new pair. Versions v1-v3 have no supported migration;
their keys are deleted without reading or parsing their potentially sensitive
contents. Only this minimal privacy purge remains. Obsolete catalog/algorithm
versions or unknown IDs receive a fresh pair. Invalid state roots receive a
fresh default. Reset clears supported keys and retired tool keys.

Variants are bundled static assets and selection has no network dependency.
IDs and usage statistics are never sent to URLs, logs, profiles, IndexedDB,
localStorage, or telemetry. A new tab makes its own selection; browser-provided
tab duplication can initially copy sessionStorage, but later choices remain
independent. If sessionStorage is unavailable, current mounted-page state still
works, but persistence across reloads is unavailable.

The release acceptance checklist and the procedures for legal, content,
mandate, contact, and constituency updates are documented in
[`docs/qa/representative-letter.md`](../../../../../docs/qa/representative-letter.md).
