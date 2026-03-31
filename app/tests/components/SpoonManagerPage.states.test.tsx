import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SpoonManagerPage from '../../src/features/games/pages/SpoonManagerPage';
import i18n from '../../src/i18n';
import { TestRouter } from '../setup/testRouter';
import type {
  SpoonGameState,
  SpoonGameStats,
} from '../../src/features/games/spoon-manager/types';

const mockUseSpoonManagerGame =
  vi.fn<
    () => ReturnType<
      typeof import('../../src/features/games/spoon-manager/hooks/useSpoonManagerGame').useSpoonManagerGame
    >
  >();

vi.mock(
  '../../src/features/games/spoon-manager/hooks/useSpoonManagerGame',
  () => ({
    useSpoonManagerGame: () => mockUseSpoonManagerGame(),
  }),
);

const startGameSpy = vi.fn();
const restartGameSpy = vi.fn();
const chooseActionSpy = vi.fn();
const advanceSpy = vi.fn();
const PROTECTIVE_META_LABEL = 'protective';
const HELPER_ACTION_TEST_ID = 'spoon-action-bitte_um_hilfe';

const baseStats: SpoonGameStats = {
  totalRuns: 3,
  stableRuns: 1,
  narrowRuns: 1,
  crashRuns: 1,
  bestRemainingSpoons: 4,
  lastStatus: 'stable',
};

const activeGame: SpoonGameState = {
  seed: 'page-seed',
  spoons: 6,
  status: 'playing',
  phase: 'midday',
  turnInPhase: 1,
  turnIndex: 2,
  startFlavorId: 'littleBuffer',
  phaseFlavorId: 'showsWhatIsLeft',
  pendingPhaseDelta: 0,
  chosenActions: [],
  triggeredEventIds: [],
  currentActionIds: [
    'arzttermin_wahrnehmen_light',
    'bitte_um_hilfe',
    'mail_beantworten',
    'unknown-action',
  ],
  feedbackKeys: ['games.spoonManager.actions.mail_beantworten.feedback'],
  latestFeedbackKey: 'games.spoonManager.actions.mail_beantworten.feedback',
  awaitingAdvance: true,
  resultFlavorId: null,
};

const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <TestRouter initialEntries={['/games/spoon-manager?seed=page-seed']}>
        <SpoonManagerPage />
      </TestRouter>
    </I18nextProvider>,
  );

