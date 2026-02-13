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
}: FormpackIntroModalProps) {
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
      <div
        className="formpack-intro-modal__content"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="formpack-intro-modal__header">
          <h4>{title}</h4>
          <button type="button" className="app__button" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        <div className="formpack-intro-modal__body">
          <MarkdownRenderer content={body} />
        </div>
      </div>
    </div>
  );
}
