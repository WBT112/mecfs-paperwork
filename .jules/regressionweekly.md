# RegressionWeekly Journal

## 2025-05-24 - FormpackListPage Error State Test
**Learning:** Testing error states in components that use `useEffect` for data fetching is important for user-visible robustness.
**Action:** Use `vi.mocked(module).mockRejectedValue` to simulate failures in data loaders and verify that the UI displays appropriate error messages. Ensure all side-effect dependencies (like i18n) are mocked to avoid unhandled exceptions or unexpected network requests.
