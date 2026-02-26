import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HelpPage from '../../src/pages/HelpPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../src/lib/version', () => ({
  APP_VERSION: 'abc1234',
  BUILD_DATE_ISO: '2026-02-07T12:00:00.000Z',
  formatBuildDate: () => 'Feb 7, 2026, 12:00 PM',
}));

const mockDownloadDiagnosticsBundle = vi.fn();
const mockCopyDiagnosticsToClipboard = vi.fn();
const mockResetAllLocalData = vi.fn();

const mockRefreshHealth = vi.fn();
let mockHealthState: {
  health: {
    indexedDbAvailable: boolean;
    storageEstimate: { supported: boolean; usage?: number; quota?: number };
    encryptionAtRest?: {
      status: 'encrypted' | 'not_encrypted' | 'unknown';
      keyCookiePresent: boolean;
      keyCookieContext: 'https' | 'non-https' | 'unknown';
      secureFlagVerifiable: false;
    };
    status: 'ok' | 'warning' | 'error';
    message: string;
  };
  loading: boolean;
  refresh: () => void;
} = {
  health: {
    indexedDbAvailable: true,
    storageEstimate: {
      supported: true,
      usage: 5000,
      quota: 100000,
    },
    encryptionAtRest: {
      status: 'encrypted',
      keyCookiePresent: true,
      keyCookieContext: 'https',
      secureFlagVerifiable: false,
    },
    status: 'ok',
    message: 'Storage is available and working normally.',
  },
  loading: false,
  refresh: mockRefreshHealth,
};

vi.mock('../../src/lib/diagnostics', () => ({
  downloadDiagnosticsBundle: (...args: unknown[]) =>
    mockDownloadDiagnosticsBundle(...args) as Promise<void>,
  copyDiagnosticsToClipboard: (...args: unknown[]) =>
    mockCopyDiagnosticsToClipboard(...args) as Promise<boolean>,
  resetAllLocalData: (...args: unknown[]) =>
    mockResetAllLocalData(...args) as Promise<void>,
  useStorageHealth: () => mockHealthState,
}));

const TID_DIAGNOSTICS_DOWNLOAD = 'diagnostics-download';
const TID_DIAGNOSTICS_COPY = 'diagnostics-copy';
const TID_STORAGE_HEALTH_STATUS = 'storage-health-status';
const TID_STORAGE_HEALTH_QUOTA = 'storage-health-quota';
const TID_STORAGE_HEALTH_ENCRYPTION = 'storage-health-encryption';
const TID_STORAGE_HEALTH_KEY_COOKIE = 'storage-health-key-cookie';
const TID_STORAGE_HEALTH_COOKIE_SECURITY = 'storage-health-cookie-security';
const TID_RESET_ALL_DATA = 'reset-all-data';
const ATTR_DATA_STATUS = 'data-status';

