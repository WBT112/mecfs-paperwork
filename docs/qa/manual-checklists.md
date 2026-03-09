# Manual Checklists (Templates + Examples)

## Reusable Template

**Context**

- Change type (P0/P1/Docs):
- Target flow/module:
- Build/version:

**Steps**

1.
2.
3.

**Expected Results**

-
-

**Notes**

- Environment (browser/OS/offline state):
- Observations:

---

## Example 1: Export → Import Roundtrip (JSON)

**Context**

- Change type: P0/P1 feature or bugfix
- Target flow/module: Export/Import roundtrip
- Build/version: <commit or tag>

**Steps**

1. Create a new record using **synthetic** data only.
2. Export a JSON backup.
3. Clear local data (or use a fresh profile).
4. Import the JSON backup.
5. Re-open the imported record.

**Expected Results**

- Import completes without errors.
- Record content matches the exported data (no missing or corrupted fields).
- Locale and timestamps (if shown) are preserved as expected.

**Notes**

- Environment (browser/OS/offline state):
- Observations:

---

## Example 2: i18n Language Switch (DE/EN)

**Context**

- Change type: P0/P1 feature or bugfix
- Target flow/module: i18n switch
- Build/version: <commit or tag>

**Steps**

1. Open the app and note the current UI language.
2. Switch language to the other locale (DE ↔ EN).
3. Navigate between main views (list, editor, export).
4. Create or open a record and verify labels.
5. Reload the app (offline after first load, if possible).

**Expected Results**

- UI labels reflect the selected language across all views.
- Locale selection persists after reload.
- Record locale is stored and kept in exports.

**Notes**

- Environment (browser/OS/offline state):
- Observations:

---

## Example 3: DOCX Export

**Context**

- Change type: P0/P1 feature or bugfix
- Target flow/module: DOCX export
- Build/version: <commit or tag>

**Steps**

1. Open a formpack record with **synthetic** data (all fields filled).
2. Click the DOCX export button.
3. Open the downloaded `.docx` file in a word processor (Word, LibreOffice, Google Docs).
4. Verify all form field values appear in the correct template positions.
5. Check that multi-paragraph case text renders with proper paragraph breaks.
6. Verify formatting: bullet indentation, bold headings, page breaks.
7. Repeat with minimal data (only required fields) to verify empty-field handling.

**Expected Results**

- DOCX file downloads without errors.
- All filled fields are correctly placed in the template.
- Empty optional fields do not leave visible placeholder artifacts.
- Paragraph breaks and list formatting render correctly.
- File opens without warnings in the target word processor.

**Notes**

- Environment (browser/OS/offline state):
- Observations:

---

## Example 4: PDF Export

**Context**

- Change type: P0/P1 feature or bugfix
- Target flow/module: PDF export (doctor-letter or offlabel-antrag)
- Build/version: <commit or tag>

**Steps**

1. Open a formpack record with **synthetic** data.
2. Click the PDF export button.
3. Verify the PDF opens/downloads correctly.
4. Check page 1: all form data (patient, doctor, decision text) present and correctly formatted.
5. Check annex pages (if applicable): images render at full quality, captions and source links present.
6. Verify salutation matches the selected doctor gender (doctor-letter).
7. Switch locale (DE ↔ EN) and re-export. Verify language-specific copy changes.
8. Test with empty/minimal data to verify fallback placeholder behavior.

**Expected Results**

- PDF generates without errors or blank pages.
- Content matches the form data entered.
- Images render sharp and are properly positioned.
- Date and locale-specific formatting is correct.
- Fallback placeholders appear when data is missing.

**Notes**

- Environment (browser/OS/offline state):
- Observations:

---

## Example 5: Offline Behavior

**Context**

- Change type: P0/P1 feature or bugfix
- Target flow/module: PWA offline capability
- Build/version: <commit or tag>

**Steps**

1. Load the app online and wait for the service worker to activate (check Help page for SW status).
2. Create a record and fill in form data.
3. Disconnect from the network (airplane mode or DevTools Network offline).
4. Reload the app. Verify it loads from cache.
5. Navigate between formpack list, editor, and help page.
6. Edit form data and verify autosave works (data persists after reload).
7. Export DOCX while offline.
8. Export PDF while offline.
9. Reconnect to the network. Verify the app resumes normally.

**Expected Results**

- App loads fully from cache while offline.
- All navigation works without errors.
- Form data autosave and restore works offline.
- DOCX and PDF exports succeed offline.
- No error banners or broken UI elements while offline.

**Notes**

- Environment (browser/OS/offline state):
- Observations:
