import type { ReactNode } from 'react';

type SectionWithChildrenProps = {
  children: ReactNode;
  title: string;
};

export default function FormContentSection({
  title,
  children,
}: Readonly<SectionWithChildrenProps>) {
  return (
    <div className="formpack-detail__section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
