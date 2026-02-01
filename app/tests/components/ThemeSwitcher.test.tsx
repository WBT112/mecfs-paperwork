import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ThemeSwitcher from '../../src/components/ThemeSwitcher';

const setThemeMode = vi.hoisted(() => vi.fn());

const translations: Record<string, string> = {
  'theme.label': 'Theme',
  'theme.options.dark': 'Dark',
  'theme.options.light': 'Light',
  'theme.options.system': 'System',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

vi.mock('../../src/theme/useTheme', () => ({
  useTheme: () => ({
    themeMode: 'light',
    setThemeMode,
  }),
}));

describe('ThemeSwitcher', () => {
  it('renders options and updates the theme selection', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    const select = screen.getByLabelText('Theme');
    expect(select).toHaveValue('light');

    await user.selectOptions(select, 'dark');

    expect(setThemeMode).toHaveBeenCalledWith('dark');
  });
});
