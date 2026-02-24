import CollapsibleSection from '../../components/CollapsibleSection';
import type { SectionWithChildrenProps } from './types';

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
