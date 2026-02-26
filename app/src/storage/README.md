# Storage module

## Purpose

Local persistence for records, snapshots, formpack metadata, and saved profiles.

## Architecture

- IndexedDB access lives in focused files (`records.ts`, `snapshots.ts`, `profiles.ts`, `formpackMeta.ts`).
- `hooks.ts` wraps storage operations for React screens.
- `importRecord.ts` restores records and snapshots from validated imports.
- `types.ts` defines persisted payload contracts.

## Public boundary

- Prefer importing storage APIs from `./index.ts` in page-level code.
- Use the `idb`-based helpers only; do not use raw IndexedDB APIs directly.
