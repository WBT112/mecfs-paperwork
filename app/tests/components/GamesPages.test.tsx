import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import GamesHubPage from '../../src/features/games/pages/GamesHubPage';
import MeBingoPage from '../../src/features/games/pages/MeBingoPage';
import SpoonManagerPage from '../../src/features/games/pages/SpoonManagerPage';
import { TestRouter } from '../setup/testRouter';

const renderGamesPages = (initialEntry: string) =>
  render(
    <I18nextProvider i18n={i18n}>
      <TestRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/games" element={<GamesHubPage />} />
          <Route path="/games/me-bingo" element={<MeBingoPage />} />
          <Route path="/games/spoon-manager" element={<SpoonManagerPage />} />
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

  it('renders the Games hub with two playable tiles and one placeholder', () => {
    renderGamesPages('/games');

    expect(screen.getByRole('heading', { name: 'Games' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /me bingo/i })).toHaveAttribute(
      'href',
      '/games/me-bingo',
    );
    expect(
      screen.getByRole('link', { name: /spoon manager/i }),
    ).toHaveAttribute('href', '/games/spoon-manager');
    expect(screen.getByText('PEM Runner')).toBeInTheDocument();
    expect(screen.getAllByText(/playable|coming soon/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(/coming soon/i)).toHaveLength(1);
  });

  it('plays through the main ME Bingo flow including reset, full card, and new card', async () => {
    const user = userEvent.setup();
    const { container } = renderGamesPages('/games/me-bingo');

    await user.click(screen.getByRole('button', { name: 'Start game' }));

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

  it('plays through a seeded Spoon Manager day with protective choices', async () => {
    const user = userEvent.setup();
    renderGamesPages('/games/spoon-manager?seed=test-seed');

    await user.click(screen.getByRole('button', { name: 'Start day' }));

    for (let index = 0; index < 6; index += 1) {
      const protectiveAction = screen
        .getAllByRole('button')
        .find((button) => /protective|Now \+1|Now 0/i.test(button.textContent));
      if (!protectiveAction) {
        throw new Error('Expected a protective Spoon Manager action.');
      }
      await user.click(protectiveAction);

      const continueButton = screen.queryByRole('button', { name: 'Continue' });
      if (continueButton) {
        await user.click(continueButton);
      }
    }

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /solidly managed|well chosen|surprisingly steady|good pacing/i,
        }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Remaining spoons')).toBeInTheDocument();
    expect(
      window.localStorage.getItem(
        'mecfs-paperwork.games.spoon-manager.stats.v1',
      ),
    ).toContain('"totalRuns":1');
  });
});
