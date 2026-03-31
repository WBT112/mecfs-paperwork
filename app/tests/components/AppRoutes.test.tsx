import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppRoutes from '../../src/AppRoutes';
import { TestRouter } from '../setup/testRouter';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../src/pages/FormpackListPage', () => ({
  default: () => <div>Formpack list route</div>,
}));

vi.mock('../../src/pages/FormpackDetailPage', () => ({
  default: () => <div>Formpack detail route</div>,
}));

vi.mock('../../src/pages/HelpPage', () => ({
  default: () => <div>Help route</div>,
}));

vi.mock('../../src/pages/ImprintPage', () => ({
  default: () => <div>Imprint route</div>,
}));

vi.mock('../../src/pages/PrivacyPage', () => ({
  default: () => <div>Privacy route</div>,
}));

vi.mock('../../src/features/games/pages/GamesHubPage', () => ({
  default: () => <div>Games hub route</div>,
}));

vi.mock('../../src/features/games/pages/MeBingoPage', () => ({
  default: () => <div>ME Bingo route</div>,
}));

describe('AppRoutes', () => {
  it('redirects the root route to formpacks', async () => {
    render(
      <TestRouter initialEntries={['/']}>
        <AppRoutes />
      </TestRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Formpack list route')).toBeInTheDocument();
    });
  });

  it('renders the Games hub route', async () => {
    render(
      <TestRouter initialEntries={['/games']}>
        <AppRoutes />
      </TestRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Games hub route')).toBeInTheDocument();
    });
  });

  it('renders the ME Bingo route', async () => {
    render(
      <TestRouter initialEntries={['/games/me-bingo']}>
        <AppRoutes />
      </TestRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('ME Bingo route')).toBeInTheDocument();
    });
  });
});
