import React, { useMemo, useState } from 'react';

type CollapsibleSectionProps = {
  id: string;
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
};

export default function CollapsibleSection({
  id,
  title,
  defaultOpen = false,
  className,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const ids = useMemo(
    () => ({
      toggle: `${id}-toggle`,
      content: `${id}-content`,
    }),
    [id],
  );

  return (
    <section className={className}>
      <h3 className="collapsible-section__heading">
        <button
          type="button"
          id={ids.toggle}
          className="collapsible-section__toggle"
          aria-expanded={isOpen}
          aria-controls={ids.content}
          onClick={() => setIsOpen((prev) => !prev)}
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
