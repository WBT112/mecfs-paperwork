# Support Bundle

The support bundle is a privacy-safe metadata export designed for troubleshooting and issue reproduction. It contains **only technical metadata** — never personal or medical data.

## How to create a support bundle

1. Navigate to the **Help** page (`/help`).
2. Scroll to the **Tools & Support** section.
3. Click **"Supportpaket herunterladen"** (or "Create support bundle" in English).
4. A JSON file (`mecfs-support-bundle.json`) will be downloaded.
5. Alternatively, click **"Supportpaket kopieren"** to copy the data to your clipboard.

## What's included (safe metadata only)

| Category           | Data                                                    |
| ------------------ | ------------------------------------------------------- |
| **App info**       | Version/commit hash, build date, environment mode       |
| **Browser**        | User agent, platform, language, timezone, online status |
| **Service Worker** | Whether SW is registered, scope, state                  |
| **Caches**         | Cache names and entry counts (no cache contents)        |
| **IndexedDB**      | Database names, object store names, record counts       |
| **Storage Health** | IDB availability, quota usage/limit, status             |
| **Formpacks**      | Formpack IDs and version hashes (no form content)       |
| **Errors**         | Last 50 app errors (message + source only, redacted)    |

## What's explicitly excluded

- Draft contents, snapshots, user-entered text
- Exports, attachments, PDFs, DOCX files
- Full localStorage or IndexedDB dumps
- Email addresses, dates of birth, names
- Any personal or medical data
- Anything that could identify a patient

## Privacy statement

The support bundle is **metadata-only**. It is generated entirely in the browser and never sent to any server. The bundle is designed with defensive redaction: a redaction helper actively strips known sensitive keys (`patient`, `diagnosis`, `medication`, `name`, `email`, etc.) and patterns (email addresses, date-like strings) before inclusion.

## How to attach to issues

1. Create the support bundle as described above.
2. Open a new issue on GitHub.
3. Attach the `mecfs-support-bundle.json` file to the issue.
4. Describe the problem you encountered.

## Storage Health

The Help page also displays a **Storage Health** section showing:

- **IndexedDB availability** — whether the browser supports local storage
- **Storage quota** — current usage vs. available space
- **Status** — OK, Warning (>85% usage), or Error (IDB unavailable/quota exceeded)

If storage is unhealthy, guidance is displayed to help the user resolve the issue (e.g., clearing old drafts, switching browser mode).

## Service Worker (PWA) Status

The Help page shows the current **Service Worker** status:

- **API** — whether the browser supports the Service Worker API
- **State** — the current worker state (activated, installed, etc.) or whether it is registered

## Reset All Local Data

The Help page includes a **Danger Zone** section that allows users to completely reset the app:

1. Navigate to the **Help** page (`/help`).
2. Scroll to the **Danger Zone** at the bottom of the Tools & Support section.
3. Click **"Alle lokalen Daten löschen"** (or "Reset all local data" in English).
4. Confirm the action in the browser dialog.

This will:

- Delete the IndexedDB database (all drafts, snapshots, and formpack metadata)
- Unregister all service workers
- Clear all caches
- Clear localStorage (theme, locale, active record preferences)
- Reload the page for a clean start

Use this when:

- Local data is corrupted and causes issues
- You want to remove all medical data from the device for privacy
- A support case requires a fresh start

## Technical details

- Bundle format: JSON (single file)
- Error buffer: In-memory ring buffer, max 50 entries, truncated to 500 chars each
- Redaction: Forbidden keys are stripped recursively; email/date patterns are detected
- No network requests: Everything is collected from browser APIs
