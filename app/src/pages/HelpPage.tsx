import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from '../components/Markdown/MarkdownRenderer';
import helpDe from '../content/help/help.md?raw';
import helpEn from '../content/help/help.en.md?raw';
import { APP_VERSION, BUILD_DATE_ISO, formatBuildDate } from '../lib/version';
import {
  downloadDiagnosticsBundle,
  copyDiagnosticsToClipboard,
  resetAllLocalData,
  type ServiceWorkerInfo,
  type StorageHealthStatus,
  useStorageHealth,
} from '../lib/diagnostics';

type EncryptionStatus = 'encrypted' | 'not_encrypted' | 'unknown';

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

const getQuotaDisplay = (
  estimate: { supported: boolean; usage?: number; quota?: number },
  fallback: string,
): string => {
  if (
    estimate.supported &&
    estimate.usage !== undefined &&
    estimate.quota !== undefined
  ) {
    return `${formatBytes(estimate.usage)} / ${formatBytes(estimate.quota)}`;
  }
  return fallback;
};

const defaultSwInfo: ServiceWorkerInfo = {
  supported: false,
  registered: false,
};

const fetchSwInfo = async (): Promise<ServiceWorkerInfo> => {
  if (!('serviceWorker' in navigator)) {
    return { supported: false, registered: false };
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return { supported: true, registered: false };
    const worker = reg.active ?? reg.waiting ?? reg.installing;
    return {
      supported: true,
      registered: true,
      scope: reg.scope,
      state: worker?.state,
    };
  } catch {
    return { supported: true, registered: false };
  }
};

const getEncryptionDataStatus = (status: EncryptionStatus): string => {
  switch (status) {
    case 'encrypted':
      return 'available';
    case 'not_encrypted':
      return 'warning';
    default:
      return 'unknown';
  }
};

