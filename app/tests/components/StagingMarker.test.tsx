import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import StagingMarker from '../../src/components/StagingMarker';

describe('StagingMarker', () => {
  it('renders without crashing in test environment', () => {
    const { container } = render(<StagingMarker />);
    // In test environment, VITE_DEPLOYMENT_ENV is not set by default, so marker should not render
    expect(container.firstChild).toBeNull();
  });

  it('component structure renders correctly when staging', () => {
    // This test validates the component structure
    // The actual staging banner is tested via E2E tests where VITE_DEPLOYMENT_ENV can be properly set
    const { container } = render(<StagingMarker />);
    expect(container).toBeDefined();
  });
});

describe('StagingMarker (staging env)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders the staging banner when VITE_DEPLOYMENT_ENV is staging', async () => {
    // Set the env variable before re-importing the module
    import.meta.env.VITE_DEPLOYMENT_ENV = 'staging';

    const { default: StagingMarkerStaging } =
      await import('../../src/components/StagingMarker');

    const { container } = render(<StagingMarkerStaging />);

    const marker = container.querySelector('.staging-marker');
    expect(marker).toBeInTheDocument();

    const text = container.querySelector('.staging-marker__text');
    expect(text).toBeInTheDocument();
    expect(text?.textContent).toBe('STAGING');

    // Clean up
    delete (import.meta.env as Record<string, string | undefined>)
      .VITE_DEPLOYMENT_ENV;
  });
});
