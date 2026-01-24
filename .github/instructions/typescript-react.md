---
applyTo: "app/src/**/*.ts,app/src/**/*.tsx"
---

# TypeScript & React Code Instructions

When working with TypeScript and React code in this project:

## Type Safety

### TypeScript Best Practices
- **Never use `any`** - use `unknown` and type guards if you must handle dynamic types
- **Explicit return types** for all exported functions and public APIs
- **Interface over type** for object shapes (unless you need union/intersection features)
- **Strict null checks** - handle `null`/`undefined` explicitly
- **No non-null assertions (`!`)** unless you have a comment explaining why it's safe

Example:
```typescript
// ✅ Good
export function validateRecord(data: unknown): ValidationResult {
  if (!isObject(data)) {
    return { valid: false, errors: ['Invalid data structure'] };
  }
  // ...
}

// ❌ Bad
export function validateRecord(data: any) {
  // ...
}
```

## React Patterns

### Components
- **Functional components only** (no class components)
- **Props interface** for every component
- **Use hooks** from React 19 (no outdated patterns)
- **Extract complex logic** into custom hooks or utility functions

Example:
```typescript
interface PersonFormProps {
  initialData?: PersonData;
  onSave: (data: PersonData) => void;
  locale: Locale;
}

export function PersonForm({ initialData, onSave, locale }: PersonFormProps) {
  const { t } = useFormpackTranslation('notfallpass', locale);
  // ...
}
```

### State Management
- **Local state:** `useState` for component-specific state
- **Side effects:** `useEffect` with proper dependency arrays
- **Context:** Only for truly global concerns (theme, i18n)
- **No external state libraries** (Redux, Zustand, Jotai, etc.) - the app uses local state and IndexedDB for persistence

### Performance
- **Memoization:** Use `useMemo`/`useCallback` only when measured to be necessary
- **Keys in lists:** Use stable IDs (never use array index as key)
- **Lazy loading:** Use `React.lazy` for large route components

## Testing Requirements

### Coverage Expectations
- **80% minimum** for new/changed code
- **100% for critical paths:** export, import, storage operations
- **Test locations:**
  - Unit/component tests: `app/tests/`
  - E2E tests: `app/e2e/`

### Unit Tests (Vitest)
```typescript
import { describe, it, expect } from 'vitest';
import { validatePersonData } from './validation';

describe('validatePersonData', () => {
  it('accepts valid person data', () => {
    const result = validatePersonData({
      name: 'Alice Example',
      birthDate: '2000-01-01'
    });
    expect(result.valid).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = validatePersonData({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('name is required');
  });
});
```

### Component Tests
- Use `@testing-library/react` patterns
- Test user interactions, not implementation details
- Mock external dependencies (storage, fetch, etc.)

### E2E Tests (Playwright)
- **Only for critical flows:** new record → fill form → export → import
- **Chromium is gating** (Firefox/WebKit allowed to fail)
- **No flaky tests:** avoid timing-based assertions, use `waitFor` patterns

## Privacy & Security

### Data Handling
- **Never log user data** to console in production code
- **Use fake data** in tests: "Alice Example", "555-0100"
- **Sanitize before display** - be careful with user-provided content

Example:
```typescript
// ✅ Good
logger.debug('Record saved', { recordId: record.id });

// ❌ Bad - logs sensitive data
logger.debug('Record saved', { record });
```

### IndexedDB Storage
- **Always use `idb` wrapper** (never raw IndexedDB)
- **Use UUIDs** for record IDs (`crypto.randomUUID()`)
- **Store timestamps** as ISO strings
- **Handle errors gracefully** - storage can fail (quota exceeded, etc.)

## i18n Patterns

### Translation Usage
```typescript
import { useFormpackTranslation } from '@/i18n/useFormpackTranslation';

function MyComponent({ formpackId, locale }: Props) {
  const { t } = useFormpackTranslation(formpackId, locale);
  
  return <h1>{t('section.person.title')}</h1>;
}
```

### Key Conventions
- Namespace with formpack ID: `notfallpass.section.person.title`
- Use dot notation for nesting
- Keep keys lowercase with dots and underscores only

## Import Paths

Use path aliases (defined in `tsconfig.json`):
```typescript
// ✅ Good
import { loadFormpack } from '@/formpacks/loader';
import { validateRecord } from '@/lib/validation';

// ❌ Bad
import { loadFormpack } from '../../formpacks/loader';
```

## Quality Gates

Before committing TypeScript/React changes:
```bash
cd app
npm run format        # Auto-fix formatting
npm run lint          # Check for issues
npm run typecheck     # Verify types
npm test             # Run unit tests
npm run build        # Ensure it builds
```
