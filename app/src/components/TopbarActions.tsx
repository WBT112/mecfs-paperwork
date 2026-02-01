import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { emptyStringToNull } from '../lib/utils';
import { buildMailtoHref, getShareUrl } from '../lib/topbarActions';

const DEFAULT_FEEDBACK_EMAIL = 'info@mecfs-paperwork.de';

type ShareFallbackState = {
  url: string;
  copied: boolean;
};

const getClipboard = (): Clipboard | null =>
  'clipboard' in navigator ? navigator.clipboard : null;

const getShare = ():
  | ((data: { title: string; text: string; url: string }) => Promise<void>)
  | null =>
  typeof navigator.share === 'function'
    ? navigator.share.bind(navigator)
    : null;

const tryCopyShareUrl = async (url: string): Promise<boolean> => {
  const clipboard = getClipboard();
  if (!clipboard) {
    return false;
  }
  try {
    await clipboard.writeText(url);
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
  const share = getShare();
  if (!share) {
    return false;
  }
  try {
    await share({ title, text, url });
    return true;
  } catch {
    return false;
  }
};

export default memo(function TopbarActions() {
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

  const handleShare = useCallback(async () => {
    const origin = globalThis.location.origin;
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
  }, [pathname, t]);

  const handleCloseFallback = useCallback(() => {
    setShareFallback(null);
  }, []);

  const handleFocusInput = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      event.target.select();
    },
    [],
  );

  return (
    <fieldset
      className="app__topbar-actions"
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
        <dialog className="app__share-fallback" open aria-modal="true">
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
              onFocus={handleFocusInput}
            />
          </label>
          <div className="app__share-fallback-actions">
            <button
              type="button"
              className="app__button"
              onClick={handleCloseFallback}
            >
              {t('common.close')}
            </button>
          </div>
        </dialog>
      )}
    </fieldset>
  );
});
