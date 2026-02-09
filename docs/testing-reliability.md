# Testing Reliability

Guidelines for writing stable, deterministic tests in this project.

## Core principles

1. **No arbitrary timeouts** — Never use `waitForTimeout` for synchronization. Use deterministic waits instead.
2. **Explicit signals** — Wait for specific UI state changes, not elapsed time.
3. **Clean state** — Each test starts from a known, clean state.

## Waiting strategies

### Preferred: Playwright assertions with auto-retry

```typescript
// Wait for element to be visible
await expect(button).toBeVisible();

// Wait for text content
await expect(heading).toHaveText('Expected Title');

// Wait for attribute
await expect(toggle).toHaveAttribute('aria-expanded', 'true');
```

### For async state: `expect.poll`

```typescript
await expect
  .poll(async () => getActiveRecordId(page), {
    timeout: 10_000,
    intervals: [250, 500, 1000],
  })
  .not.toBe('');
```

### For downloads: `waitForDownload` helper

```typescript
import { waitForDownload } from './helpers/download';

const download = await waitForDownload(page, () =>
  downloadButton.click(),
);
expect(download.suggestedFilename()).toBe('expected-file.json');
```

### For page navigation

```typescript
await page.goto('/path', { waitUntil: 'domcontentloaded' });
```

## When `waitForTimeout` is acceptable

Only in these specific cases, always with a justifying comment:

1. **Retry backoff** — Brief delays between retry attempts (e.g., `150 * attempt` ms)
2. **Polling loops** — When no event-based alternative exists (e.g., Service Worker state polling)
3. **Framework settling** — Brief pause after rapid state changes to let React commit (form helpers)

Example with required comment:
```typescript
// Retry backoff: brief pause before re-attempting click on flaky re-rendered buttons
await button.page().waitForTimeout(150 * attempt);
```

## E2E helper utilities

Located in `app/e2e/helpers/`:

| Helper | Purpose |
|---|---|
| `download.ts` | `waitForDownload()` — deterministic download assertions |
| `actions.ts` | `clickActionButton()` — robust click with retry |
| `form.ts` | `fillTextInputStable()` — reliable form input filling |
| `sections.ts` | `openCollapsibleSection()` — toggle collapsible sections |
| `serviceWorker.ts` | `waitForServiceWorkerReady()` — SW state polling |
| `helpers.ts` | `deleteDatabase()` — clean IDB state between tests |

## Clean state between tests

- Use `deleteDatabase(page, 'mecfs-paperwork')` to clear IndexedDB
- Clear `localStorage` and `sessionStorage` via `page.evaluate()`
- Navigate to `/e2e-reset.html` before IDB deletion (closes DB handles)
- The Playwright config uses separate browser contexts per test by default

## Writing download/export tests

```typescript
test('export produces a valid file', async ({ page }) => {
  // Setup: navigate and prepare data
  await page.goto('/formpacks/doctor-letter');

  // Trigger download with deterministic wait
  const download = await waitForDownload(page, () =>
    exportButton.click(),
  );

  // Assert filename
  expect(download.suggestedFilename()).toMatch(/\.json$/);

  // Read and validate content
  const path = await download.path();
  const content = fs.readFileSync(path!, 'utf-8');
  const data = JSON.parse(content);
  expect(data).toHaveProperty('expectedKey');
});
```

## Coverage requirements

- **Global threshold**: 85% statements, 75% branches, 80% functions, 85% lines
- **New code**: Must maintain or improve coverage
- Coverage is enforced in CI via `npm run test:coverage`
- Reports: text (console), JSON, HTML, LCOV

## CI configuration

- E2E runs with `--retries=1` for minimal flake tolerance
- Chromium is required to pass; Firefox/WebKit are allow-failure
- Playwright report + test-results artifacts are uploaded on every run
- Coverage report is uploaded as a CI artifact
