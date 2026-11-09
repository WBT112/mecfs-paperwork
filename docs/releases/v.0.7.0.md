# v.0.7.0 — E-Mail an Abgeordnete

Date: 2026-11-09

This release completes the representative-letter epic [#550](https://github.com/WBT112/mecfs-paperwork/issues/550) and includes the changes since v.0.6.0.

## Highlights

- Prepare an email to a Bundestag representative through the standalone **E-Mail an Abgeordnete** tool. Search by postcode or place, select a recipient directly, and open the prepared message in your own email application or copy the plaintext fields.
- Use 30 approved German subjects and 30 approved letter bodies, with independent tab-local selection, constituency references, and varied closing thanks. The interface supports German and English; the approved letter content remains German.
- Use the tool offline, including postcode/place search and reloading. No account, sender address, health details, profile access, telemetry, or automatic message sending is required.

## Added and changed

- The support-offer overview has searchable, structured navigation and a compact mobile header.
- Representative contacts were checked on 2026-11-09: 630 active mandates, 623 verified public email addresses, and official contact-form alternatives for seven entries without a verified address.
- Pacing signal cards provide a revised editor, variant selection, and printable PDF cards, including child-mode content.
- Emergency-pass A4 and wallet exports and the doctor-letter workflow received layout and content improvements.
- The games hub includes ME Bingo and Spoon Manager.

## Fixes

- Selecting a representative brings the next email action into view. Mobile copy controls show a readable text label.
- Unavailable browser storage no longer interrupts the representative-letter workflow. Postcode context, ambiguous results, umlaut searches, and missing-email contact alternatives are handled consistently.
- Background formpack refresh now fingerprints the same normalized manifest as the active page. Unchanged assets no longer trigger false updates that interrupt imports, draft actions, or open tool sections.
- Full local-data reset now waits for confirmed database deletion before removing encryption keys and browser state. Open app tabs close invalidated connections and must reload before writing again. A blocked deletion preserves the key until the blocking tab closes ([#641](https://github.com/WBT112/mecfs-paperwork/issues/641)).
- Single-line form controls have a consistent minimum touch height, including native date inputs in mobile Safari.
- E2E reports are retained for Firefox and WebKit even when their test failures are allowed by the workflow.
- The letter-content validator compares the complete approved information URL, with regression tests for the URL-substring issue reported by CodeQL alert 96.
- Retired Jules configuration and obsolete representative-letter code and content were removed.

## Upgrade notes

No manual migration is required. Existing formpack drafts, snapshots, and saved profiles retain their storage schema. The representative-letter tool may reset its versioned tab-local selection after an update; it never imports patient profile data.

After explicitly resetting all local data, reload other open app tabs before continuing. If deletion is waiting on an older tab, close that tab to let the reset finish.

The app's visible build identifier remains the Git commit SHA. The package version and this release are 0.7.0.

## Known issues and follow-ups

- The [security review](https://github.com/WBT112/mecfs-paperwork/blob/main/docs/qa/security-review-2026-11-09.md) records outstanding development-dependency advisories, Sonar maintenance findings, and a reduced-motion CSS issue. This release does not claim that every security alert has been resolved.
- Search and contact information are static snapshots and need intentional maintainer updates. Available official data can lag behind real-world changes.

## Verification

The final application change passed all static quality gates, formpack/content/data validation, build, and 1,880 unit/component tests under Node.js 24. Both changed source files have 100% coverage for statements, branches, functions, and lines; duplication is zero.

Local browser verification passed 112 Chromium desktop/mobile tests and 179 Firefox/WebKit desktop/mobile tests without failures or retries. Twenty-seven browser-specific tests are intentionally skipped. This includes a multi-tab reset with a deliberately blocked database connection. GitHub Release publication runs only after the main commit passes QA Gates.

## Links

- [Epic #550](https://github.com/WBT112/mecfs-paperwork/issues/550)
- [Representative-letter QA and maintenance guide](https://github.com/WBT112/mecfs-paperwork/blob/main/docs/qa/representative-letter.md)
- [Latest fixes #635](https://github.com/WBT112/mecfs-paperwork/pull/635), [#639](https://github.com/WBT112/mecfs-paperwork/pull/639), [#642](https://github.com/WBT112/mecfs-paperwork/pull/642), [data reset #641](https://github.com/WBT112/mecfs-paperwork/issues/641)
- [Full changelog](https://github.com/WBT112/mecfs-paperwork/compare/v.0.6.0...v.0.7.0)
