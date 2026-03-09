import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const LANGUAGE_LABEL = 'Language';
const APP_SUBTITLE = 'Offline-first paperwork helper';

const setLocale = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const startFormpackBackgroundRefresh = vi.hoisted(() => vi.fn(() => vi.fn()));

const translations: Record<string, string> = {
  appTitle: 'ME/CFS Paperwork',
  appSubtitle: APP_SUBTITLE,
  languageLabel: LANGUAGE_LABEL,
  'languageOptions.de': 'Deutsch',
  'languageOptions.en': 'English',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

vi.mock('../../src/i18n/useLocale', () => ({
  useLocale: () => ({
    locale: 'de',
    supportedLocales: ['de', 'en'],
    setLocale,
  }),
}));

vi.mock('../../src/formpacks/backgroundRefresh', () => ({
  startFormpackBackgroundRefresh,
}));

vi.mock('../../src/components/TopbarActions', () => ({
  default: () => <div>Topbar Actions</div>,
}));

vi.mock('../../src/components/ThemeSwitcher', () => ({
  default: () => <div>Theme Switcher</div>,
}));

vi.mock('../../src/components/StagingMarker', () => ({
  default: () => <div>Staging Marker</div>,
}));

vi.mock('../../src/components/Footer', () => ({
  default: () => <div>Footer</div>,
}));

vi.mock('../../src/AppRoutes', () => ({
  default: () => <div>Routes</div>,
}));

describe('App', () => {
  it('renders the header and updates the locale selection', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'ME/CFS Paperwork' }),
    ).toBeInTheDocument();
    expect(screen.getByText(APP_SUBTITLE)).toBeInTheDocument();

    const select = screen.getByLabelText(LANGUAGE_LABEL);
    expect(select).toHaveValue('de');

    await user.selectOptions(select, 'en');

    await waitFor(() => {
      expect(setLocale).toHaveBeenCalledWith('en');
    });
    expect(startFormpackBackgroundRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not render an update toast', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('swallows locale update errors and keeps rendering', async () => {
    setLocale.mockRejectedValueOnce(new Error('cannot persist locale'));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText(LANGUAGE_LABEL), 'en');

    await waitFor(() => {
      expect(setLocale).toHaveBeenCalledWith('en');
    });
    expect(screen.getByText(APP_SUBTITLE)).toBeVisible();
  });
});
