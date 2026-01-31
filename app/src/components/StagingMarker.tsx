const env = import.meta.env as {
  VITE_DEPLOYMENT_ENV?: string;
};

/**
 * Staging environment marker banner.
 * Only shown when VITE_DEPLOYMENT_ENV is set to "staging".
 * Helps prevent accidental testing on production.
 */
export default function StagingMarker() {
  const isStaging = env.VITE_DEPLOYMENT_ENV === 'staging';

  if (!isStaging) {
    return null;
  }

  return (
    <div className="staging-marker">
      <span className="staging-marker__text">STAGING</span>
    </div>
  );
}
