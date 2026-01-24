import React, { useRef, useState } from 'react';

type CollapsibleSectionProps = {
  id: string;
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
};

export default function CollapsibleSection(
  props: Readonly<CollapsibleSectionProps>,
) {
  const { id, title, defaultOpen = false, className, children } = props;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const ids = {
    toggle: `${id}-toggle`,
    content: `${id}-content`,
  };
  const keyDownHandledRef = useRef(false);

  return (
    <section className={className}>
      <h3 className="collapsible-section__heading">
        <button
          type="button"
          id={ids.toggle}
          className="collapsible-section__toggle"
          aria-expanded={isOpen}
          aria-pressed={isOpen}
          aria-controls={ids.content}
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={(event) => {
            if (
              (event.code === 'Space' || event.code === 'Enter') &&
              !keyDownHandledRef.current
            ) {
              keyDownHandledRef.current = true;
              event.preventDefault();
              setIsOpen((prev) => !prev);
            }
          }}
          onKeyUp={(event) => {
            if (!(event.code === 'Space' || event.code === 'Enter')) return;
            if (keyDownHandledRef.current) {
              keyDownHandledRef.current = false;
              return;
            }
            event.preventDefault();
            setIsOpen((prev) => !prev);
          }}
        >
          <span className="collapsible-section__title">{title}</span>
          <span className="collapsible-section__icon" aria-hidden="true" />
        </button>
      </h3>
      <div
        id={ids.content}
        className="collapsible-section__content"
        aria-labelledby={ids.toggle}
        hidden={!isOpen}
      >
        {children}
      </div>
    </section>
  );
}
