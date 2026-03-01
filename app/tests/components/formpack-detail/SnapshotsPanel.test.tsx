import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SnapshotsPanel from '../../../src/pages/formpack-detail/SnapshotsPanel';

const SECTION_TITLE = 'Snapshots';

const createProps = () => ({
  labels: {
    title: SECTION_TITLE,
    snapshotsListLabel: 'Snapshot list',
    snapshotUntitled: 'Untitled snapshot',
    snapshotRestore: 'Restore',
    snapshotsLoading: 'Loading snapshots',
    snapshotsEmpty: 'No snapshots available',
    snapshotsNoRecord: 'No active record',
    snapshotCreate: 'Create snapshot',
    snapshotsClearAll: 'Clear snapshots',
  },
  snapshots: [] as Array<{
    id: string;
    recordId: string;
    data: Record<string, unknown>;
    createdAt: string;
    label?: string;
  }>,
  activeRecordExists: true,
  isSnapshotsLoading: false,
  storageUnavailable: false,
  formatCreatedAt: (value: string) => value,
  onCreateSnapshot: vi.fn(),
  onClearSnapshots: vi.fn(),
  onRestoreSnapshot: vi.fn(),
});

describe('SnapshotsPanel', () => {
  it('renders the untitled fallback when snapshot label is missing', async () => {
    const props = createProps();
    props.snapshots = [
      {
        id: 'snap-1',
        recordId: 'record-1',
        data: {},
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    render(<SnapshotsPanel {...props} />);

    await userEvent.click(screen.getByRole('button', { name: SECTION_TITLE }));

    expect(screen.getByText('Untitled snapshot')).toBeInTheDocument();
  });

  it('shows the loading message while snapshots are being loaded', async () => {
    const props = createProps();
    props.isSnapshotsLoading = true;

    render(<SnapshotsPanel {...props} />);

    await userEvent.click(screen.getByRole('button', { name: SECTION_TITLE }));

    expect(screen.getByText('Loading snapshots')).toBeInTheDocument();
  });
});
