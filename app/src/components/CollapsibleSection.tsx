import React, { memo, useCallback, useMemo, useRef, useState } from 'react';

type CollapsibleSectionProps = {
  id: string;
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
};

export default memo(function CollapsibleSection(
  props: Readonly<CollapsibleSectionProps>,
) {
  const { id, title, defaultOpen = false, className, children } = props;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const ids = useMemo(
    () => ({
      toggle: `${id}-toggle`,
      content: `${id}-content`,
    }),
    [id],
  );
  const keyDownHandledRef = useRef(false);

  const handleClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        (event.code === 'Space' || event.code === 'Enter') &&
        !keyDownHandledRef.current
      ) {
        keyDownHandledRef.current = true;
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
    },
    [],
  );

  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!(event.code === 'Space' || event.code === 'Enter')) {
        return;
      }
      if (keyDownHandledRef.current) {
        keyDownHandledRef.current = false;
        return;
      }
      event.preventDefault();
      setIsOpen((prev) => !prev);
    },
    [],
  );

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
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
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
});
