import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const setLocale = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const translations: Record<string, string> = {
  appTitle: 'ME/CFS Paperwork',
  appSubtitle: 'Offline-first paperwork helper',
  languageLabel: 'Language',
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
    expect(screen.getByText('Offline-first paperwork helper')).toBeInTheDocument();

    const select = screen.getByLabelText('Language');
    expect(select).toHaveValue('de');

    await user.selectOptions(select, 'en');

    await waitFor(() => {
      expect(setLocale).toHaveBeenCalledWith('en');
    });
  });
});
