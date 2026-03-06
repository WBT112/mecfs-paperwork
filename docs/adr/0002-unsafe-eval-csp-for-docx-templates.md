# ADR 0002: Keep `unsafe-eval` in CSP for `docx-templates`

## Status

Accepted

## Context

mecfs-paperwork generates DOCX files client-side with `docx-templates`.
The library requires `eval`-like behavior for template expression handling in
the browser build. Because of that, the application CSP currently includes:

```text
script-src 'self' 'unsafe-eval'
```

The application is offline-first and intentionally avoids remote runtime
dependencies, but the export feature is a core capability and cannot be removed
without feature loss.

## Decision

We keep `unsafe-eval` in the CSP as long as `docx-templates` requires it for
browser-side DOCX export.

## Consequences

### Positive

- DOCX export continues to work in the browser without introducing a backend.
- The project keeps its offline-first architecture.

### Negative

- CSP is weaker than a strict `script-src 'self'` policy.
- `unsafe-eval` increases the impact of script-injection bugs if one were ever
  introduced elsewhere in the app.

## Mitigations

- No raw HTML rendering in Markdown content.
- Strict static asset loading from same origin.
- No telemetry or third-party runtime scripts.
- Linting, tests, and regular dependency/security review remain mandatory.
- Header configuration is documented in `docs/security/server-headers.md`.

## Removal criteria

This ADR should be revisited when one of the following becomes true:

1. `docx-templates` no longer requires `eval` in browser builds.
2. DOCX export is replaced by a browser-safe alternative without `unsafe-eval`.
3. Export generation moves to a trusted isolated service with an updated threat
   model and explicit product decision.