describe('HelpPage', () => {
  beforeEach(() => {
    mockDownloadDiagnosticsBundle.mockResolvedValue(undefined);
    mockCopyDiagnosticsToClipboard.mockResolvedValue(true);
    mockResetAllLocalData.mockResolvedValue(undefined);
    mockHealthState = {
      health: {
        indexedDbAvailable: true,
        storageEstimate: {
          supported: true,
          usage: 5000,
          quota: 100000,
        },
        encryptionAtRest: {
          status: 'encrypted' as const,
          keyCookiePresent: true,
          keyCookieContext: 'https' as const,
          secureFlagVerifiable: false,
        },
        status: 'ok' as const,
        message: 'Storage is available and working normally.',
      },
      loading: false,
      refresh: mockRefreshHealth,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  });

  it('renders the main help heading from markdown', async () => {
    render(<HelpPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /help/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: 'versionInfoTitle' }),
    ).toBeVisible();
    expect(screen.getByText('abc1234')).toBeVisible();
  });

  it('copies version information to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<HelpPage />);

    fireEvent.click(screen.getByRole('button', { name: 'versionInfoCopy' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        'versionInfoAppVersion: abc1234\nversionInfoBuildDate: 2026-02-07T12:00:00.000Z',
      );
    });
    expect(
      screen.getByRole('button', { name: 'versionInfoCopied' }),
    ).toBeInTheDocument();
  });

  it('handles clipboard write failures without showing copied state', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard blocked'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<HelpPage />);

    fireEvent.click(screen.getByRole('button', { name: 'versionInfoCopy' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.getByRole('button', { name: 'versionInfoCopy' }),
    ).toBeInTheDocument();
  });

  describe('diagnostics download button', () => {
    it('downloads diagnostics bundle on click', async () => {
      render(<HelpPage />);

      const button = screen.getByTestId(TID_DIAGNOSTICS_DOWNLOAD);
      expect(button).toHaveTextContent('diagnosticsDownload');

      fireEvent.click(button);

      await waitFor(() => {
        expect(mockDownloadDiagnosticsBundle).toHaveBeenCalledTimes(1);
      });
    });

    it('shows downloading state while in progress', async () => {
      let resolveDownload: () => void;
      mockDownloadDiagnosticsBundle.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveDownload = resolve;
        }),
      );

      render(<HelpPage />);
      const button = screen.getByTestId(TID_DIAGNOSTICS_DOWNLOAD);

      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveTextContent('diagnosticsDownloading');
      });
      expect(button).toBeDisabled();

      resolveDownload!();

      await waitFor(() => {
        expect(button).toHaveTextContent('diagnosticsDownloaded');
      });
      expect(button).not.toBeDisabled();
    });

    it('resets to idle state when download fails', async () => {
      mockDownloadDiagnosticsBundle.mockRejectedValue(new Error('fail'));

      render(<HelpPage />);
      const button = screen.getByTestId(TID_DIAGNOSTICS_DOWNLOAD);

      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveTextContent('diagnosticsDownload');
      });
      expect(button).not.toBeDisabled();
    });
  });

  describe('diagnostics copy button', () => {
    it('copies diagnostics to clipboard on click', async () => {
      render(<HelpPage />);

      const button = screen.getByTestId(TID_DIAGNOSTICS_COPY);
      expect(button).toHaveTextContent('diagnosticsCopy');

      fireEvent.click(button);

      await waitFor(() => {
        expect(mockCopyDiagnosticsToClipboard).toHaveBeenCalledTimes(1);
      });
    });

    it('shows copied state on success', async () => {
      mockCopyDiagnosticsToClipboard.mockResolvedValue(true);

      render(<HelpPage />);
      const button = screen.getByTestId(TID_DIAGNOSTICS_COPY);

      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveTextContent('diagnosticsCopied');
      });
    });

    it('shows failed state when copy fails', async () => {
      mockCopyDiagnosticsToClipboard.mockResolvedValue(false);

      render(<HelpPage />);
      const button = screen.getByTestId(TID_DIAGNOSTICS_COPY);

      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveTextContent('diagnosticsCopyFailed');
      });
    });

    it('is disabled while copying is in progress', async () => {
      let resolveCopy: (v: boolean) => void;
      mockCopyDiagnosticsToClipboard.mockReturnValue(
        new Promise<boolean>((resolve) => {
          resolveCopy = resolve;
        }),
      );

      render(<HelpPage />);
      const button = screen.getByTestId(TID_DIAGNOSTICS_COPY);

      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });

      resolveCopy!(true);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('storage health display', () => {
    it('shows loading state when health check is pending', async () => {
      mockHealthState = {
        ...mockHealthState,
        loading: true,
      };

      render(<HelpPage />);

      expect(
        await screen.findByText('storageHealthLoading'),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(TID_STORAGE_HEALTH_STATUS),
      ).not.toBeInTheDocument();
    });

    it('displays ok status when storage is healthy', async () => {
      render(<HelpPage />);

      const statusEl = await screen.findByTestId(TID_STORAGE_HEALTH_STATUS);
      expect(statusEl).toHaveAttribute(ATTR_DATA_STATUS, 'ok');
      expect(statusEl).toHaveTextContent('storageHealthStatusOk');
    });

    it('displays warning status and guidance message', async () => {
      mockHealthState = {
        ...mockHealthState,
        health: {
          indexedDbAvailable: true,
          storageEstimate: { supported: true, usage: 90000, quota: 100000 },
          status: 'warning',
          message: 'Storage usage is high (90%).',
        },
      };

      render(<HelpPage />);

      const statusEl = await screen.findByTestId(TID_STORAGE_HEALTH_STATUS);
      expect(statusEl).toHaveAttribute(ATTR_DATA_STATUS, 'warning');
      expect(statusEl).toHaveTextContent('storageHealthStatusWarning');

      expect(screen.getByRole('status')).toHaveTextContent(
        'Storage usage is high (90%).',
      );
    });

    it('displays error status and guidance message', async () => {
      mockHealthState = {
        ...mockHealthState,
        health: {
          indexedDbAvailable: false,
          storageEstimate: { supported: false },
          status: 'error',
          message: 'IndexedDB is not available.',
        },
      };

      render(<HelpPage />);

      const statusEl = await screen.findByTestId(TID_STORAGE_HEALTH_STATUS);
      expect(statusEl).toHaveAttribute(ATTR_DATA_STATUS, 'error');
      expect(statusEl).toHaveTextContent('storageHealthStatusError');

      expect(screen.getByRole('status')).toHaveTextContent(
        'IndexedDB is not available.',
      );
    });

    it('does not show guidance message when status is ok', async () => {
      render(<HelpPage />);
      await screen.findByTestId(TID_STORAGE_HEALTH_STATUS);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('displays storage quota as formatted bytes when supported', async () => {
      render(<HelpPage />);

      const quotaEl = await screen.findByTestId(TID_STORAGE_HEALTH_QUOTA);
      expect(quotaEl).toHaveTextContent('4.9 KB / 97.7 KB');
    });

    it('displays unsupported message when storage estimate is not available', async () => {
      mockHealthState = {
        ...mockHealthState,
        health: {
          ...mockHealthState.health,
          storageEstimate: { supported: false },
        },
      };

      render(<HelpPage />);

      const quotaEl = await screen.findByTestId(TID_STORAGE_HEALTH_QUOTA);
      expect(quotaEl).toHaveTextContent('storageHealthQuotaUnsupported');
    });

    it('shows IDB available status', async () => {
      render(<HelpPage />);

      const idbEl = await screen.findByTestId('storage-health-idb');
      expect(idbEl).toHaveAttribute(ATTR_DATA_STATUS, 'available');
      expect(idbEl).toHaveTextContent('storageHealthIdbAvailable');
    });

    it('shows IDB unavailable status', async () => {
      mockHealthState = {
        ...mockHealthState,
        health: {
          ...mockHealthState.health,
          indexedDbAvailable: false,
        },
      };

      render(<HelpPage />);

      const idbEl = await screen.findByTestId('storage-health-idb');
      expect(idbEl).toHaveAttribute(ATTR_DATA_STATUS, 'unavailable');
      expect(idbEl).toHaveTextContent('storageHealthIdbUnavailable');
    });

    it('calls refresh when the refresh button is clicked', async () => {
      render(<HelpPage />);

      const refreshButton = await screen.findByRole('button', {
        name: 'storageHealthRefresh',
      });
      fireEvent.click(refreshButton);

      expect(mockRefreshHealth).toHaveBeenCalledTimes(1);
    });

    it('shows encryption and key-cookie diagnostics', async () => {
      render(<HelpPage />);

      const encryptionEl = await screen.findByTestId(
        TID_STORAGE_HEALTH_ENCRYPTION,
      );
      expect(encryptionEl).toHaveAttribute(ATTR_DATA_STATUS, 'encrypted');
      expect(encryptionEl).toHaveTextContent(
        'storageHealthEncryptionEncrypted',
      );

      const keyCookieEl = await screen.findByTestId(
        TID_STORAGE_HEALTH_KEY_COOKIE,
      );
      expect(keyCookieEl).toHaveAttribute(ATTR_DATA_STATUS, 'available');
      expect(keyCookieEl).toHaveTextContent('storageHealthCookiePresent');

      const cookieSecurityEl = await screen.findByTestId(
        TID_STORAGE_HEALTH_COOKIE_SECURITY,
      );
      expect(cookieSecurityEl).toHaveAttribute(ATTR_DATA_STATUS, 'https');
      expect(cookieSecurityEl).toHaveTextContent(
        'storageHealthCookieSecurityHttps',
      );
    });

    it('shows unknown encryption status when diagnostics are unavailable', async () => {
      mockHealthState = {
        ...mockHealthState,
        health: {
          ...mockHealthState.health,
          encryptionAtRest: undefined,
        },
      };

      render(<HelpPage />);

      const encryptionEl = await screen.findByTestId(
        TID_STORAGE_HEALTH_ENCRYPTION,
      );
      expect(encryptionEl).toHaveAttribute(ATTR_DATA_STATUS, 'unknown');
      expect(encryptionEl).toHaveTextContent('storageHealthEncryptionUnknown');
    });
  });

  describe('formatBytes', () => {
    it('formats bytes correctly', async () => {
      mockHealthState = {
        ...mockHealthState,
        health: {
          ...mockHealthState.health,
          storageEstimate: { supported: true, usage: 500, quota: 1024 },
        },
      };

      render(<HelpPage />);

      const quotaEl = await screen.findByTestId(TID_STORAGE_HEALTH_QUOTA);
      expect(quotaEl).toHaveTextContent('500 B / 1.0 KB');
    });

    it('formats kilobytes correctly', async () => {
      mockHealthState = {
        ...mockHealthState,
        health: {
          ...mockHealthState.health,
          storageEstimate: { supported: true, usage: 2048, quota: 512000 },
        },
      };

      render(<HelpPage />);

      const quotaEl = await screen.findByTestId(TID_STORAGE_HEALTH_QUOTA);
      expect(quotaEl).toHaveTextContent('2.0 KB / 500.0 KB');
    });

    it('formats megabytes correctly', async () => {
      mockHealthState = {
        ...mockHealthState,
        health: {
          ...mockHealthState.health,
          storageEstimate: {
            supported: true,
            usage: 5 * 1024 * 1024,
            quota: 100 * 1024 * 1024,
          },
        },
      };

      render(<HelpPage />);

      const quotaEl = await screen.findByTestId(TID_STORAGE_HEALTH_QUOTA);
      expect(quotaEl).toHaveTextContent('5.0 MB / 100.0 MB');
    });
  });

  describe('statusLabel', () => {
    it('returns ok label', async () => {
      render(<HelpPage />);

      const statusEl = await screen.findByTestId(TID_STORAGE_HEALTH_STATUS);
      expect(statusEl).toHaveTextContent('storageHealthStatusOk');
    });

    it('returns warning label', async () => {
      mockHealthState = {
        ...mockHealthState,
        health: {
          ...mockHealthState.health,
          status: 'warning',
          message: 'Storage is getting full.',
        },
      };

      render(<HelpPage />);

      const statusEl = await screen.findByTestId(TID_STORAGE_HEALTH_STATUS);
      expect(statusEl).toHaveTextContent('storageHealthStatusWarning');
    });

    it('returns error label', async () => {
      mockHealthState = {
        ...mockHealthState,
        health: {
          ...mockHealthState.health,
          status: 'error',
          message: 'Storage error.',
        },
      };

      render(<HelpPage />);

      const statusEl = await screen.findByTestId(TID_STORAGE_HEALTH_STATUS);
      expect(statusEl).toHaveTextContent('storageHealthStatusError');
    });
  });

  describe('reset all local data', () => {
    it('renders the danger zone section', async () => {
      render(<HelpPage />);

      expect(await screen.findByTestId('danger-zone')).toBeInTheDocument();
      expect(screen.getByTestId(TID_RESET_ALL_DATA)).toBeInTheDocument();
    });

    it('shows confirm dialog on button click and does nothing on cancel', async () => {
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

      render(<HelpPage />);
      fireEvent.click(await screen.findByTestId(TID_RESET_ALL_DATA));

      expect(confirmSpy).toHaveBeenCalledWith('resetAllConfirm');
      expect(mockResetAllLocalData).not.toHaveBeenCalled();
    });

    it('calls resetAllLocalData when confirmed', async () => {
      vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

      render(<HelpPage />);
      fireEvent.click(await screen.findByTestId(TID_RESET_ALL_DATA));

      await waitFor(() => {
        expect(mockResetAllLocalData).toHaveBeenCalledOnce();
      });
    });

    it('shows loading state while resetting', async () => {
      vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
      let resolveReset: () => void;
      mockResetAllLocalData.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveReset = resolve;
        }),
      );

      render(<HelpPage />);
      const button = await screen.findByTestId(TID_RESET_ALL_DATA);
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveTextContent('resetAllInProgress');
      });
      expect(button).toBeDisabled();

      resolveReset!();
    });

    it('re-enables button if reset fails', async () => {
      vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
      mockResetAllLocalData.mockRejectedValue(new Error('fail'));

      render(<HelpPage />);
      const button = await screen.findByTestId(TID_RESET_ALL_DATA);
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
      expect(button).toHaveTextContent('resetAllButton');
    });
  });
});
