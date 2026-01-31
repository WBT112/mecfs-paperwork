# Craftsman's Journal

## 2026-01-30 - [Bespoke isRecord Consolidation]
**Pattern:** Multiple local definitions of a basic `isRecord` type guard.
**Learning:** Basic utilities like `isRecord` are often redefined locally in different modules to avoid dependency on a shared lib, leading to duplication and potential inconsistency.
**Prevention:** Always check `app/src/lib/utils.ts` before implementing basic type guards or string helpers.
