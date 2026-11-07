import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import GamesHubPage from '../../src/features/games/pages/GamesHubPage';
import MeBingoPage from '../../src/features/games/pages/MeBingoPage';
import { TestRouter } from '../setup/testRouter';

const ME_BINGO_ROUTE = '/games/me-bingo';
const START_GAME_LABEL = 'Start game';

const renderGamesPages = (initialEntry: string) =>
  render(
    <I18nextProvider i18n={i18n}>
      <TestRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/games" element={<GamesHubPage />} />
          <Route path={ME_BINGO_ROUTE} element={<MeBingoPage />} />
        </Routes>
      </TestRouter>
    </I18nextProvider>,
  );

describe('Games pages', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('renders the Games hub with only ME Bingo and no availability badge', () => {
    renderGamesPages('/games');

    expect(screen.getByRole('heading', { name: 'Games' })).toBeInTheDocument();
    const gameLinks = screen.getAllByRole('link');
    expect(gameLinks).toHaveLength(1);
    expect(gameLinks[0]).toHaveAccessibleName(/me bingo/i);
    expect(gameLinks[0]).toHaveAttribute('href', ME_BINGO_ROUTE);
    expect(screen.queryByText(/playable/i)).not.toBeInTheDocument();
  });

  it('places the ME Bingo start action before the explanatory copy', () => {
    renderGamesPages(ME_BINGO_ROUTE);

    const introPanel = screen
      .getByRole('button', { name: START_GAME_LABEL })
      .closest('section');
    expect(introPanel).toBeTruthy();
    expect(introPanel?.firstElementChild).toBe(
      screen.getByRole('button', { name: START_GAME_LABEL }),
    );
  });

  it('plays through the main ME Bingo flow including reset, full card, and new card', async () => {
    const user = userEvent.setup();
    const { container } = renderGamesPages(ME_BINGO_ROUTE);

    await user.click(screen.getByRole('button', { name: START_GAME_LABEL }));

    expect(screen.getByText('1/25')).toBeInTheDocument();

    const boardButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-testid^="cell-"]'),
    );
    const interactiveButtons = boardButtons.filter(
      (button) => !button.disabled,
    );
    const [firstInteractiveButton] = interactiveButtons;

    await user.click(firstInteractiveButton);
    expect(screen.getByText('2/25')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset card' }));
    expect(screen.getByText('1/25')).toBeInTheDocument();

    for (const button of interactiveButtons.slice(0, 5)) {
      await user.click(button);
    }

    await waitFor(() => {
      expect(
        screen.getByText('Especially accurate today.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Especially accurate today.')).toBeInTheDocument();

    for (const button of interactiveButtons.slice(5)) {
      await user.click(button);
    }

    await waitFor(() => {
      expect(screen.getByText('Full card of classics')).toBeInTheDocument();
    });

    const resultCard = screen.getByText(
      'If you want to share it, a screenshot of this result card is enough.',
    ).parentElement;
    expect(resultCard).toBeTruthy();
    expect(
      within(resultCard as HTMLElement).getByText('Full card complete'),
    ).toBeInTheDocument();
    expect(
      within(resultCard as HTMLElement).getByText('12 bingo lines found'),
    ).toBeInTheDocument();

    const statsPanel = screen.getAllByRole('heading', {
      name: 'Local stats',
    })[0]?.parentElement;
    expect(statsPanel).toBeTruthy();
    expect(
      within(statsPanel as HTMLElement).getByText('Rounds played'),
    ).toBeInTheDocument();
    expect(
      within(statsPanel as HTMLElement).getByText('12'),
    ).toBeInTheDocument();
    expect(
      within(statsPanel as HTMLElement).getByText('Full card complete'),
    ).toBeInTheDocument();
    expect(
      window.localStorage.getItem('mecfs-paperwork.games.me-bingo.stats.v1'),
    ).toContain('"playedRounds":1');

    await user.click(screen.getByRole('button', { name: 'New card' }));

    await waitFor(() => {
      expect(screen.getByText('1/25')).toBeInTheDocument();
    });
  });
});
