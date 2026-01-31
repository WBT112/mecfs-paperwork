import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MainImports = {
  applyTheme: ReturnType<typeof vi.fn>;
  registerServiceWorker: ReturnType<typeof vi.fn>;
  createRoot: ReturnType<typeof vi.fn>;
};

const setupMainMocks = (): MainImports => {
  const applyTheme = vi.fn();
  const registerServiceWorker = vi.fn();
  const render = vi.fn();
  const createRoot = vi.fn(() => ({ render }));

  vi.doMock('../../src/theme/applyTheme', () => ({ applyTheme }));
  vi.doMock('../../src/theme/theme', () => ({
    getInitialThemeMode: () => 'dark',
  }));
  vi.doMock('../../src/pwa/register', () => ({ registerServiceWorker }));
  vi.doMock('react-dom/client', () => ({ default: { createRoot } }));
  vi.doMock('react-router-dom', () => ({
    BrowserRouter: ({ children }: { children: unknown }) => children,
  }));
  vi.doMock('../../src/App', () => ({ default: () => null }));
  vi.doMock('../../src/i18n', () => ({}));
  vi.doMock('../../src/index.css', () => ({}));

  return { applyTheme, registerServiceWorker, createRoot };
};

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('main', () => {
  it('throws when the root element is missing', async () => {
    setupMainMocks();

    await expect(import('../../src/main')).rejects.toThrow(
      'Root element not found',
    );
  });

  it('applies the theme, registers the service worker, and renders the app', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    const { applyTheme, registerServiceWorker, createRoot } = setupMainMocks();

    await import('../../src/main');

    expect(applyTheme).toHaveBeenCalledWith('dark');
    expect(registerServiceWorker).toHaveBeenCalled();
    expect(createRoot).toHaveBeenCalledWith(root);
  });
});
