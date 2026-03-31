import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestRouter } from '../setup/testRouter';

describe('AppRoutes fallback', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('shows the route loading fallback while a lazy page is still pending', async () => {
    vi.doMock('react-i18next', () => ({
      useTranslation: () => ({
        t: (key: string) => (key === 'routeLoading' ? 'Loading page...' : key),
      }),
    }));

    vi.doMock('../../src/pages/FormpackListPage', () => ({
      default: () => <div>Formpack list route</div>,
    }));
    vi.doMock('../../src/pages/FormpackDetailPage', () => ({
      default: () => <div>Formpack detail route</div>,
    }));
    vi.doMock('../../src/pages/HelpPage', () => ({
      default: () => <div>Help route</div>,
    }));
    vi.doMock('../../src/pages/ImprintPage', () => ({
      default: () => <div>Imprint route</div>,
    }));
    vi.doMock('../../src/pages/PrivacyPage', () => ({
      default: () => <div>Privacy route</div>,
    }));
    vi.doMock('../../src/features/games/pages/GamesHubPage', async () => {
      await new Promise(() => undefined);
      return { default: () => <div>Games hub route</div> };
    });
    vi.doMock('../../src/features/games/pages/MeBingoPage', () => ({
      default: () => <div>ME Bingo route</div>,
    }));

    const { default: AppRoutes } = await import('../../src/AppRoutes');

    render(
      <TestRouter initialEntries={['/games']}>
        <AppRoutes />
      </TestRouter>,
    );

    expect(screen.getByText('Loading page...')).toBeInTheDocument();
  });
});
