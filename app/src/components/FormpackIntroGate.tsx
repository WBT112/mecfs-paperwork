import { useMemo, useState, type UIEvent } from 'react';
import MarkdownRenderer from './Markdown/MarkdownRenderer';

type FormpackIntroGateProps = {
  title: string;
  body: string;
  checkboxLabel: string;
  startButtonLabel: string;
  onConfirm: () => void;
};

const SCROLL_BOTTOM_THRESHOLD_PX = 12;

export default function FormpackIntroGate({
  title,
  body,
  checkboxLabel,
  startButtonLabel,
  onConfirm,
}: FormpackIntroGateProps) {
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  const canContinue = useMemo(
    () => hasReachedBottom && isAccepted,
    [hasReachedBottom, isAccepted],
  );

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const remaining =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining <= SCROLL_BOTTOM_THRESHOLD_PX) {
      setHasReachedBottom(true);
    }
  };

  return (
    <div className="formpack-intro-gate">
      <h4>{title}</h4>
      <div className="formpack-intro-gate__content" onScroll={handleScroll}>
        <MarkdownRenderer content={body} />
      </div>
      <label className="formpack-intro-gate__checkbox">
        <input
          type="checkbox"
          checked={isAccepted}
          onChange={(event) => setIsAccepted(event.target.checked)}
        />
        {checkboxLabel}
      </label>
      <button
        type="button"
        className="app__button"
        disabled={!canContinue}
        onClick={onConfirm}
      >
        {startButtonLabel}
      </button>
    </div>
  );
}
