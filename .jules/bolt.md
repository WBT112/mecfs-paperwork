# Bolt's Journal - Critical Learnings

## 2026-02-23 - useMemo deps with formData: always narrow to the actual slice
**Learning:** In FormpackDetailPage, `formData` (the full form state object) is replaced by reference on every keystroke via RJSF's `onChange`. Any `useMemo` that lists `formData` as a dependency will re-run on every keystroke, even if the memo only reads a sub-path like `formData.decision`. The fix is to extract the relevant sub-value (`formData.decision`, `getPathValue(formData, 'request.drug')`) and use that as the dependency instead.
**Action:** When reviewing memos that depend on large state objects, check if only a sub-path is read. If so, narrow the dependency to just that sub-path. Requires `eslint-disable-line react-hooks/exhaustive-deps` comment since ESLint can't track sub-path reads.
