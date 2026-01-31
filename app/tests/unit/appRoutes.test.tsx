import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

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

const renderAppRoutes = async (entry: string) => {
  const { default: AppRoutes } = await import('../../src/AppRoutes');
  render(
    <MemoryRouter
      initialEntries={[entry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AppRoutes />
    </MemoryRouter>,
  );
};

describe('AppRoutes', () => {
  it('renders the formpack list route when lazy loaded', async () => {
    await renderAppRoutes('/formpacks');
    expect(await screen.findByText('Formpack List')).toBeInTheDocument();
  });

  it('renders legal routes when lazy loaded', async () => {
    await renderAppRoutes('/privacy');
    expect(await screen.findByText('Privacy')).toBeInTheDocument();
  });
});
