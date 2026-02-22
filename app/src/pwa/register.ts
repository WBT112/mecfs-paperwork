import { registerSW } from 'virtual:pwa-register';

type RuntimeEnv = {
  DEV: boolean;
  VITE_ENABLE_DEV_SW?: string;
};

export const shouldRegisterServiceWorker = (
  env: RuntimeEnv = import.meta.env,
): boolean => !env.DEV || env.VITE_ENABLE_DEV_SW === 'true';

const swWaitingListeners = new Set<() => void>();
const SW_UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
let hasStartedServiceWorkerUpdatePolling = false;

const emitSwWaiting = (): void => {
  swWaitingListeners.forEach((listener) => listener());
};

export const subscribeServiceWorkerWaiting = (
  listener: () => void,
): (() => void) => {
  swWaitingListeners.add(listener);
  return () => {
    swWaitingListeners.delete(listener);
  };
};

const triggerServiceWorkerUpdateCheck = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  } catch {
    // NOTE: Update checks are best-effort and must never break app startup.
  }
};

const startServiceWorkerUpdatePolling = (): void => {
  if (hasStartedServiceWorkerUpdatePolling || !('serviceWorker' in navigator)) {
    return;
  }

  hasStartedServiceWorkerUpdatePolling = true;

  triggerServiceWorkerUpdateCheck().catch(() => undefined);

  globalThis.setInterval(() => {
    triggerServiceWorkerUpdateCheck().catch(() => undefined);
  }, SW_UPDATE_CHECK_INTERVAL_MS);

  globalThis.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerServiceWorkerUpdateCheck().catch(() => undefined);
    }
  });
};

export const registerServiceWorker = (env: RuntimeEnv = import.meta.env) => {
  if (!shouldRegisterServiceWorker(env)) {
    return;
  }

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      emitSwWaiting();
      updateServiceWorker(true).catch(() => undefined);
    },
  });

  startServiceWorkerUpdatePolling();
};