const getServiceWorkerStateLabel = (
  info: ServiceWorkerInfo,
  t: (key: string) => string,
): string => {
  if (!info.registered) {
    return t('swStatusNotRegistered');
  }

  const labels: Record<string, string> = {
    activated: t('swStatusStateActivated'),
    activating: t('swStatusStateActivating'),
    installed: t('swStatusStateInstalled'),
    installing: t('swStatusStateInstalling'),
    redundant: t('swStatusStateRedundant'),
  };

  if (!info.state) {
    return t('swStatusRegistered');
  }

  return labels[info.state] ?? info.state;
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

  const [resetting, setResetting] = useState(false);
  const [swInfo, setSwInfo] = useState<ServiceWorkerInfo>(defaultSwInfo);

  useEffect(() => {
    let cancelled = false;
    fetchSwInfo().then(
      (info) => {
        if (!cancelled) setSwInfo(info);
      },
      () => {
        /* ignore */
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleResetAllData = useCallback(async () => {
    const confirmed = globalThis.confirm(t('resetAllConfirm'));
    if (!confirmed) return;
    setResetting(true);
    try {
      await resetAllLocalData();
    } catch {
      setResetting(false);
    }
  }, [t]);

  const quotaDisplay = getQuotaDisplay(
    health.storageEstimate,
    t('storageHealthQuotaUnsupported'),
  );

  const downloadLabel =
    (
      {
        downloading: t('diagnosticsDownloading'),
        downloaded: t('diagnosticsDownloaded'),
      } as Record<string, string>
    )[diagState] ?? t('diagnosticsDownload');

  const copyLabel =
    (
      {
        copied: t('diagnosticsCopied'),
        failed: t('diagnosticsCopyFailed'),
      } as Record<string, string>
    )[diagState] ?? t('diagnosticsCopy');

  const idbStatusLabel = health.indexedDbAvailable
    ? t('storageHealthIdbAvailable')
    : t('storageHealthIdbUnavailable');

  const idbDataStatus = health.indexedDbAvailable ? 'available' : 'unavailable';

  const encryptionAtRest =
    health.encryptionAtRest ??
    ({
      status: 'unknown',
      keyCookiePresent: false,
      keyCookieContext: 'unknown',
      secureFlagVerifiable: false,
    } as const);

  const encryptionStatusLabel = (
    {
      encrypted: t('storageHealthEncryptionEncrypted'),
      not_encrypted: t('storageHealthEncryptionNotEncrypted'),
      unknown: t('storageHealthEncryptionUnknown'),
    } as const
  )[encryptionAtRest.status];

  const encryptionDataStatus = getEncryptionDataStatus(encryptionAtRest.status);

  const keyCookieLabel = encryptionAtRest.keyCookiePresent
    ? t('storageHealthCookiePresent')
    : t('storageHealthCookieMissing');

  const keyCookieContextLabel = (
    {
      https: t('storageHealthCookieSecurityHttps'),
      'non-https': t('storageHealthCookieSecurityNonHttps'),
      unknown: t('storageHealthCookieSecurityUnknown'),
    } as const
  )[encryptionAtRest.keyCookieContext];

  const swStateLabel = getServiceWorkerStateLabel(swInfo, t);

  const versionCopyLabel = copied
    ? t('versionInfoCopied')
    : t('versionInfoCopy');

  const helpContent = i18n.language === 'en' ? helpEn : helpDe;

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
            {versionCopyLabel}
          </button>
        </section>

        <section
          className="help-page__diagnostics"
          aria-label={t('diagnosticsTitle')}
        >
          <h3>{t('diagnosticsTitle')}</h3>

          <section
            className="help-page__storage-health"
            aria-label={t('swStatusTitle')}
            data-testid="sw-status"
          >
            <h4>{t('swStatusTitle')}</h4>
            <dl className="help-page__storage-details">
              <div>
                <dt>API</dt>
                <dd
                  data-testid="sw-status-supported"
                  data-status={swInfo.supported ? 'available' : 'unavailable'}
                >
                  {swInfo.supported
                    ? t('swStatusSupported')
                    : t('swStatusNotSupported')}
                </dd>
              </div>
              {swInfo.supported && (
                <div>
                  <dt>{t('swStatusState')}</dt>
                  <dd
                    data-testid="sw-status-state"
                    data-status={
                      swInfo.registered ? 'available' : 'unavailable'
                    }
                  >
                    {swStateLabel}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section
            className="help-page__storage-health"
            aria-label={t('storageHealthTitle')}
            aria-busy={healthLoading}
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
                      data-status={idbDataStatus}
                    >
                      {idbStatusLabel}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('storageHealthEncryption')}</dt>
                    <dd
                      data-testid="storage-health-encryption"
                      data-status={encryptionDataStatus}
                    >
                      {encryptionStatusLabel}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('storageHealthKeyCookie')}</dt>
                    <dd
                      data-testid="storage-health-key-cookie"
                      data-status={
                        encryptionAtRest.keyCookiePresent
                          ? 'available'
                          : 'unavailable'
                      }
                    >
                      {keyCookieLabel}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('storageHealthCookieSecurity')}</dt>
                    <dd
                      data-testid="storage-health-cookie-security"
                      data-status={encryptionAtRest.keyCookieContext}
                    >
                      {keyCookieContextLabel}
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
                  <output className="help-page__storage-guidance">
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
              {downloadLabel}
            </button>
            <button
              type="button"
              className="app__button"
              onClick={handleCopyDiagnostics}
              disabled={diagState === 'copying'}
              data-testid="diagnostics-copy"
            >
              {copyLabel}
            </button>
          </div>

          <section
            className="help-page__danger-zone"
            aria-label={t('resetAllTitle')}
            data-testid="danger-zone"
          >
            <h4>{t('resetAllTitle')}</h4>
            <p className="help-page__danger-zone-description">
              {t('resetAllDescription')}
            </p>
            <button
              type="button"
              className="app__button app__button--danger"
              onClick={handleResetAllData}
              disabled={resetting}
              data-testid="reset-all-data"
            >
              {resetting ? t('resetAllInProgress') : t('resetAllButton')}
            </button>
          </section>
        </section>
      </section>
    </section>
  );
}
