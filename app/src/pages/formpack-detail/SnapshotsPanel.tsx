import CollapsibleSection from '../../components/CollapsibleSection';
import type { SnapshotEntry } from '../../storage/types';

type SnapshotsPanelLabels = {
  title: string;
  snapshotsListLabel: string;
  snapshotUntitled: string;
  snapshotRestore: string;
  snapshotsLoading: string;
  snapshotsEmpty: string;
  snapshotsNoRecord: string;
  snapshotCreate: string;
  snapshotsClearAll: string;
};

type SnapshotsPanelProps = Readonly<{
  labels: SnapshotsPanelLabels;
  snapshots: SnapshotEntry[];
  activeRecordExists: boolean;
  isSnapshotsLoading: boolean;
  storageUnavailable: boolean;
  formatCreatedAt: (timestamp: string) => string;
  onCreateSnapshot: () => void;
  onClearSnapshots: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
}>;

export default function SnapshotsPanel({
  labels,
  snapshots,
  activeRecordExists,
  isSnapshotsLoading,
  storageUnavailable,
  formatCreatedAt,
  onCreateSnapshot,
  onClearSnapshots,
  onRestoreSnapshot,
}: SnapshotsPanelProps) {
  return (
    <CollapsibleSection
      id="formpack-snapshots"
      title={labels.title}
      className="formpack-detail__section"
    >
      {activeRecordExists ? (
        <>
          <div className="formpack-snapshots__actions">
            <button
              type="button"
              className="app__button app__icon-button"
              onClick={onCreateSnapshot}
              disabled={storageUnavailable}
              aria-label={labels.snapshotCreate}
              title={labels.snapshotCreate}
            >
              +
            </button>
            <button
              type="button"
              className="app__button app__icon-button"
              onClick={onClearSnapshots}
              disabled={storageUnavailable || snapshots.length === 0}
              aria-label={labels.snapshotsClearAll}
              title={labels.snapshotsClearAll}
            >
              🗑
            </button>
          </div>
          {snapshots.length ? (
            <ul
              className="formpack-snapshots__list"
              aria-label={labels.snapshotsListLabel}
            >
              {snapshots.map((snapshot) => (
                <li key={snapshot.id} className="formpack-snapshots__item">
                  <div>
                    <p className="formpack-snapshots__title">
                      {snapshot.label ?? labels.snapshotUntitled}
                    </p>
                    <p className="formpack-snapshots__meta">
                      {formatCreatedAt(snapshot.createdAt)}
                    </p>
                  </div>
                  <div className="formpack-snapshots__item-actions">
                    <button
                      type="button"
                      className="app__button"
                      onClick={() => onRestoreSnapshot(snapshot.id)}
                      disabled={storageUnavailable}
                    >
                      {labels.snapshotRestore}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="formpack-snapshots__empty">
              {isSnapshotsLoading
                ? labels.snapshotsLoading
                : labels.snapshotsEmpty}
            </p>
          )}
        </>
      ) : (
        <p className="formpack-snapshots__empty">{labels.snapshotsNoRecord}</p>
      )}
    </CollapsibleSection>
  );
}
