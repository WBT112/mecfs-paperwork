import type { SectionWithChildrenProps } from './types';

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
