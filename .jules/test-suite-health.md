## 2024-08-01 - Prefer `spyOn` over `stubGlobal` for fetch mocks

**Learning:** Using `vi.stubGlobal('fetch', ...)` can lead to flaky tests if multiple test suites modify the same global object. It creates a risk of mocks leaking between tests or causing unpredictable behavior.

**Action:** Refactor fetch mocks to use `vi.spyOn(global, 'fetch')` and restore it in an `afterEach` hook. This provides better isolation and more reliable test execution.
