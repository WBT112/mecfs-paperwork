import type { ReactNode } from 'react';
import CollapsibleSection from '../../../components/CollapsibleSection';

type SectionWithChildrenProps = {
  children: ReactNode;
  title: string;
};

type DocumentPreviewPanelProps = SectionWithChildrenProps & {
  isIntroGateVisible: boolean;
};

export default function DocumentPreviewPanel({
  title,
  children,
  isIntroGateVisible,
}: DocumentPreviewPanelProps) {
  if (isIntroGateVisible) {
    return null;
  }

  return (
    <CollapsibleSection
      id="formpack-document-preview"
      title={title}
      className="formpack-detail__section"
    >
      {children}
    </CollapsibleSection>
  );
}
