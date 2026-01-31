import { registerSW } from 'virtual:pwa-register';

type RuntimeEnv = {
  DEV: boolean;
  VITE_ENABLE_DEV_SW?: string;
};

export const shouldRegisterServiceWorker = (
  env: RuntimeEnv = import.meta.env,
): boolean => !env.DEV || env.VITE_ENABLE_DEV_SW === 'true';

export const registerServiceWorker = (env: RuntimeEnv = import.meta.env) => {
  if (!shouldRegisterServiceWorker(env)) {
    return;
  }
  registerSW({ immediate: true });
};
