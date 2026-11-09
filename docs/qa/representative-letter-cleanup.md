# Representative-letter cleanup audit (#621)

The audit covers the representative-letter production path, content validation,
session compatibility, tests, styles, translations, and maintenance guidance.
It follows the completed variant rollout in #558 and the editorial updates
through content version `2026-11-08.4`.

## Inventory and decisions

| Candidate                                     | Evidence and disposition                                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Old base catalog and 20 personal blocks       | The page still resolved the old catalog solely for a generator fallback; the active UI always supplied a variant. Removed the JSON, content resolver, archived block types, and fallback. Git history retains their provenance.                                                                                      |
| Old source references and template disclosure | Used only by the removed fallback catalog, its validator, and historical tests. Removed from runtime rather than retaining an unused archive. The information link and approval provenance remain in the active catalog.                                                                                             |
| Content validator                             | Previously validated 20 archived blocks and an unused standard template. Replaced with validation of the current 30 subjects, 30 bodies, schema, editorial provenance, unique IDs/texts, and plaintext output. Added direct validation and CLI tests with an adjacent TypeScript declaration for the JavaScript API. |
| Session schemas                               | Preserve current v5 and the immediately previous v4 recipient migration. Remove v1-v3 parsing, recipient migration, and health-field fixtures. Retain only a small deletion-only purge because retired values may contain sensitive free text; it never reads or parses them.                                        |
| Exports and locale plumbing                   | Make the selection algorithm constant and generated return type private. Remove the redundant locale resolver; interface translations still use the existing i18n hook and both interfaces render the approved German catalog.                                                                                       |
| Tests                                         | Remove assertions about archived blocks, obsolete labels, old information/length modes, and old filters. Assert the current three read-only fields and single search field, current variant rendering, v4/v5 state, retired-value deletion, copying, mailto, and tab isolation.                                      |
| i18n and CSS                                  | All representative-letter translation keys have production consumers. All 269 CSS classes remain used and the CSS report rejects no selector. No stylesheet, translation, ignore list, or analysis configuration was changed.                                                                                        |

## Before/after evidence

`rg`, ESLint, TypeScript, and `npm run cleanup:report` were run before editing.
The same cleanup reports were rerun after implementation. Reports are generated
under `app/reports/`; the comparison was recorded on 2026-11-08 under Linux with
Node 24. The baseline reports were retained outside the repository during work.

| Measurement                                           |           Before |               After |
| ----------------------------------------------------- | ---------------: | ------------------: |
| Archived personal text blocks in runtime source       |               20 |                   0 |
| Old base catalog in source                            |     13,967 bytes |             Removed |
| Representative-letter route JavaScript                |     83,016 bytes |        70,175 bytes |
| Representative-letter unused exports reported by Knip |                1 |                   0 |
| Global actionable Knip items                          | 7 across 2 files | 6 in `package.json` |
| Global informational Knip items                       |               72 |                  70 |
| Unused CSS selectors                                  |                0 |                   0 |
| Duplicate clones                                      |                0 |                   0 |

The route chunk decreases by 12,841 bytes (about 15.5%). Production JavaScript
was checked against all 20 archived `sourceText` values read directly from Git
history; none remain. The current `letter-variants.de.json` is byte-identical
before and after cleanup, with SHA-256:

```text
998653721a0586d9ccb3d1f06130c527ba62c2632f97de79b58a830284c6bf64
```

## Remaining report findings

No Knip finding remains in the representative-letter production code. Global
dependency findings for `buffer`, `events`, `util`, `@emnapi/core`,
`@emnapi/runtime`, and `jscpd` remain unchanged and concern shared application
dependencies or tooling. The unrelated pacing-card asset script also retains
its pre-existing unlisted `pngjs` finding. Informational type findings are
outside this feature. These require separate repository-wide investigation;
this cleanup introduces no ignore entries and changes no dependencies.

The active acceptance and maintenance procedure remains in
[representative-letter.md](representative-letter.md).
