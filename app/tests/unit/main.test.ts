import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const isTimeoutCallback = (
  value: TimerHandler,
): value is (...args: never[]) => void => typeof value === 'function';

type MainImports = {
  applyTheme: ReturnType<typeof vi.fn>;
  registerServiceWorker: ReturnType<typeof vi.fn>;
  installGlobalErrorListeners: ReturnType<typeof vi.fn>;
  startUserTiming: ReturnType<typeof vi.fn>;
  appBootEnd: ReturnType<typeof vi.fn>;
  createRoot: ReturnType<typeof vi.fn>;
  render: ReturnType<typeof vi.fn>;
  browserRouter: ReturnType<typeof vi.fn>;
};

const LOCALE_STORAGE_KEY = 'mecfs-paperwork.locale';

const setupMainMocks = (): MainImports => {
  const applyTheme = vi.fn();
  const registerServiceWorker = vi.fn();
  const installGlobalErrorListeners = vi.fn();
  const appBootEnd = vi.fn();
  const startUserTiming = vi.fn(() => ({ end: appBootEnd }));
  const render = vi.fn();
  const createRoot = vi.fn(() => ({ render }));
  const browserRouter = vi.fn(
    ({ children }: { children: unknown }) => children,
  );

  vi.doMock('../../src/theme/applyTheme', () => ({ applyTheme }));
  vi.doMock('../../src/theme/theme', () => ({
    getInitialThemeMode: () => 'dark',
  }));
  vi.doMock('../../src/pwa/register', () => ({ registerServiceWorker }));
  vi.doMock('../../src/lib/diagnostics', () => ({
    installGlobalErrorListeners,
  }));
  vi.doMock('../../src/lib/performance/userTiming', () => ({
    USER_TIMING_NAMES: { appBootTotal: 'appBootTotal' },
    startUserTiming,
  }));
  vi.doMock('react-dom/client', () => ({ default: { createRoot } }));
  vi.doMock('react-router-dom', () => ({
    BrowserRouter: browserRouter,
  }));
  vi.doMock('../../src/App', () => ({ default: () => null }));
  vi.doMock('../../src/i18n', () => ({}));
  vi.doMock('../../src/index.css', () => ({}));

  return {
    applyTheme,
    registerServiceWorker,
    installGlobalErrorListeners,
    startUserTiming,
    appBootEnd,
    createRoot,
    render,
    browserRouter,
  };
};

beforeEach(() => {
  document.body.innerHTML = '';
  globalThis.localStorage.removeItem(LOCALE_STORAGE_KEY);
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('main', () => {
  it('throws when the root element is missing', async () => {
    const { applyTheme, registerServiceWorker, createRoot } = setupMainMocks();

    await expect(import('../../src/main')).rejects.toThrow(
      'Root element not found',
    );

    expect(applyTheme).not.toHaveBeenCalled();
    expect(registerServiceWorker).not.toHaveBeenCalled();
    expect(createRoot).not.toHaveBeenCalled();
  });

  it('applies startup setup, renders the app, and ends boot timing via requestAnimationFrame', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    const {
      applyTheme,
      registerServiceWorker,
      installGlobalErrorListeners,
      startUserTiming,
      appBootEnd,
      createRoot,
      render,
    } = setupMainMocks();
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: requestAnimationFrame,
    });

    try {
      await import('../../src/main');

      expect(applyTheme).toHaveBeenCalledWith('dark');
      expect(registerServiceWorker).toHaveBeenCalled();
      expect(installGlobalErrorListeners).toHaveBeenCalled();
      expect(document.documentElement.lang).toBe('de');
      expect(document.documentElement.dir).toBe('ltr');
      expect(startUserTiming).toHaveBeenCalledWith('appBootTotal');
      expect(createRoot).toHaveBeenCalledWith(root);
      expect(render).toHaveBeenCalledTimes(1);
      const renderedTree = render.mock.calls[0]?.[0] as {
        props?: {
          children?: {
            props?: {
              future?: {
                v7_startTransition: boolean;
                v7_relativeSplatPath: boolean;
              };
            };
          };
        };
      };
      expect(renderedTree.props?.children?.props?.future).toEqual(
        expect.objectContaining({
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }),
      );
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
      expect(appBootEnd).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(globalThis, 'requestAnimationFrame', {
        configurable: true,
        writable: true,
        value: originalRequestAnimationFrame,
      });
    }
  });

  it('uses stored locale for initial document language', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    globalThis.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');

    setupMainMocks();
    await import('../../src/main');

    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('ends boot timing via setTimeout when requestAnimationFrame is unavailable', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    const { appBootEnd } = setupMainMocks();
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const originalSetTimeout = globalThis.setTimeout;
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((...args: Parameters<typeof setTimeout>) => {
        const [handler] = args;
        if (isTimeoutCallback(handler)) {
          handler();
        }
        const timer = originalSetTimeout(() => undefined, 0);
        clearTimeout(timer);
        return timer;
      });

    try {
      await import('../../src/main');
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);
      expect(appBootEnd).toHaveBeenCalledTimes(1);
    } finally {
      setTimeoutSpy.mockRestore();
      Object.defineProperty(globalThis, 'requestAnimationFrame', {
        configurable: true,
        writable: true,
        value: originalRequestAnimationFrame,
      });
    }
  });
});
