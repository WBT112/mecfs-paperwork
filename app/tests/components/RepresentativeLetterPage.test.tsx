import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RepresentativeLetterPage from '../../src/features/representative-letter/pages/RepresentativeLetterPage';
import {
  REPRESENTATIVE_LETTER_SESSION_KEY,
  readRepresentativeLetterState,
} from '../../src/features/representative-letter/sessionState';
import { TestRouter } from '../setup/testRouter';

const START_BUTTON = 'representativeLetter.start';
const LONG_BODY_BUTTON = 'representativeLetter.longBody';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../src/i18n/useLocale', () => ({
  useLocale: () => ({ locale: 'de' }),
}));

const renderPage = () =>
  render(
    <TestRouter initialEntries={['/tools/representative-letter']}>
      <Routes>
        <Route
          path="/tools/representative-letter"
          element={<RepresentativeLetterPage />}
        />
        <Route path="/formpacks" element={<div>Overview</div>} />
      </Routes>
    </TestRouter>,
  );

describe('RepresentativeLetterPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('shows the information view and optional background', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'representativeLetter.title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('representativeLetter.processCopy')).toBeVisible();

    await user.click(
      screen.getByRole('button', {
        name: 'representativeLetter.backgroundTitle',
      }),
    );
    expect(
      screen.getByText('representativeLetter.backgroundText'),
    ).toBeVisible();
  });

  it('renders exactly the three selectable plain-text outputs without export actions', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: START_BUTTON }));

    const recipient = screen.getByLabelText(
      'representativeLetter.recipientLabel',
    );
    const subject = screen.getByLabelText('representativeLetter.subjectLabel');
    const body = screen.getByLabelText('representativeLetter.bodyLabel');
    expect(recipient).toHaveAttribute('readonly');
    expect(subject).toHaveAttribute('readonly');
    expect(body).toHaveAttribute('readonly');
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
    expect(screen.queryByRole('link', { name: /download|export/i })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /download|export/i }),
    ).toBeNull();
  });

  it('retains the current view and body length across a same-tab remount', async () => {
    const user = userEvent.setup();
    const firstRender = renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));
    await user.click(screen.getByRole('button', { name: LONG_BODY_BUTTON }));

    await waitFor(() => {
      expect(readRepresentativeLetterState().bodyLength).toBe('long');
    });
    firstRender.unmount();
    renderPage();

    expect(
      screen.getByRole('button', { name: 'representativeLetter.letterTab' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: LONG_BODY_BUTTON }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('supports both view and body-length controls', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole('button', { name: 'representativeLetter.letterTab' }),
    );
    await user.click(screen.getByRole('button', { name: LONG_BODY_BUTTON }));
    await user.click(
      screen.getByRole('button', { name: 'representativeLetter.shortBody' }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'representativeLetter.informationTab',
      }),
    );

    expect(screen.getByText('representativeLetter.processTitle')).toBeVisible();
    expect(readRepresentativeLetterState().bodyLength).toBe('short');
  });

  it('resets only the tool state and leaves unrelated session data intact', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem('unrelated', 'keep');
    renderPage();
    await user.click(screen.getByRole('button', { name: START_BUTTON }));
    await user.click(
      screen.getByRole('button', { name: 'representativeLetter.reset' }),
    );

    expect(screen.getByText('representativeLetter.processTitle')).toBeVisible();
    expect(
      window.sessionStorage.getItem(REPRESENTATIVE_LETTER_SESSION_KEY),
    ).toBeNull();
    expect(window.sessionStorage.getItem('unrelated')).toBe('keep');
  });

  it('links back to the support overview', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole('link', { name: 'representativeLetter.backToOverview' }),
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });
});
