import { useId } from 'react';
import MarkdownRenderer from './Markdown/MarkdownRenderer';

type FormpackIntroModalProps = {
  isOpen: boolean;
  title: string;
  body: string;
  closeLabel: string;
  onClose: () => void;
};

export default function FormpackIntroModal({
  isOpen,
  title,
  body,
  closeLabel,
  onClose,
}: Readonly<FormpackIntroModalProps>) {
  const headingId = useId();
  const bodyId = useId();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="formpack-intro-modal">
      <button
        type="button"
        className="formpack-intro-modal__backdrop"
        onClick={onClose}
        aria-label={closeLabel}
      />
      <dialog
        open
        className="formpack-intro-modal__content"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
      >
        <div className="formpack-intro-modal__header">
          <h4 id={headingId}>{title}</h4>
          <button type="button" className="app__button" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        <div id={bodyId} className="formpack-intro-modal__body">
          <MarkdownRenderer content={body} />
        </div>
      </dialog>
    </div>
  );
}
