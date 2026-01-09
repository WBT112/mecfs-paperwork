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

## Filename format

```
{formpackId}_{recordNameOrId}_{YYYY-MM-DD}_{locale}.json
```
