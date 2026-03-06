# Hooks

Stateful orchestration hooks for `FormpackDetailPage`.

## Scope

- loading static formpack assets
- import/export workflows
- record and snapshot management
- profile sync
- offlabel-specific behavior

## Rules

- Hooks may coordinate storage and helper modules.
- Keep domain-specific pure logic out of hooks when it can live in `../helpers`.
- Prefer explicit option/result interfaces for hook boundaries.
