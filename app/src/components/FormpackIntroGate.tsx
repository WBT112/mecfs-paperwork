import { useId, useState } from 'react';
import MarkdownRenderer from './Markdown/MarkdownRenderer';

type FormpackIntroGateProps = {
  title: string;
  body: string;
  checkboxLabel: string;
  startButtonLabel: string;
  onConfirm: () => void;
};

export default function FormpackIntroGate({
  title,
  body,
  checkboxLabel,
  startButtonLabel,
  onConfirm,
}: Readonly<FormpackIntroGateProps>) {
  const [isAccepted, setIsAccepted] = useState(false);
  const headingId = useId();
  const contentId = useId();
  const checkboxId = useId();

  return (
    <div className="formpack-intro-gate">
      <h4 id={headingId}>{title}</h4>
      <div
        id={contentId}
        className="formpack-intro-gate__content"
        aria-labelledby={headingId}
      >
        <MarkdownRenderer content={body} />
      </div>
      <label className="formpack-intro-gate__checkbox" htmlFor={checkboxId}>
        <input
          id={checkboxId}
          type="checkbox"
          checked={isAccepted}
          onChange={(event) => setIsAccepted(event.target.checked)}
        />
        {checkboxLabel}
      </label>
      <button
        type="button"
        className="app__button"
        disabled={!isAccepted}
        onClick={onConfirm}
      >
        {startButtonLabel}
      </button>
    </div>
  );
}
