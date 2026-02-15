import { useState } from 'react';
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
}: FormpackIntroGateProps) {
  const [isAccepted, setIsAccepted] = useState(false);

  return (
    <div className="formpack-intro-gate">
      <h4>{title}</h4>
      <div className="formpack-intro-gate__content">
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
        disabled={!isAccepted}
        onClick={onConfirm}
      >
        {startButtonLabel}
      </button>
    </div>
  );
}
