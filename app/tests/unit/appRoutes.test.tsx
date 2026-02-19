import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

const renderAppRoutes = async (entry: string) => {
  const { default: AppRoutes } = await import('../../src/AppRoutes');
  render(
    <TestRouter initialEntries={[entry]}>
      <AppRoutes />
    </TestRouter>,
  );
};

describe('AppRoutes', () => {
  it('renders the formpack list route when lazy loaded', async () => {
    await renderAppRoutes('/formpacks');
    expect(await screen.findByText('Formpack List')).toBeInTheDocument();
  });

  it('redirects root path to /formpacks', async () => {
    await renderAppRoutes('/');
    expect(await screen.findByText('Formpack List')).toBeInTheDocument();
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
    await renderAppRoutes('/help');
    expect(await screen.findByText('Help')).toBeInTheDocument();
  });
});
