# Updates and Versions

This document describes how app/version transparency and automatic formpack refresh work.

## What users can see

- Footer: `v<app-version> • <build-date>`
  - `app-version` is the short git SHA from build time.
  - `build-date` is an ISO UTC timestamp rendered in the current locale.
- Help page:
  - app version
  - build date (ISO)
  - copy-to-clipboard button for version metadata
- Formpack detail page (bottom):
  - `Formpack: <version-or-hash> • Updated: <timestamp>`

## Automatic background checks

The app starts a background refresh job after initial render (idle-safe):

- Initial run: once after startup.
- Periodic run: every 6 hours while the app is open.
- Online retry: when the browser fires an `online` event.

Implementation notes:

- Refresh checks fetch `/formpacks/<id>/manifest.json` with `x-formpack-refresh: 1` to bypass runtime cache for the probe request.
- If a formpack changed (hash differs), related resources are fetched and local metadata is updated in IndexedDB.
- The UI shows a passive info message when formpacks were updated.

## App-shell updates (PWA)

If a new service worker is waiting:

- The app shows a passive message: a new app version is available and applies on next restart.
- No forced reload is performed.
- No manual update button is shown.

## Offline behavior

- If offline, background checks are skipped silently.
- Last known formpack metadata stays visible.
- The app retries checks later (next interval or when online again).

## Formpack versioning guidance

To make updates clearly visible and traceable:

1. Update `manifest.json` `version` whenever schema, translations, templates, or mapping change.
2. Keep version bumps monotonic and meaningful (e.g. semver).
3. If version is not changed, hash-based detection still catches content changes, but displayed version text may remain unchanged.
