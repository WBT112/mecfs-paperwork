import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecordsPanel from '../../../src/pages/formpack-detail/RecordsPanel';

const SECTION_TITLE = 'Records';

const createProps = () => ({
  labels: {
    title: SECTION_TITLE,
    recordNew: 'New record',
    recordsListLabel: 'Record list',
    recordUntitled: 'Untitled record',
    recordLoad: 'Load',
    recordDelete: 'Delete',
    recordActive: 'Active',
    recordsLoading: 'Loading records',
    recordsEmpty: 'No records',
  },
  records: [
    {
      id: 'record-1',
      formpackId: 'notfallpass',
      locale: 'de' as const,
      data: {},
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    },
  ],
  activeRecordId: null as string | null,
  isRecordsLoading: false,
  storageUnavailable: false,
  storageErrorMessage: null as string | null,
  storageRecoveryActionLabel: undefined as string | undefined,
  formatUpdatedAt: (value: string) => value,
  onStorageRecoveryAction: undefined as (() => void) | undefined,
  onCreateRecord: vi.fn(),
  onLoadRecord: vi.fn(),
  onDeleteRecord: vi.fn(),
});

describe('RecordsPanel', () => {
  it('renders the untitled fallback when a record title is missing', async () => {
    const props = createProps();

    render(<RecordsPanel {...props} />);

    await userEvent.click(screen.getByRole('button', { name: SECTION_TITLE }));

    expect(screen.getByText('Untitled record')).toBeInTheDocument();
  });
});
