import { memo, useCallback, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeMode } from '../theme/theme';
import { useTheme } from '../theme/useTheme';

export default memo(function ThemeSwitcher() {
  const { t } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();

  const handleThemeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setThemeMode(event.target.value as ThemeMode);
    },
    [setThemeMode],
  );

  return (
    <div className="app__theme-switch">
      <label htmlFor="theme-select">{t('theme.label')}</label>
      <div className="app__select-wrapper">
        <select
          id="theme-select"
          className="app__select"
          value={themeMode}
          onChange={handleThemeChange}
        >
          <option value="dark">{t('theme.options.dark')}</option>
          <option value="light">{t('theme.options.light')}</option>
          <option value="system">{t('theme.options.system')}</option>
        </select>
        <svg
          className="app__select-chevron"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4.66602 6.66602L7.99935 9.99935L11.3327 6.66602"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
});
