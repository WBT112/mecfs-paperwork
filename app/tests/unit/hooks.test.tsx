import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { updateRecord as updateRecordType } from '../../src/storage/records';
import type { RecordEntry } from '../../src/storage/types';

type UpdateRecord = typeof updateRecordType;
type UpdateRecordArgs = Parameters<UpdateRecord>;
type UpdateRecordReturn = ReturnType<UpdateRecord>;

// Mock updateRecord from storage/records used by the autosave hook
const mockUpdate = vi.fn<UpdateRecord>();
vi.mock('../../src/storage/records', () => ({
  updateRecord: (...args: UpdateRecordArgs) =>
    mockUpdate(...args) as UpdateRecordReturn,
}));

import { useAutosaveRecord } from '../../src/storage/hooks';

function TestComponent({
  recordId,
  formData,
  baselineData,
  delay = 50,
  onSaved,
  onError,
}: {
  recordId: string | null;
  formData: Record<string, unknown>;
  baselineData: Record<string, unknown> | null;
  delay?: number;
  onSaved?: (r: unknown) => void;
  onError?: (c: unknown) => void;
}) {
  const { markAsSaved } = useAutosaveRecord(
    recordId,
    formData,
    'de',
    baselineData,
    { delay, onSaved, onError },
  );

  return (
    <div>
      <button data-testid="mark" onClick={() => markAsSaved(formData)}>
        mark
      </button>
    </div>
  );
}

describe('useAutosaveRecord', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUpdate.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls updateRecord after delay and triggers onSaved', async () => {
    const saved: RecordEntry = {
      id: 'r1',
      formpackId: 'doctor-letter',
      title: undefined,
      locale: 'de',
      data: { a: 1 },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    mockUpdate.mockResolvedValue(saved);
    const onSaved = vi.fn();

    render(
      <TestComponent
        recordId="rec-1"
        formData={{ a: 1 }}
        baselineData={{}}
        delay={50}
        onSaved={onSaved}
      />,
    );

    await act(async () => {
      // advance enough time for autosave to trigger
      vi.advanceTimersByTime(60);
      // allow pending promises to resolve
      await Promise.resolve();
    });

    expect(mockUpdate).toHaveBeenCalledWith('rec-1', {
      data: { a: 1 },
      locale: 'de',
    });
    // onSaved should be called with the resolved record
    expect(onSaved).toHaveBeenCalled();
  });

  it('markAsSaved prevents autosave from running', async () => {
    const saved: RecordEntry = {
      id: 'r2',
      formpackId: 'doctor-letter',
      title: undefined,
      locale: 'de',
      data: { b: 2 },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    mockUpdate.mockResolvedValue(saved);
    const onSaved = vi.fn();

    render(
      <TestComponent
        recordId="rec-2"
        formData={{ b: 2 }}
        baselineData={{}}
        delay={50}
        onSaved={onSaved}
      />,
    );

    // call markAsSaved immediately
    const btn = screen.getByTestId('mark');
    await act(async () => {
      fireEvent.click(btn);
    });

    await act(async () => {
      vi.advanceTimersByTime(60);
      await Promise.resolve();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
