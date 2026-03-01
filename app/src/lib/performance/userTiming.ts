/**
 * Canonical user timing metric names used across the app.
 * Keeping this list static avoids high-cardinality metrics and user-data leaks.
 */
export const USER_TIMING_NAMES = {
  appBootTotal: 'mecfs.app.boot.total',
  formpackLoadTotal: 'mecfs.formpack.load.total',
  exportJsonTotal: 'mecfs.export.json.total',
  exportDocxTotal: 'mecfs.export.docx.total',
  exportPdfTotal: 'mecfs.export.pdf.total',
} as const;

type UserTimingController = {
  end: () => void;
};

let markSequence = 0;

const supportsUserTiming = (): boolean => {
  const perf = globalThis.performance as Performance | undefined;
  return (
    perf !== undefined &&
    typeof perf.mark === 'function' &&
    typeof perf.measure === 'function' &&
    typeof perf.clearMarks === 'function'
  );
};

/**
 * Starts a user timing measurement that can be ended exactly once.
 *
 * @param name - Stable metric name (for example `mecfs.export.json.total`).
 * @returns Controller with an idempotent `end()` function.
 * @remarks
 * SECURITY: This helper only accepts caller-provided static names. Do not pass
 * user input, IDs, or medical data into metric names.
 */
export const startUserTiming = (name: string): UserTimingController => {
  if (!supportsUserTiming()) {
    return { end: () => undefined };
  }

  markSequence += 1;
  const suffix = `${markSequence}`;
  const startMark = `${name}::start::${suffix}`;
  const endMark = `${name}::end::${suffix}`;
  let finished = false;

  try {
    globalThis.performance.mark(startMark);
  } catch {
    return { end: () => undefined };
  }

  return {
    end: () => {
      if (finished) {
        return;
      }
      finished = true;

      try {
        globalThis.performance.mark(endMark);
        globalThis.performance.measure(name, startMark, endMark);
      } catch {
        // Best-effort instrumentation only.
      } finally {
        try {
          globalThis.performance.clearMarks(startMark);
          globalThis.performance.clearMarks(endMark);
        } catch {
          // Ignore clear failures to avoid impacting runtime behavior.
        }
      }
    },
  };
};
