import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StagingMarker from '../../src/components/StagingMarker';

describe('StagingMarker', () => {
  it('renders staging marker when VITE_DEPLOYMENT_ENV is staging', () => {
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_DEPLOYMENT_ENV: 'staging',
        },
      },
    });

    render(<StagingMarker />);
    expect(screen.getByText('STAGING')).toBeInTheDocument();
  });

  it('does not render when VITE_DEPLOYMENT_ENV is production', () => {
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_DEPLOYMENT_ENV: 'production',
        },
      },
    });

    const { container } = render(<StagingMarker />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when VITE_DEPLOYMENT_ENV is undefined', () => {
    vi.stubGlobal('import', {
      meta: {
        env: {},
      },
    });

    const { container } = render(<StagingMarker />);
    expect(container.firstChild).toBeNull();
  });
});
