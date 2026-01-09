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
