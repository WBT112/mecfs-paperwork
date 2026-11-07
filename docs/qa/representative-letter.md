# Representative-letter acceptance and maintenance

This guide is the release checklist and maintenance runbook for the standalone
representative-letter tool. The tool remains offline-first: it reads bundled
catalogs, stores only its versioned selection state in the current tab's
`sessionStorage`, and never sends a message itself.

Issue #558 (editorially approved wording variants) is intentionally outside
this acceptance scope until the final text has been approved. The archived
source blocks and the generated letter text must not be rewritten as part of
technical maintenance.

## User flow

1. Open **Email representatives**. No account, profile, health detail, or
   introductory gate is required.
2. Enter one five-digit postcode or a place name. Select the correct
   constituency explicitly, especially when several matches are shown.
3. Select a representative. Expand their details to review the verification
   date and official contact/profile links.
4. Choose the short or long version. Copy recipient, subject, and mail body
   separately, or select **Open in email app** to open the locally configured
   mail application.
5. Paperwork does not send the message. If a mail body is too long for a
   reliable `mailto` URL, recipient and subject remain available and the mail
   body can be copied with the adjacent button.
6. Add a name or signature only in the mail application. **Reset** removes only
   this tool's tab-local selection.

The **Data processing notice** below the primary flow shows the bundled data
snapshot dates and source links. These snapshots are not updated at runtime and
must not be presented as automatically current.

## Automated acceptance coverage

The following checks collectively cover the release scenarios. All test data
is public catalog data or clearly synthetic UI input.

| Scenario                                                                                | Automated evidence                                                                                                         |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Direct entry without profile or health fields                                           | `tests/components/RepresentativeLetterPage.test.tsx`, `e2e/representative-letter.spec.ts`                                  |
| Postcode, place, umlaut normalization, duplicate place names, and ambiguous assignments | `tests/unit/constituencyLocationSearch.test.ts`, `tests/unit/constituencyLocationCatalog.test.ts`, component and E2E tests |
| Explicit constituency and recipient selection; stale selection clearing                 | Component and E2E tests                                                                                                    |
| Verified, missing, and oversized `mailto` paths                                         | Component tests and `tests/unit/representativeLetterMailto.test.ts`                                                        |
| Three copy fields and manual clipboard fallback                                         | Component tests and `tests/unit/representativeLetterClipboard.test.ts`                                                     |
| Tab isolation, reload, back navigation, and reset                                       | Session-state unit tests, component tests, and E2E tests                                                                   |
| Information placement, 320 px layout, keyboard, focus, and labels                       | Component tests, representative-letter E2E, global accessibility E2E                                                       |
| Offline generation and absence of external requests                                     | Representative-letter E2E and PWA configuration tests                                                                      |
| No query in URL, console, request URLs, `localStorage`, or `sessionStorage`             | Representative-letter component and E2E tests                                                                              |
| German and English UI resources                                                         | i18n validation and representative-letter tests                                                                            |
| Existing DOCX, PDF, and JSON flows                                                      | Existing export unit/component/E2E suites; the representative tool exposes no export action                                |

Before release, run the repository gates with Node.js 24 and a reproducible
install:

```sh
cd app
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run duplication:check
npm test
npm run test:coverage:changed
npm run formpack:validate
npm run build
npm run test:e2e
```

Run E2E only after the faster checks pass. Record the commit, browser/OS, and
any allowed Firefox or WebKit warning in the PR description.

## Manual release review

Use a fresh browser context and synthetic input only.

- At 320 px width, complete the postcode/place, constituency, recipient,
  short/long, copy, and `mailto` flow with touch, keyboard, and a screen reader.
- Verify the visible recipient address, subject, and body exactly match the
  values passed to the mail application. Confirm that no message is sent
  without a separate user action in that application.
- Deny clipboard access and confirm that the complete field becomes selected
  for manual copying.
- Select a representative without a verified email address and confirm there
  is no active send link while official profile/contact links remain usable.
- Prepare the PWA cache while online, switch the browser offline, reload the
  tool, and complete place/postcode search through text generation. Confirm
  DevTools shows no request to an external origin.
- Inspect URL, console, Network, Application Storage, IndexedDB, and generated
  test artifacts. They must not contain the entered place/postcode or private
  user information. Only the documented body-length and recipient ID may exist
  in the tool's tab-local state.
- Repeat the UI flow in German and English. The generated letter remains German
  until a separately approved English catalog exists, and the UI must disclose
  that fact.
- Smoke-test the existing formpack DOCX, PDF, and JSON paths to ensure this
  standalone tool has not changed them.

## Snapshot and contact maintenance

Run updates only as an intentional maintainer operation. The application must
never call these sources at runtime.

```sh
cd app
npm ci
npm run representative-data:update -- --verified-at YYYY-MM-DD
npm run constituency-location-data:update -- --verified-at YYYY-MM-DD
npm run representative-data:validate
npm run constituency-location-data:validate
npm run representative-content:validate
```

Review source URLs, attribution, license labels, source digests, snapshot dates,
and every diff before committing. The authoritative source and license details
are kept in `app/src/features/representative-letter/data/README.md` and in each
checked-in catalog.

For new mandates, departed members, parliamentary-group changes, or changed
public contacts:

1. Refresh the representative catalog from the documented official sources.
2. Resolve every ambiguous cross-source match manually. Never infer an email
   address from a naming pattern.
3. Keep an unavailable or unverified email as `null` with status `missing` and
   preserve the official contact link.
4. Confirm the product displays the new verification date, then rerun the full
   acceptance checklist.

For constituency, municipality, or postcode changes:

1. Confirm the applicable election term and territorial status in the official
   Bundestag and Federal Returning Officer sources.
2. Recheck reuse terms and attribution before publishing an updated snapshot.
3. Refresh the location catalog, review ambiguous/missing mappings, and verify
   all constituency numbers and names.
4. Test full postcodes, place names with umlauts, duplicate place names, and
   postcodes that cross constituency boundaries.

## Letter and legal maintenance

Legal or policy changes require editorial review before a release. A maintainer
must verify every claim and primary source in the subject, short version, long
version, and source references. Technical contributors must not silently
reinterpret, shorten, translate, or expand those claims.

After approval:

1. Update `letter-content.de.json` without unrelated wording changes.
2. Increment `contentVersion`, record the approval date and source issue, and
   remove all unresolved placeholders from generated output.
3. Run `npm run representative-content:validate` and the complete acceptance
   suite.
4. Confirm the data snapshot and content approval dates remain visible and do
   not imply automatic freshness.

An English letter requires its own editorial approval. Wording variants under
issue #558 likewise require a finalized base text and explicit approval of every
alternative before implementation.
