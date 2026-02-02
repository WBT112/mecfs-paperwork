# FLAKEPATROL'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2025-05-14 - Timer and Global State Leakage
**Learning:** Using `vi.useFakeTimers()`, `vi.stubGlobal()`, or `vi.spyOn()` inside `it` blocks without an `afterEach` or `try/finally` restoration leads to state leakage if a test fails. This causes nondeterministic failures in subsequent tests in CI.
**Action:** Always use `afterEach` hooks in Vitest to restore real timers (`vi.useRealTimers()`), unstub globals (`vi.unstubAllGlobals()`), and restore mocks (`vi.restoreAllMocks()`).
