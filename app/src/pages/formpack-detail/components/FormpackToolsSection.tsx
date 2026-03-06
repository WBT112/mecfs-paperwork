import type { ComponentProps } from 'react';
import ImportPanel from './ImportPanel';
import RecordsPanel from './RecordsPanel';
import SnapshotsPanel from './SnapshotsPanel';

/**
 * Props required to render the tools column below the main form.
 */
export interface FormpackToolsSectionProps {
  heading: string;
  importPanelProps: ComponentProps<typeof ImportPanel>;
  recordsPanelProps: ComponentProps<typeof RecordsPanel>;
  snapshotsPanelProps: ComponentProps<typeof SnapshotsPanel>;
}

/**
 * Renders the records, import, and snapshot tools for the active formpack.
 *
 * @param props - Preconfigured props for each tools subsection.
 * @returns The tools section used on the detail page.
 */
export default function FormpackToolsSection({
  heading,
  importPanelProps,
  recordsPanelProps,
  snapshotsPanelProps,
}: Readonly<FormpackToolsSectionProps>) {
  return (
    <div className="formpack-detail__section formpack-detail__tools-section">
      <div className="formpack-detail__tools-panel">
        <h3 className="formpack-detail__tools-title">{heading}</h3>
        <div className="formpack-detail__tools">
          <RecordsPanel {...recordsPanelProps} />
          <ImportPanel {...importPanelProps} />
          <SnapshotsPanel {...snapshotsPanelProps} />
        </div>
      </div>
    </div>
  );
}
