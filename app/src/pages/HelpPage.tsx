import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from '../components/Markdown/MarkdownRenderer';
import helpContent from '../content/help/help.md?raw';
import { APP_VERSION, BUILD_DATE_ISO, formatBuildDate } from '../lib/version';

export default function HelpPage() {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
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

  return (
    <section className="app__card legal-page help-page">
      <MarkdownRenderer className="legal-page__content" content={helpContent} />
      <section
        className="app__version-details"
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
    </section>
  );
}
