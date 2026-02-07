import { registerSW } from 'virtual:pwa-register';

type RuntimeEnv = {
  DEV: boolean;
  VITE_ENABLE_DEV_SW?: string;
};

export const shouldRegisterServiceWorker = (
  env: RuntimeEnv = import.meta.env,
): boolean => !env.DEV || env.VITE_ENABLE_DEV_SW === 'true';

const swWaitingListeners = new Set<() => void>();

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

export const registerServiceWorker = (env: RuntimeEnv = import.meta.env) => {
  if (!shouldRegisterServiceWorker(env)) {
    return;
  }
  registerSW({
    immediate: true,
    onNeedRefresh() {
      emitSwWaiting();
    },
  });
};
