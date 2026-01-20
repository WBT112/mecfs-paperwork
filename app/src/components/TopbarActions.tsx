import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { emptyStringToNull } from '../lib/utils';
import { buildMailtoHref, getShareUrl } from '../lib/topbarActions';

const DEFAULT_FEEDBACK_EMAIL = 'info@mecfs-paperwork.de';

type ShareFallbackState = {
  url: string;
  copied: boolean;
};

const tryCopyShareUrl = async (url: string): Promise<boolean> => {
  if (!navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
};

const tryNativeShare = async (
  url: string,
  title: string,
  text: string,
): Promise<boolean> => {
  if (!navigator.share) {
    return false;
  }
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch {
    return false;
  }
};

export default function TopbarActions() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [shareFallback, setShareFallback] = useState<ShareFallbackState | null>(
    null,
  );

  useEffect(() => {
    setShareFallback(null);
  }, [pathname]);

  const feedbackEmail =
    emptyStringToNull(import.meta.env.VITE_FEEDBACK_EMAIL) ??
    DEFAULT_FEEDBACK_EMAIL;
  const feedbackUnknown = t('feedbackUnknown');
  const appVersion =
    emptyStringToNull(import.meta.env.VITE_APP_VERSION) ?? feedbackUnknown;
  const appCommit =
    emptyStringToNull(import.meta.env.VITE_APP_COMMIT) ?? feedbackUnknown;

  const mailtoHref = useMemo(
    () =>
      buildMailtoHref({
        to: feedbackEmail,
        subject: t('feedbackSubject', { context: pathname }),
        intro: t('feedbackIntro'),
        debugLabel: t('feedbackDebugLabel'),
        fields: [
          { label: t('feedbackField.appVersion'), value: appVersion },
          { label: t('feedbackField.appCommit'), value: appCommit },
          { label: t('feedbackField.mode'), value: import.meta.env.MODE },
          { label: t('feedbackField.path'), value: pathname },
        ].filter((field) => field.value !== feedbackUnknown),
        prompt: t('feedbackPrompt'),
      }),
    [feedbackEmail, t, pathname, appVersion, appCommit, feedbackUnknown],
  );

  const handleShare = async () => {
    const origin = window.location.origin;
    const shareUrl = getShareUrl({ origin, pathname });

    const shared = await tryNativeShare(
      shareUrl,
      t('shareTitle'),
      t('shareText'),
    );
    if (shared) {
      return;
    }
    const copied = await tryCopyShareUrl(shareUrl);
    setShareFallback({ url: shareUrl, copied });
  };

  return (
    <div
      className="app__topbar-actions"
      role="group"
      aria-label={t('topbarActionsLabel')}
    >
      <a
        className="app__button app__topbar-action"
        href={mailtoHref}
        aria-label={t('feedbackAriaLabel')}
      >
        {t('feedbackAction')}
      </a>
      <button
        type="button"
        className="app__button app__topbar-action"
        onClick={handleShare}
        aria-label={t('shareAriaLabel')}
      >
        {t('shareAction')}
      </button>
      {shareFallback && (
        <div className="app__share-fallback" role="dialog">
          <div className="app__share-fallback-header">
            <strong>
              {shareFallback.copied
                ? t('shareCopiedLabel')
                : t('shareFallbackTitle')}
            </strong>
          </div>
          <p className="app__share-fallback-description">
            {shareFallback.copied
              ? t('shareCopiedDescription')
              : t('shareCopyInstructions')}
          </p>
          <label className="app__share-fallback-label">
            <span>{t('shareUrlLabel')}</span>
            <input
              type="text"
              readOnly
              value={shareFallback.url}
              onFocus={(event) => event.target.select()}
            />
          </label>
          <div className="app__share-fallback-actions">
            <button
              type="button"
              className="app__button"
              onClick={() => setShareFallback(null)}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
