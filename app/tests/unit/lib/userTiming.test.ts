import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  USER_TIMING_NAMES,
  startUserTiming,
} from '../../../src/lib/performance/userTiming';

describe('startUserTiming', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a measure entry when ended', () => {
    const metricName = USER_TIMING_NAMES.appBootTotal;
    globalThis.performance.clearMeasures(metricName);

    const timing = startUserTiming(metricName);
    timing.end();

    const entries = globalThis.performance.getEntriesByName(
      metricName,
      'measure',
    );
    expect(entries).toHaveLength(1);
    expect(Number.isFinite(entries[0].duration)).toBe(true);
  });

  it('is a no-op when performance api is unavailable', () => {
    vi.stubGlobal('performance', undefined);

    expect(() => {
      const timing = startUserTiming(USER_TIMING_NAMES.exportJsonTotal);
      timing.end();
    }).not.toThrow();
  });

  it('allows repeated end calls without throwing or duplicating the measure', () => {
    const metricName = USER_TIMING_NAMES.exportDocxTotal;
    globalThis.performance.clearMeasures(metricName);

    const timing = startUserTiming(metricName);
    timing.end();
    timing.end();

    const entries = globalThis.performance.getEntriesByName(
      metricName,
      'measure',
    );
    expect(entries).toHaveLength(1);
  });
});