describe('SpoonManagerPage states', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    startGameSpy.mockReset();
    restartGameSpy.mockReset();
    chooseActionSpy.mockReset();
    advanceSpy.mockReset();
    mockUseSpoonManagerGame.mockReturnValue({
      game: null,
      stats: {
        ...baseStats,
        lastStatus: null,
        bestRemainingSpoons: null,
      },
      startGame: startGameSpy,
      restartGame: restartGameSpy,
      chooseAction: chooseActionSpy,
      advance: advanceSpy,
    });
  });

  it('renders the idle intro state with empty stats', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'One day, six decisions' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Nothing yet')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Start day' }));
    expect(startGameSpy).toHaveBeenCalledTimes(1);
  });

  it('renders active action metadata, skips unknown actions, and exposes continue', async () => {
    const user = userEvent.setup();
    mockUseSpoonManagerGame.mockReturnValue({
      game: activeGame,
      stats: baseStats,
      startGame: startGameSpy,
      restartGame: restartGameSpy,
      chooseAction: chooseActionSpy,
      advance: advanceSpy,
    });

    renderPage();

    expect(
      screen.getByTestId('spoon-action-arzttermin_wahrnehmen_light'),
    ).toHaveTextContent(/later -1/i);
    expect(screen.getByTestId(HELPER_ACTION_TEST_ID)).toHaveTextContent(
      PROTECTIVE_META_LABEL,
    );
    expect(
      screen.getByTestId('spoon-action-mail_beantworten'),
    ).toHaveTextContent('moderate');
    expect(screen.getAllByRole('button', { name: /Continue/i })).toHaveLength(
      1,
    );
    expect(screen.getAllByTestId(/spoon-action-/)).toHaveLength(3);
    expect(screen.getByTestId(HELPER_ACTION_TEST_ID)).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(chooseActionSpy).not.toHaveBeenCalled();
    expect(advanceSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers action selection when the current turn is still interactive', async () => {
    const user = userEvent.setup();
    mockUseSpoonManagerGame.mockReturnValue({
      game: {
        ...activeGame,
        awaitingAdvance: false,
        feedbackKeys: [],
        latestFeedbackKey: null,
      },
      stats: baseStats,
      startGame: startGameSpy,
      restartGame: restartGameSpy,
      chooseAction: chooseActionSpy,
      advance: advanceSpy,
    });

    renderPage();

    await user.click(screen.getByTestId(HELPER_ACTION_TEST_ID));

    expect(chooseActionSpy).toHaveBeenCalledWith('bitte_um_hilfe');
    expect(advanceSpy).not.toHaveBeenCalled();
  });

  it('falls back to generic intro texts when flavor ids are unknown', () => {
    mockUseSpoonManagerGame.mockReturnValue({
      game: {
        ...activeGame,
        startFlavorId: 'missing-start',
        phaseFlavorId: 'missing-phase',
        awaitingAdvance: false,
        feedbackKeys: [],
        latestFeedbackKey: null,
      },
      stats: baseStats,
      startGame: startGameSpy,
      restartGame: restartGameSpy,
      chooseAction: chooseActionSpy,
      advance: advanceSpy,
    });

    renderPage();

    expect(
      screen.getAllByText('Today, every small choice matters.'),
    ).toHaveLength(2);
  });

  it('surfaces phase events in a dedicated event panel', () => {
    mockUseSpoonManagerGame.mockReturnValue({
      game: {
        ...activeGame,
        awaitingAdvance: false,
        currentActionIds: [],
        feedbackKeys: [
          'games.spoonManager.events.hilfe_verfuegbar',
          'games.spoonManager.system.pendingPhaseDeltaNegative',
        ],
        latestFeedbackKey:
          'games.spoonManager.system.pendingPhaseDeltaNegative',
      },
      stats: baseStats,
      startGame: startGameSpy,
      restartGame: restartGameSpy,
      chooseAction: chooseActionSpy,
      advance: advanceSpy,
    });

    renderPage();

    expect(screen.getByText('Phase event')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Someone can actually take something off your plate today.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Feedback')).toBeInTheDocument();
  });

  it('renders the finished result state with a fallback flavor when needed', () => {
    mockUseSpoonManagerGame.mockReturnValue({
      game: {
        ...activeGame,
        status: 'crash',
        spoons: -1,
        awaitingAdvance: false,
        currentActionIds: [],
        resultFlavorId: 'missing-flavor',
      },
      stats: baseStats,
      startGame: startGameSpy,
      restartGame: restartGameSpy,
      chooseAction: chooseActionSpy,
      advance: advanceSpy,
    });

    renderPage();

    expect(screen.getByText('Crash')).toBeInTheDocument();
    expect(
      screen.getByText('Today, every small choice matters.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Remaining spoons')).toBeInTheDocument();
    expect(screen.queryByText('Solidly managed.')).not.toBeInTheDocument();
  });

  it('renders the configured result flavor when it exists', () => {
    mockUseSpoonManagerGame.mockReturnValue({
      game: {
        ...activeGame,
        status: 'stable',
        spoons: 4,
        awaitingAdvance: false,
        currentActionIds: [],
        resultFlavorId: 'stable-solidDay',
      },
      stats: baseStats,
      startGame: startGameSpy,
      restartGame: restartGameSpy,
      chooseAction: chooseActionSpy,
      advance: advanceSpy,
    });

    renderPage();

    expect(screen.getAllByText('Stably done').length).toBeGreaterThan(0);
    expect(screen.getByText('Solidly managed.')).toBeInTheDocument();
  });
});
