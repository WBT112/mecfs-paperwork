## 2026-02-02 - Unify array item schema resolution in docx export
**Learning:** The `getFirstItem` utility from `app/src/lib/utils.ts` should be preferred over bespoke `Array.isArray` checks for RJSF schema and UI schema items. When using it, casting to `unknown` before `isRecord` check is necessary to satisfy lint rules when the input is `any`.
**Action:** Use `getFirstItem` for all schema/UI schema item resolution and ensure proper casting if linting fails.
