# Representative-letter acceptance and maintenance

This guide is the release checklist and maintenance runbook for the standalone
representative-letter tool. The tool remains offline-first: it reads bundled
catalogs, stores only its versioned selection state in the current tab's
`sessionStorage`, and never sends a message itself.

Issue #558 adds 30 independently combinable subjects and 30 complete plaintext
bodies, explicitly approved as Revision 2 on 2026-11-08. Approved variant texts
must not be rewritten during technical maintenance. The active variant catalog
is the only runtime letter-content model; historical templates and blocks are
preserved in Git history.

Content version `2026-11-08.3` includes the maintainer-requested editorial review
for natural German and varied closing thanks. The substantive requests and
medical information remain intact. Verify a thanks paragraph directly precedes
the sign-off in every body and remains present in the visible field, clipboard,
and mailto output. Both interface locales use the same German letter catalog.

Version `2026-11-08.4` additionally opens each body with one of 30 distinct
sentences stating that the sender lives in the recipient's constituency. Check
that it appears after the greeting in the generated plaintext and survives
copying and mailto generation. No address is collected or inferred, and the
wording makes no claim about voting eligibility or previous votes.

## User flow

1. Open **Email representatives**. No account, profile, health detail, or
   introductory gate is required.
2. Enter one five-digit postcode or a place name. The matching representatives
   are shown directly with place, federal-state, and constituency context.
3. Select the correct representative. The next available mail action receives
   focus and is brought into view immediately, including after changing the
   recipient. Without a verified email, focus goes to the mail-body copy action.
   The official contact link is also available directly beside the copy action.
   Expand recipient details to review verification and official contact links.
4. Copy recipient, subject, and the single complete mail body separately, or
   select **Open in email app** to open the locally configured mail application.
5. Paperwork does not send the message. If a mail body is too long for a
   reliable `mailto` URL, recipient and subject remain available and the mail
   body can be copied with the adjacent button.
6. Add a name or signature only in the mail application. **Reset** removes only
   this tool's tab-local selection and returns focus and the viewport to search.
   **Change recipient** also returns to search without replacing the variant.

Search accepts umlauts, their `ae`/`oe`/`ue` transliterations, and plain vowels
(for example, `Köln`, `Koeln`, and `Koln`). Exact and prefix spellings take
priority over simplified matches. Postcode results display the searched postcode
instead of an arbitrary subset of the municipality's postcodes. With blocked
session storage the workflow remains usable in memory without fallback storage;
selections do not survive a reload in that case.

Optionally use **New email variant** below the body. It refreshes the pair while
preserving recipient and search. Verify keyboard focus stays on the button,
the live status announces each change, and the fields, clipboard, and mailto
agree. Check reload and back/forward stability and two independent tabs. On a
320-pixel viewport the button must work without horizontal scrolling. Refresh
must also work offline without making requests or revealing IDs in logs or URLs.

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
| Direct recipient selection with constituency context; stale selection clearing          | Representative-search unit tests, component tests, and E2E tests                                                           |
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

`e2e/representative-letter-scroll.spec.ts` checks the action after selecting from
a long results list and again after a postcode search. It covers desktop keyboard
input and narrow/landscape touch viewports, including full visibility, focus,
hit testing, and the next Tab stop. Reloading a saved selection and refreshing a
variant must not pull focus or scroll back to the primary action. Native mobile
keyboard and browser-toolbar behavior still require a real-device check.

## Manual release review

Use a fresh browser context and synthetic input only.

- At 320 px width, complete the postcode/place, direct recipient, copy, and
  `mailto` flow with touch, keyboard, and a screen reader. Confirm that the
  matching representative can be selected directly from the search results.
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
  user information. Only the documented recipient ID, variant IDs, and schema,
  catalog, and algorithm versions may exist in the tool's tab-local state.
- Repeat the UI flow in German and English. The generated letter remains German
  until a separately approved English catalog exists.
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
must verify every claim and primary source in the subject, single mail body,
and linked information. Technical contributors must not silently
reinterpret, shorten, translate, or expand those claims.

After approval:

1. Update `letter-variants.de.json` only after approval of each changed subject
   and complete body. Preserve the source issue, revision, approval date, and
   editorial notes; the Git history is the archive for previous content.
2. Increment `contentVersion`, record the approval date and source issue, and
   remove all unresolved placeholders from generated output.
3. Run `npm run representative-content:validate` and the complete acceptance
   suite.
4. Confirm the data snapshot and content approval dates remain visible and do
   not imply automatic freshness.

An English letter requires its own editorial approval. Future wording variants
likewise require explicit approval of every alternative before implementation.
Catalog, algorithm, and session-state versions and their migration policy are
documented in the data directory README.
