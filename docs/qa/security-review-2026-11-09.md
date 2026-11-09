# Security and quality review — 2026-11-09

This review accompanies removal of the retired `.jules` directory and the
maintainer-prioritized remediation of CodeQL alert 96. The application and lockfile
were inspected from the staging tree containing PR 636. SonarCloud's main-branch
analysis covers commit `67c59f9fa65191958eb535ca8299fefe5f865ec8`, analyzed at
2026-11-09 12:34:05 UTC. Findings below are a snapshot, not a claim that later
analyses or GitHub alert lists are clear.

## CodeQL

The maintainer supplied [alert 96](https://github.com/WBT112/mecfs-paperwork/security/code-scanning/96),
`js/incomplete-url-substring-sanitization`, in the build-time representative
content validator. Previously, a body containing
`https://evil.invalid/?next=https://www.mecfs.de/` satisfied the required-link
check because it contained the expected address as a substring.

The validator now tokenizes the plaintext, parses candidate tokens with the URL
API, and requires a complete token whose canonical URL is exactly
`https://www.mecfs.de/`. Tests reject foreign hosts, user-info tricks, nested URLs,
query/fragment additions, prefixed schemes, and HTTP. A canonical HTTPS URL with
uppercase hostname and default port remains valid. The approved catalog is
unchanged. This checks the presence of the required official information link;
it does not introduce runtime navigation or network activity.

GitHub must analyze the fixed code on main before the main-branch alert can be
verified as closed. The existing main-branch CodeQL JavaScript/TypeScript and
Actions analysis jobs completed successfully, but job success does not establish
the absence of open alerts.

The connector does not support code-scanning/dependabot alert endpoints and the
unauthenticated API requires authentication. Therefore the complete repository
alert lists, dismissals, and Dependabot alert numbers were not independently
retrieved. Alert 96 was reviewed from the maintainer-provided details.

## Dependency audit

Commands run with Node 24 against the checked-in lockfiles:

```sh
cd app
npm audit --json
npm audit --omit=dev --json
npm explain zod --json
cd ..
npm audit --json
```

The app audit reports **17 affected packages**: 1 high, 14 moderate, and 2 low.
These include transitive effects of six distinct advisories; they are not 17
independent vulnerabilities. The production-only app audit and the root audit
both report zero findings. This establishes the audit's dependency scope, not
the absence of all possible runtime security issues.

| Package/advisory                                                                                                                                                       | Assessment and follow-up                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Zod memory exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)                                                                                             | High. Installed Zod 4.3.6 is reached through development tools, including `eslint-plugin-react-hooks` and `knip`. The advisory identifies 4.6.6 as patched. Prioritize a compatible lockfile update and validate lint/cleanup tools.                                               |
| [Vitest manual mock registration](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) and [Windows traversal bypass](https://github.com/advisories/GHSA-xp26-3454-mjgp) | Moderate. App Vitest/mocker 4.1.11 is affected; 4.1.12 is patched. The root manifest already uses the 4.1.12 line. Update the app Vitest and coverage packages together and validate the resolved mocker version. The advisories concern exposed development/mock-server behavior. |
| [minimatch amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249)                                                                                           | Moderate. Patched in 11.0.1. Current transitive instances affect ESLint tooling and the Workbox build chain. Review parent upgrades and API compatibility before replacing a major version through an override.                                                                    |
| [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)                                                                                          | Moderate. Patched in 14.0.2. Reached through the Workbox/PWA build chain. Check a compatible upstream update and revalidate service-worker generation.                                                                                                                             |
| [deepmerge prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)                                                                                     | Low. The reviewed advisory lists no patched version. Reached through Rollup resolution and Workbox build dependencies. Evaluate upstream remediation or replacement; do not assume a lockfile refresh alone fixes it.                                                              |

Some npm suggestions downgrade major tooling packages. They were not applied
automatically. This review changes neither dependency versions nor audit
configuration and does not dismiss GitHub security alerts.

## SonarCloud

The [main analysis](https://sonarcloud.io/dashboard?id=WBT112_mecfs-paperwork&branch=main)
has a passing quality gate, 100% coverage, and 0% duplication. Its issue API
reports **83 open code smells**: 78 minor and 5 major, with zero bugs,
vulnerabilities, or security hotspots.

| Rule               | Count | Review                                                                                                                                                                                                                                                  |
| ------------------ | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript:S5906` |    67 | Dedicated assertion matchers in tests. Maintenance improvements, not demonstrated product failures.                                                                                                                                                     |
| `typescript:S5976` |     4 | Parameterize repeated tests in `bundleSize.test.ts` and `decisionEngine.test.ts`. These account for four of the five major findings.                                                                                                                    |
| `typescript:S6759` |     2 | Readonly props for `CopyIconButton` and `CopyableTextField`. Small type-contract improvements.                                                                                                                                                          |
| `typescript:S9382` |     6 | Await inside loops in retry, refresh, import, and diagnostics paths. Review individually: retries require sequencing, and IndexedDB operations require transaction/order analysis. A blanket `Promise.all` rewrite is not justified by this rule alone. |
| `typescript:S9381` |     1 | Nested profile-deletion promises in `useProfileSync.ts`. Flattening may improve readability while preserving confirmation and error handling.                                                                                                           |
| `css:S1874`        |     2 | Deprecated `word-break: break-word`. Review `overflow-wrap` replacements against the existing long-text layouts.                                                                                                                                        |
| `css:S9440`        |     1 | Confirmed reduced-motion problem; prioritize as an accessibility correction.                                                                                                                                                                            |

The reduced-motion rule is declared before the later game-card and bingo-button
transition rules, so equal-specificity declarations override `transition: none`.
A browser check on `/games` with `prefers-reduced-motion: reduce` still reports
`border-color, transform, background-color` transitions lasting `0.2s` each.
Move or strengthen the reduced-motion overrides and verify both affected game
controls. This behavior was investigated but is not changed by this cleanup.

## Suggested order

1. Land the alert-96 validator correction and retired-tool removal.
2. Update compatible Zod/Vitest development dependencies; review the remaining
   glob/minimatch/Workbox and deepmerge advisories without forced downgrades.
3. Correct and regression-test the reduced-motion CSS cascade.
4. Clean up readonly props, test matchers, and promise structure in focused PRs.
5. Compare authenticated CodeQL/Dependabot exports with these results and rerun
   the relevant analyses after each remediation.
