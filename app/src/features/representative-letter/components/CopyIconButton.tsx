type CopyIconButtonProps = {
  label: string;
  describedBy: string;
  disabled: boolean;
  onClick: () => void;
};

/**
 * Renders the shared accessible copy action used by representative-letter fields.
 *
 * @param props - Accessible label, status relation, state, and click handler.
 * @returns A touch-sized icon button with matching tooltip and accessible name.
 */
export default function CopyIconButton({
  label,
  describedBy,
  disabled,
  onClick,
}: CopyIconButtonProps) {
  return (
    <button
      type="button"
      className="app__button app__icon-button"
      aria-label={label}
      aria-describedby={describedBy}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="6.5"
          y="6.5"
          width="10"
          height="10"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </button>
  );
}
