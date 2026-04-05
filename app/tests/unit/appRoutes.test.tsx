import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useNavigate } from 'react-router-dom';
import { TestRouter } from '../setup/testRouter';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../src/pages/FormpackDetailPage', () => ({
  default: () => <div>Formpack Detail</div>,
}));

vi.mock('../../src/pages/FormpackListPage', () => ({
  default: () => <div>Formpack List</div>,
}));

vi.mock('../../src/pages/HelpPage', () => ({
  default: () => <div>Help</div>,
}));

vi.mock('../../src/pages/ImprintPage', () => ({
  default: () => <div>Imprint</div>,
}));

vi.mock('../../src/pages/PrivacyPage', () => ({
  default: () => <div>Privacy</div>,
}));

vi.mock('../../src/features/games/pages/SpoonManagerPage', () => ({
  default: () => <div>Spoon Manager</div>,
}));

const renderAppRoutes = async (entry: string) => {
  const { default: AppRoutes } = await import('../../src/AppRoutes');
  render(
    <TestRouter initialEntries={[entry]}>
      <AppRoutes />
    </TestRouter>,
  );
};

const FORMPACK_LIST_TEXT = 'Formpack List';
const HELP_TEXT = 'Help';
const GO_HELP_BUTTON_LABEL = 'Go Help';
const GO_HELP_HASH_BUTTON_LABEL = 'Go Help Hash';
const FORMPACK_LIST_ROUTE = '/formpacks';
const HELP_ROUTE = '/help';
const HELP_HASH_ROUTE = '/help#faq';

const NavigationHarness = ({ to, label }: { to: string; label: string }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      {label}
    </button>
  );
};

describe('AppRoutes', () => {
  it('renders the formpack list route when lazy loaded', async () => {
    await renderAppRoutes(FORMPACK_LIST_ROUTE);
    expect(await screen.findByText(FORMPACK_LIST_TEXT)).toBeInTheDocument();
  });

  it('redirects root path to /formpacks', async () => {
    await renderAppRoutes('/');
    expect(await screen.findByText(FORMPACK_LIST_TEXT)).toBeInTheDocument();
  });

  it('renders the formpack detail route when lazy loaded', async () => {
    await renderAppRoutes('/formpacks/doctor-letter');
    expect(await screen.findByText('Formpack Detail')).toBeInTheDocument();
  });

  it('renders the imprint route when lazy loaded', async () => {
    await renderAppRoutes('/imprint');
    expect(await screen.findByText('Imprint')).toBeInTheDocument();
  });

  it('renders the privacy route when lazy loaded', async () => {
    await renderAppRoutes('/privacy');
    expect(await screen.findByText('Privacy')).toBeInTheDocument();
  });

  it('renders the help route when lazy loaded', async () => {
    await renderAppRoutes(HELP_ROUTE);
    expect(await screen.findByText(HELP_TEXT)).toBeInTheDocument();
  });

  it('renders the spoon manager route when lazy loaded', async () => {
    await renderAppRoutes('/games/spoon-manager');
    expect(await screen.findByText('Spoon Manager')).toBeInTheDocument();
  });

  it('resets window scroll to top when navigating to another route without hash', async () => {
    const scrollToSpy = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined);
    try {
      const { default: AppRoutes } = await import('../../src/AppRoutes');
      render(
        <TestRouter initialEntries={[FORMPACK_LIST_ROUTE]}>
          <NavigationHarness to={HELP_ROUTE} label={GO_HELP_BUTTON_LABEL} />
          <AppRoutes />
        </TestRouter>,
      );

      await screen.findByText(FORMPACK_LIST_TEXT);
      scrollToSpy.mockClear();

      await userEvent.click(
        screen.getByRole('button', { name: GO_HELP_BUTTON_LABEL }),
      );
      expect(await screen.findByText(HELP_TEXT)).toBeInTheDocument();
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        left: 0,
        behavior: 'auto',
      });
    } finally {
      scrollToSpy.mockRestore();
    }
  });

  it('does not reset window scroll when navigating to a hash route', async () => {
    const scrollToSpy = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined);
    try {
      const { default: AppRoutes } = await import('../../src/AppRoutes');
      render(
        <TestRouter initialEntries={[FORMPACK_LIST_ROUTE]}>
          <NavigationHarness
            to={HELP_HASH_ROUTE}
            label={GO_HELP_HASH_BUTTON_LABEL}
          />
          <AppRoutes />
        </TestRouter>,
      );

      await screen.findByText(FORMPACK_LIST_TEXT);
      scrollToSpy.mockClear();

      await userEvent.click(
        screen.getByRole('button', { name: GO_HELP_HASH_BUTTON_LABEL }),
      );
      expect(await screen.findByText(HELP_TEXT)).toBeInTheDocument();
      expect(scrollToSpy).not.toHaveBeenCalled();
    } finally {
      scrollToSpy.mockRestore();
    }
  });
});
