type QuotaBannerProps = Readonly<{
  status: 'warning' | 'error';
  warningText: string;
  errorText: string;
  dismissLabel: string;
  onDismiss: () => void;
}>;

export default function QuotaBanner({
  status,
  warningText,
  errorText,
  dismissLabel,
  onDismiss,
}: QuotaBannerProps) {
  return (
    <div
      className={`formpack-detail__quota-banner formpack-detail__quota-banner--${status}`}
      role="alert"
    >
      <p>{status === 'error' ? errorText : warningText}</p>
      <button
        type="button"
        className="app__button"
        onClick={onDismiss}
        aria-label={dismissLabel}
      >
        {dismissLabel}
      </button>
    </div>
  );
}
