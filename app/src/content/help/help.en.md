# Help

This application helps you to **create forms and documents in a structured way** – step by step.
At the end, you can export a **DOCX document** (for further editing) or a **PDF file** (for direct sharing/printing).

> Privacy Note: Please do **not enter sensitive health data** in public areas (e.g., GitHub issues, support emails, screenshots). Handle exports carefully.

---

## 1) Basic Principle: Formpacks, Drafts, and Result

- **Formpack**: A subject area / template (e.g., "Doctor's Letter").
- **Draft**: Your current work on a case – you can continue editing at any time.
- **Result**: The generated text arising from your answers (which ends up in the DOCX/PDF).

Typical Workflow:

1. Select a Formpack
2. Answer questions
3. Use **Tools** if necessary (Drafts/Snapshots/JSON Export/Import)
4. Check the result
5. **Export DOCX or PDF**
6. Open the file, complement if necessary, save/share

---

## 2) Tools: What are they for?

### Drafts

A draft is your current processing status.

- Use drafts if you want to work on the same document over several days.
- Save regularly, especially before making major changes.
- A draft can contain several snapshots.
- The active draft is automatically saved and cannot be deleted.
- You can delete inactive drafts. Associated snapshots will also be removed.
- Deletions only occur locally on this device/browser and cannot be undone.

### Snapshots

Snapshots are **intermediate states** (like "backups") that you can restore later.

- Create a snapshot **before** risky changes (e.g., when you change many fields at once).
- All snapshots of a draft can be completely deleted if necessary.

### Export JSON (Backup/Share)

With JSON export, you save your entries as a file.

- Ideal as a **backup** (e.g., before you change devices/browsers).
- Useful if you want to import a case again later.

### Import JSON (Restore/Transfer)

With import, you load a previously exported JSON file back into the app.

- Good for moving to another device or if you want to restore from a backup.
- If there is an "Overwrite active draft" option: use it only deliberately if you really want to replace the current status.

---

## 3) Export: DOCX & PDF – what do I get?

### DOCX (Word format)

Ideal if you want to **continue editing** the text.

- Open the text on a PC or smartphone,
- make final additions/adjustments,
- and then share the file as DOCX or PDF.

### PDF

Ideal if you want to **print or send** the document directly.

- The layout is fixed and looks the same everywhere.
- No further editing possible (without special tools).

Recommendation:

- After export, save the file **under a clear name**, e.g.:
  `doctors_letter_2026-01-26.docx`

---

## 4) Further Editing DOCX on PC (Windows / macOS / Linux)

Common options:

- **Microsoft Word** (Desktop)
- **LibreOffice Writer** (free)
- **Google Docs** (in the browser – editing Word files possible)

Practical Tip:

- If layout/page breaks are important, a desktop editor is often the most stable.
- After opening: briefly check if paragraphs, lists, and page breaks look correct.

---

## 5) DOCX on Smartphone / Tablet (Android)

Common options:

- **Microsoft Word** (Android)
- **Google Docs** (Android)
- **ONLYOFFICE Documents** (Android)

Typical Workflow:

1. Open DOCX file (Downloads/File Manager/Cloud)
2. "Open with ..." → select desired app
3. Save changes (some apps create a copy – this is normal)

---

## 6) DOCX on iPhone / iPad (iOS)

Common options:

- **Microsoft Word** (iOS)
- **Pages** (iOS – can open and edit DOCX)
- **Google Docs** (iOS)
- **ONLYOFFICE Documents** (iOS)

Typical Workflow:

1. Find file in the "Files" app (or open from Mail/Cloud)
2. Share/Open → select app (Word/Pages/etc.)
3. Save – if necessary as a copy

---

## 7) Frequently Asked Questions / Troubleshooting

**"I can no longer see my draft."**

- Check if you are in the correct support offer (Formpack).
- Look in Drafts/Snapshots to see if an intermediate state exists.
- Did you change devices? Data is only stored on the current device.

**"I can't find the exported file."**

- Check: Downloads folder / Files app / Cloud storage (e.g., iCloud Drive, Google Drive).

**"The layout is messed up."**

- Try opening the DOCX in another app (e.g., Word instead of an alternative app).
- After saving, check if paragraphs/lists/page breaks are correct.

**"I only want to print/send."**

- Export directly as PDF.

**"Something isn't working or I don't see support offer XYZ"**

- Reload the page.
- Try it again in a "Private Window" (Note: data might not be saved there).
- If that doesn't help: contact us via the feedback button.

**"Local data cannot be decrypted."**

- This usually happens when browser cookies were deleted while encrypted drafts still exist in IndexedDB.
- In that case, recovery inside the app is not possible.
- Use "Delete all local data" to fully reset local storage.

---

## 8) Privacy & Secure Working Method

- Before sharing a DOCX/PDF/JSON, check if it contains content you do not want to pass on.
- No further data is exchanged between your device and the server after the page has loaded (except for checking for formpack updates).
- Drafts, snapshots, and saved profile data are encrypted locally before being stored in IndexedDB. The required key is stored as a technical cookie in your browser profile.
- For encrypted JSON exports, the password is used locally only for encryption/decryption and is never transmitted or stored. Without the password, a later import is not possible.
- Local data deletion: If you want to remove all locally stored data (drafts, snapshots, local exports) on this device, use the "Delete all local data" option (available in the settings or at the bottom of the help page). This action removes all local data only on this device and is permanent; it cannot be undone.
- If you only want to delete individual drafts or snapshots, use the respective delete function in the draft/snapshot view.
- Alternatively, you can clear stored browser data via your browser settings (history / clear browsing data), which will also remove local storage and other saved site data.
