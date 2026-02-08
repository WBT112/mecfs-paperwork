import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateDiagnosticsBundle,
  downloadDiagnosticsBundle,
  copyDiagnosticsToClipboard,
} from '../../../src/lib/diagnostics/bundle';

vi.mock('../../../src/lib/diagnostics/collectors', () => ({
  collectDiagnosticsBundle: vi.fn().mockResolvedValue({
    generatedAt: '2024-01-01T00:00:00Z',
    app: { version: 'abc123', buildDate: '2024-01-01', environment: 'test' },
    browser: {
      userAgent: 'Test',
      platform: 'Test',
      language: 'en',
      languages: ['en'],
      timezone: 'UTC',
      cookiesEnabled: true,
      onLine: true,
    },
    serviceWorker: { supported: false, registered: false },
    caches: [],
    indexedDb: { available: true, databases: [], stores: [] },
    storageHealth: {
      indexedDbAvailable: true,
      storageEstimate: { supported: false },
      status: 'ok',
      message: 'OK',
    },
    formpacks: [],
    errors: [],
  }),
}));

describe('bundle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateDiagnosticsBundle', () => {
    it('returns the collected bundle', async () => {
      const bundle = await generateDiagnosticsBundle();
      expect(bundle.generatedAt).toBe('2024-01-01T00:00:00Z');
      expect(bundle.app.version).toBe('abc123');
    });
  });

  describe('downloadDiagnosticsBundle', () => {
    let clickSpy: ReturnType<typeof vi.fn>;
    let removeSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      clickSpy = vi.fn();
      removeSpy = vi.fn();

      vi.spyOn(document, 'createElement').mockReturnValue({
        click: clickSpy,
        remove: removeSpy,
        style: {},
        href: '',
        download: '',
      } as unknown as HTMLAnchorElement);

      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob:test'),
        revokeObjectURL: vi.fn(),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('creates and clicks an anchor element', async () => {
      await downloadDiagnosticsBundle();
      expect(clickSpy).toHaveBeenCalledOnce();
    });

    it('sets the download filename', async () => {
      const createElement = vi.spyOn(document, 'createElement');
      await downloadDiagnosticsBundle();
      const anchor = createElement.mock.results[0].value as HTMLAnchorElement;
      expect(anchor.download).toBe('mecfs-diagnostics.json');
    });

    it('cleans up blob URL and removes link after timeout', async () => {
      vi.useFakeTimers();

      await downloadDiagnosticsBundle();

      // Before timeout fires, revokeObjectURL should not have been called
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      expect(removeSpy).not.toHaveBeenCalled();

      // Advance timers to trigger the cleanup setTimeout
      vi.advanceTimersByTime(100);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
      expect(removeSpy).toHaveBeenCalledOnce();

      vi.useRealTimers();
    });
  });

  describe('copyDiagnosticsToClipboard', () => {
    it('copies JSON to clipboard and returns true', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText },
      });

      const success = await copyDiagnosticsToClipboard();
      expect(success).toBe(true);
      expect(writeText).toHaveBeenCalledOnce();
      const written = writeText.mock.calls[0][0] as string;
      const parsed = JSON.parse(written);
      expect(parsed.generatedAt).toBe('2024-01-01T00:00:00Z');
    });

    it('returns false when clipboard is not available', async () => {
      vi.stubGlobal('navigator', {});

      const success = await copyDiagnosticsToClipboard();
      expect(success).toBe(false);
    });

    it('returns false when writeText throws', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('Denied'));
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText },
      });

      const success = await copyDiagnosticsToClipboard();
      expect(success).toBe(false);
    });
  });
});
