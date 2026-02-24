import CollapsibleSection from '../../components/CollapsibleSection';
import type { RecordEntry } from '../../storage/types';

type RecordsPanelLabels = {
  title: string;
  recordNew: string;
  recordsListLabel: string;
  recordUntitled: string;
  recordLoad: string;
  recordDelete: string;
  recordActive: string;
  recordsLoading: string;
  recordsEmpty: string;
};

type RecordsPanelProps = {
  labels: RecordsPanelLabels;
  records: RecordEntry[];
  activeRecordId: string | null;
  isRecordsLoading: boolean;
  storageUnavailable: boolean;
  storageErrorMessage: string | null;
  formatUpdatedAt: (timestamp: string) => string;
  onCreateRecord: () => void;
  onLoadRecord: (recordId: string) => void;
  onDeleteRecord: (record: RecordEntry) => void;
};

export default function RecordsPanel({
  labels,
  records,
  activeRecordId,
  isRecordsLoading,
  storageUnavailable,
  storageErrorMessage,
  formatUpdatedAt,
  onCreateRecord,
  onLoadRecord,
  onDeleteRecord,
}: RecordsPanelProps) {
  return (
    <CollapsibleSection
      id="formpack-records"
      title={labels.title}
      className="formpack-detail__section"
    >
      {storageErrorMessage && (
        <p className="app__error">{storageErrorMessage}</p>
      )}
      {records.length ? (
        <>
          <div className="formpack-records__actions">
            <button
              type="button"
              className="app__button app__icon-button"
              onClick={onCreateRecord}
              disabled={storageUnavailable}
              aria-label={labels.recordNew}
              title={labels.recordNew}
            >
              +
            </button>
          </div>
          <ul
            className="formpack-records__list"
            aria-label={labels.recordsListLabel}
          >
            {records.map((record) => {
              const isActive = activeRecordId === record.id;
              return (
                <li
                  key={record.id}
                  className={`formpack-records__item${
                    isActive ? ' formpack-records__item--active' : ''
                  }`}
                >
                  <div>
                    <p className="formpack-records__title">
                      {record.title ?? labels.recordUntitled}
                    </p>
                    <p className="formpack-records__meta">
                      {formatUpdatedAt(record.updatedAt)}
                    </p>
                  </div>
                  <div className="formpack-records__item-actions">
                    <button
                      type="button"
                      className="app__button"
                      onClick={() => onLoadRecord(record.id)}
                      disabled={storageUnavailable}
                    >
                      {labels.recordLoad}
                    </button>
                    {!isActive && (
                      <button
                        type="button"
                        className="app__button app__icon-button"
                        onClick={() => onDeleteRecord(record)}
                        disabled={storageUnavailable}
                        aria-label={labels.recordDelete}
                        title={labels.recordDelete}
                      >
                        🗑
                      </button>
                    )}
                    {isActive && (
                      <span className="formpack-records__badge">
                        {labels.recordActive}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div>
          <p className="formpack-records__empty">
            {isRecordsLoading ? labels.recordsLoading : labels.recordsEmpty}
          </p>
          <div className="formpack-records__actions">
            <button
              type="button"
              className="app__button app__icon-button"
              onClick={onCreateRecord}
              disabled={storageUnavailable}
              aria-label={labels.recordNew}
              title={labels.recordNew}
            >
              +
            </button>
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
