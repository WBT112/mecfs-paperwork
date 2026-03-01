# JSON export format (Record backup)

This format captures a single record backup with metadata so it can be imported
later. The export is offline-first and contains no telemetry.

## Schema (MVP)

```json
{
  "app": { "id": "mecfs-paperwork", "version": "0.1.0" },
  "formpack": { "id": "notfallpass", "version": "0.1.0" },
  "record": { "id": "uuid", "name": "optional", "updatedAt": "2024-01-01T00:00:00.000Z" },
  "locale": "de",
  "exportedAt": "2024-01-02T00:00:00.000Z",
  "data": {},
  "revisions": [
    {
      "id": "uuid",
      "label": "Snapshot 1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "data": {}
    }
  ]
}
```

### Field notes
- `app`: The app identifier and version that generated the export.
- `formpack`: The formpack identifier and version used for the record.
- `record`: Record metadata. `name` is optional.
- `locale`: The locale stored with the record and used for exports.
- `exportedAt`: ISO timestamp when the export was created.
- `data`: Record form data (JSON object).
- `revisions`: Optional snapshots captured for the record.

## Optional encryption envelope

JSON exports can optionally be password-encrypted. In this case, the file content
is a versioned envelope instead of the plain schema shown above:

```json
{
  "kind": "mecfs-paperwork-json-encrypted",
  "version": 1,
  "cipher": "AES-GCM",
  "tagLength": 128,
  "kdf": "PBKDF2",
  "hash": "SHA-256",
  "iterations": 310000,
  "salt": "base64url",
  "iv": "base64url",
  "ciphertext": "base64url"
}
```

- The encrypted payload contains the complete JSON export object.
- Decryption requires the same password that was entered during export.
- Without encryption enabled, exports remain plain JSON for maximum compatibility.

### Date formats
- Fields marked as `format: "date"` in a formpack schema are expected to be
  `YYYY-MM-DD`.
- Exports normalize common date inputs (`YYYY/MM/DD`, `DD.MM.YYYY`) to
  `YYYY-MM-DD` when the schema declares `format: "date"`.
- Imports validate `format: "date"` via Ajv formats and reject invalid dates.

## Filename format

```
{formpackId}_{recordNameOrId}_{YYYY-MM-DD}_{locale}.json
```
