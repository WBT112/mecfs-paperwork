import { render, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import './formpackListPage.mockSetup';
import FormpackListPage from '../../src/pages/FormpackListPage';
import { TestRouter } from '../setup/testRouter';
import { listFormpacks } from '../../src/formpacks/loader';

vi.mock('../../src/formpacks/loader', () => ({
  listFormpacks: vi.fn(),
}));

describe('FormpackListPage Error State', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the translated fallback when formpacks fail to load', async () => {
    const errorMessage = 'Failed to load formpacks';
    vi.mocked(listFormpacks).mockRejectedValue(new Error(errorMessage));

    render(
      <TestRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FormpackListPage />} />
        </Routes>
      </TestRouter>,
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('formpackLoading')).not.toBeInTheDocument();
    });

    // Check for fallback message
    expect(
      await screen.findByText('formpackListErrorFallback'),
    ).toBeInTheDocument();
    expect(screen.getByText('formpackListTitle')).toBeInTheDocument();
  });

  it('uses translated fallback when loader rejects with a non-Error value', async () => {
    vi.mocked(listFormpacks).mockRejectedValue('failed');

    render(
      <TestRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FormpackListPage />} />
        </Routes>
      </TestRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText('formpackLoading')).not.toBeInTheDocument();
    });

    expect(screen.getByText('formpackListErrorFallback')).toBeInTheDocument();
  });
});
