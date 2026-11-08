import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const LANGUAGE_LABEL = 'Language';
const APP_SUBTITLE = 'Offline-first paperwork helper';
const APP_BUG_REPORT_HINT = 'Please report bugs on GitHub.';
const FORMPACK_LIST_DESCRIPTION = 'Available support offers';
const FORMPACKS_PATH = '/formpacks';
const TOOL_BRAND = 'ME/CFS Paperwork';

const setLocale = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const startFormpackBackgroundRefresh = vi.hoisted(() => vi.fn(() => vi.fn()));

const translations: Record<string, string> = {
  appTitle: TOOL_BRAND,
  appBugReportHint: APP_BUG_REPORT_HINT,
  appSubtitle: APP_SUBTITLE,
  formpackListDescription: FORMPACK_LIST_DESCRIPTION,
  'toolHeader.navigationLabel': 'Tool navigation',
  'toolHeader.backToOverview': 'Back to overview',
  'toolHeader.brand': TOOL_BRAND,
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
      <MemoryRouter initialEntries={[FORMPACKS_PATH]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: TOOL_BRAND }),
    ).toBeInTheDocument();
    expect(screen.getByText(APP_BUG_REPORT_HINT)).toBeInTheDocument();
    expect(
      screen
        .getByRole('heading', { name: TOOL_BRAND })
        .textContent.includes(APP_BUG_REPORT_HINT),
    ).toBe(false);
    expect(screen.getByText(APP_SUBTITLE)).toBeInTheDocument();

    const topbarActions = screen.getByText('Topbar Actions');
    const themeSwitcher = screen.getByText('Theme Switcher');
    const overviewDescription = screen.getByText(FORMPACK_LIST_DESCRIPTION);
    expect(
      topbarActions.compareDocumentPosition(themeSwitcher) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      themeSwitcher.compareDocumentPosition(overviewDescription) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

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
      <MemoryRouter initialEntries={[FORMPACKS_PATH]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders compact navigation as the first links on a tool route', () => {
    render(
      <MemoryRouter initialEntries={['/tools/mail-pflegegesetz']}>
        <App />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAccessibleName('Back to overview');
    expect(links[0]).toHaveAttribute('href', FORMPACKS_PATH);
    expect(links[1]).toHaveAccessibleName(TOOL_BRAND);
    expect(links[1]).toHaveAttribute('href', FORMPACKS_PATH);
    expect(screen.getByRole('navigation')).toHaveAccessibleName(
      'Tool navigation',
    );
    expect(screen.queryByText(APP_SUBTITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(APP_BUG_REPORT_HINT)).not.toBeInTheDocument();
    expect(
      screen.queryByText(FORMPACK_LIST_DESCRIPTION),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Topbar Actions')).not.toBeInTheDocument();
    expect(screen.queryByText('Theme Switcher')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(LANGUAGE_LABEL)).not.toBeInTheDocument();
  });

  it('swallows locale update errors and keeps rendering', async () => {
    setLocale.mockRejectedValueOnce(new Error('cannot persist locale'));
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={[FORMPACKS_PATH]}>
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
