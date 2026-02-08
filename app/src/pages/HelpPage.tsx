import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from '../components/Markdown/MarkdownRenderer';
import helpContent from '../content/help/help.md?raw';
import { APP_VERSION, BUILD_DATE_ISO, formatBuildDate } from '../lib/version';
import {
  downloadDiagnosticsBundle,
  copyDiagnosticsToClipboard,
} from '../lib/diagnostics';
import { useStorageHealth } from '../lib/diagnostics/useStorageHealth';
import type { StorageHealthStatus } from '../lib/diagnostics';

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const statusLabel = (
  status: StorageHealthStatus,
  t: (key: string) => string,
): string => {
  const labels: Record<StorageHealthStatus, string> = {
    ok: t('storageHealthStatusOk'),
    warning: t('storageHealthStatusWarning'),
    error: t('storageHealthStatusError'),
  };
  return labels[status];
};

export default function HelpPage() {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [diagState, setDiagState] = useState<
    'idle' | 'downloading' | 'downloaded' | 'copying' | 'copied' | 'failed'
  >('idle');
  const {
    health,
    loading: healthLoading,
    refresh: refreshHealth,
  } = useStorageHealth();

  const buildDateLabel = formatBuildDate(i18n.language);
  const versionInfoText = useMemo(
    () =>
      [
        `${t('versionInfoAppVersion')}: ${APP_VERSION}`,
        `${t('versionInfoBuildDate')}: ${BUILD_DATE_ISO}`,
      ].join('\n'),
    [t],
  );

  const handleCopyVersionInfo = useCallback(async () => {
    if (!('clipboard' in navigator)) {
      return;
    }

    try {
      await navigator.clipboard.writeText(versionInfoText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [versionInfoText]);

  const handleDownloadDiagnostics = useCallback(async () => {
    setDiagState('downloading');
    try {
      await downloadDiagnosticsBundle();
      setDiagState('downloaded');
    } catch {
      setDiagState('idle');
    }
  }, []);

  const handleCopyDiagnostics = useCallback(async () => {
    setDiagState('copying');
    const success = await copyDiagnosticsToClipboard();
    setDiagState(success ? 'copied' : 'failed');
  }, []);

  const quotaDisplay =
    health.storageEstimate.supported &&
    health.storageEstimate.usage !== undefined &&
    health.storageEstimate.quota !== undefined
      ? `${formatBytes(health.storageEstimate.usage)} / ${formatBytes(health.storageEstimate.quota)}`
      : t('storageHealthQuotaUnsupported');

  return (
    <section className="app__card legal-page help-page">
      <MarkdownRenderer className="legal-page__content" content={helpContent} />
      <section
        className="help-page__support"
        aria-label={t('supportSectionTitle')}
      >
        <h2 className="help-page__support-heading">
          {t('supportSectionTitle')}
        </h2>
        <section
          className="app__version-details app__version-details--support"
          aria-label={t('versionInfoTitle')}
        >
          <h3>{t('versionInfoTitle')}</h3>
          <dl>
            <div>
              <dt>{t('versionInfoAppVersion')}</dt>
              <dd>{APP_VERSION}</dd>
            </div>
            <div>
              <dt>{t('versionInfoBuildDate')}</dt>
              <dd title={BUILD_DATE_ISO}>{buildDateLabel}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="app__button"
            onClick={handleCopyVersionInfo}
          >
            {copied ? t('versionInfoCopied') : t('versionInfoCopy')}
          </button>
        </section>

        <section
          className="help-page__diagnostics"
          aria-label={t('diagnosticsTitle')}
        >
          <h3>{t('diagnosticsTitle')}</h3>

          <section
            className="help-page__storage-health"
            aria-label={t('storageHealthTitle')}
            data-testid="storage-health"
          >
            <h4>{t('storageHealthTitle')}</h4>
            {healthLoading ? (
              <p className="help-page__storage-loading">
                {t('storageHealthLoading')}
              </p>
            ) : (
              <>
                <dl className="help-page__storage-details">
                  <div>
                    <dt>{t('storageHealthIdb')}</dt>
                    <dd
                      data-testid="storage-health-idb"
                      data-status={
                        health.indexedDbAvailable ? 'available' : 'unavailable'
                      }
                    >
                      {health.indexedDbAvailable
                        ? t('storageHealthIdbAvailable')
                        : t('storageHealthIdbUnavailable')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('storageHealthQuota')}</dt>
                    <dd data-testid="storage-health-quota">{quotaDisplay}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd
                      data-testid="storage-health-status"
                      data-status={health.status}
                    >
                      {statusLabel(health.status, t)}
                    </dd>
                  </div>
                </dl>
                {health.status !== 'ok' && (
                  <output className="help-page__storage-guidance" role="status">
                    {health.message}
                  </output>
                )}
                <button
                  type="button"
                  className="app__button"
                  onClick={refreshHealth}
                >
                  {t('storageHealthRefresh')}
                </button>
              </>
            )}
          </section>

          <p className="help-page__diagnostics-description">
            {t('diagnosticsDescription')}
          </p>
          <div className="help-page__diagnostics-actions">
            <button
              type="button"
              className="app__button"
              onClick={handleDownloadDiagnostics}
              disabled={diagState === 'downloading'}
              data-testid="diagnostics-download"
            >
              {diagState === 'downloading'
                ? t('diagnosticsDownloading')
                : diagState === 'downloaded'
                  ? t('diagnosticsDownloaded')
                  : t('diagnosticsDownload')}
            </button>
            <button
              type="button"
              className="app__button"
              onClick={handleCopyDiagnostics}
              disabled={diagState === 'copying'}
              data-testid="diagnostics-copy"
            >
              {diagState === 'copied'
                ? t('diagnosticsCopied')
                : diagState === 'failed'
                  ? t('diagnosticsCopyFailed')
                  : t('diagnosticsCopy')}
            </button>
          </div>
        </section>
      </section>
    </section>
  );
}
