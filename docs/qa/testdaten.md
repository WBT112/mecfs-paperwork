# Test Data & Privacy Policy

## Rules (Binding)
- **Never commit real patient data.** Use synthetic, clearly fake examples only.
- **Minimal data only:** include just enough fields to exercise logic and exports.
- **No PII in logs:** never print form contents to console/CI output; only emit concise error summaries.
- **No telemetry/analytics/tracking** in tests or fixtures.

## Synthetic Data Guidelines
- Prefer placeholders such as `Test Person`, `Example Clinic`, `test@example.invalid`.
- Use obviously fake IDs (e.g., `TEST-0001`) and dates.
- Keep fixtures small and easy to review.

## Example Minimal Record (Fake)
```json
{
  "id": "TEST-0001",
  "displayName": "Test Person",
  "locale": "en",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "data": {
    "givenName": "Test",
    "familyName": "Person",
    "birthYear": 1990,
    "notes": "Synthetic example data only."
  }
}
```

## Logging Policy
- Allowed: error categories, validation paths, file names.
- Disallowed: raw form values, record contents, exported documents.
