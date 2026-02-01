import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from '../../src/theme/useTheme';
import { themeStorageKey } from '../../src/theme/theme';

type MockMediaQueryList = MediaQueryList & {
  triggerChange: (matches: boolean) => void;
};

const createMediaQueryList = (matches: boolean): MockMediaQueryList => {
  let currentMatches = matches;
  let listener: ((event: MediaQueryListEvent) => void) | null = null;

  return {
    get matches() {
      return currentMatches;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(
      (_event: string, callback: (event: MediaQueryListEvent) => void) => {
        listener = callback;
      },
    ),
    removeEventListener: vi.fn(
      (_event: string, callback: (event: MediaQueryListEvent) => void) => {
        if (listener === callback) {
          listener = null;
        }
      },
    ),
    addListener: undefined as unknown as MediaQueryList['addListener'],
    removeListener: undefined as unknown as MediaQueryList['removeListener'],
    dispatchEvent: vi.fn(),
    triggerChange: (nextMatches: boolean) => {
      currentMatches = nextMatches;
      listener?.({ matches: nextMatches } as MediaQueryListEvent);
    },
  } as MockMediaQueryList;
};

const createLegacyMediaQueryList = (matches: boolean): MockMediaQueryList => {
  let currentMatches = matches;
  let onchange: ((event: MediaQueryListEvent) => void) | null = null;

  return {
    get matches() {
      return currentMatches;
    },
    media: '(prefers-color-scheme: dark)',
    get onchange() {
      return onchange;
    },
    set onchange(handler: ((event: MediaQueryListEvent) => void) | null) {
      onchange = handler;
    },
    addEventListener:
      undefined as unknown as MediaQueryList['addEventListener'],
    removeEventListener:
      undefined as unknown as MediaQueryList['removeEventListener'],
    addListener: undefined as unknown as MediaQueryList['addListener'],
    removeListener: undefined as unknown as MediaQueryList['removeListener'],
    dispatchEvent: vi.fn(),
    triggerChange: (nextMatches: boolean) => {
      currentMatches = nextMatches;
      onchange?.({ matches: nextMatches } as MediaQueryListEvent);
    },
  } as MockMediaQueryList;
};

const ThemeHarness = () => {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  return (
    <div>
      <span data-testid="mode">{themeMode}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setThemeMode('dark')}>
        Dark
      </button>
      <button type="button" onClick={() => setThemeMode('light')}>
        Light
      </button>
      <button type="button" onClick={() => setThemeMode('system')}>
        System
      </button>
    </div>
  );
};

describe('useTheme', () => {
  const originalMatchMedia = globalThis.matchMedia;

  beforeEach(() => {
    globalThis.localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  afterEach(() => {
    globalThis.matchMedia = originalMatchMedia;
    globalThis.localStorage.clear();
  });

  it('hydrates from stored theme mode', () => {
    globalThis.localStorage.setItem(themeStorageKey, 'light');

    render(<ThemeHarness />);

    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('persists updates when the user switches modes', async () => {
    const user = userEvent.setup();
    render(<ThemeHarness />);

    await user.click(screen.getByRole('button', { name: 'Light' }));

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('light');
    });

    expect(globalThis.localStorage.getItem(themeStorageKey)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('reacts to system changes when system mode is selected', async () => {
    const mediaQueryList = createMediaQueryList(true);
    globalThis.matchMedia = vi.fn().mockReturnValue(mediaQueryList);

    const user = userEvent.setup();
    const { unmount } = render(<ThemeHarness />);

    await user.click(screen.getByRole('button', { name: 'System' }));

    await waitFor(() => {
      expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    });
    expect(document.documentElement.dataset.theme).toBe('dark');

    act(() => {
      mediaQueryList.triggerChange(false);
    });

    await waitFor(() => {
      expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    });
    expect(document.documentElement.dataset.theme).toBe('light');

    unmount();

    expect(mediaQueryList.removeEventListener).toHaveBeenCalled();
  });

  it('cleans up legacy media listeners', async () => {
    const mediaQueryList = createLegacyMediaQueryList(true);
    globalThis.matchMedia = vi.fn().mockReturnValue(mediaQueryList);

    const user = userEvent.setup();
    const { unmount } = render(<ThemeHarness />);

    await user.click(screen.getByRole('button', { name: 'System' }));

    await waitFor(() => {
      expect(typeof mediaQueryList.onchange).toBe('function');
    });

    unmount();

    expect(mediaQueryList.onchange).toBeNull();
  });

  it('keeps a default theme when system media queries are unavailable', async () => {
    globalThis.matchMedia =
      undefined as unknown as typeof globalThis.matchMedia;

    const user = userEvent.setup();
    render(<ThemeHarness />);

    await user.click(screen.getByRole('button', { name: 'System' }));

    await waitFor(() => {
      expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
