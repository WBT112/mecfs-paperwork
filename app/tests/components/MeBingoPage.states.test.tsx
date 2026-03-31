import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MeBingoGameState,
  MeBingoStats,
} from '../../src/features/games/me-bingo/types';
import i18n from '../../src/i18n';
import MeBingoPage from '../../src/features/games/pages/MeBingoPage';
import { TestRouter } from '../setup/testRouter';

const mockUseMeBingoGame =
  vi.fn<
    () => ReturnType<
      typeof import('../../src/features/games/me-bingo/hooks/useMeBingoGame').useMeBingoGame
    >
  >();

vi.mock('../../src/features/games/me-bingo/hooks/useMeBingoGame', () => ({
  useMeBingoGame: () => mockUseMeBingoGame(),
}));

vi.mock('../../src/i18n/useLocale', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

vi.mock('../../src/features/games/me-bingo/data/content', () => ({
  ME_BINGO_FREE_FIELD_ID: 'free-field',
  getMeBingoPromptLabel: (entryId: string) => `Prompt ${entryId}`,
}));

const noop = vi.fn();

const baseStats: MeBingoStats = {
  playedRounds: 2,
  bingoCount: 1,
  fullCardCount: 0,
  lastStatus: 'bingo',
  bestLineCount: 2,
};

const baseGame: MeBingoGameState = {
  board: [
    {
      cellId: 'cell-0',
      entryId: 'free-field',
      isFree: true,
      isMarked: true,
    },
    {
      cellId: 'cell-1',
      entryId: 'marked-entry',
      isFree: false,
      isMarked: true,
    },
    {
      cellId: 'cell-2',
      entryId: 'open-entry',
      isFree: false,
      isMarked: false,
    },
  ],
  lineIndexes: [[0, 1, 2, 3, 4]],
  lineCount: 2,
  markedCount: 8,
  status: 'bingo',
  isFullCard: false,
  startedAt: 100,
  bingoAt: null,
  fullCardAt: null,
};

const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <TestRouter initialEntries={['/games/me-bingo']}>
        <MeBingoPage />
      </TestRouter>
    </I18nextProvider>,
  );

describe('MeBingoPage states', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    mockUseMeBingoGame.mockReturnValue({
      game: baseGame,
      stats: baseStats,
      announcement: 'bingo',
      startGame: noop,
      resetGame: noop,
      drawNewCard: noop,
      toggleCell: noop,
    });
  });

  it('renders the many-lines bingo state without a play-time row when no timestamp is available', () => {
    renderPage();

    expect(
      screen.getByRole('heading', {
        name: 'A lot of classics in a single round.',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Play time/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /ME\/CFS\? Never heard of it\. Row 1, column 1\. Free field, already marked\./i,
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: /Prompt marked-entry\. Row 1, column 2\. Marked\./i,
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', {
        name: /Prompt open-entry\. Row 1, column 3\. Not marked\./i,
      }),
    ).toBeEnabled();
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });
});
