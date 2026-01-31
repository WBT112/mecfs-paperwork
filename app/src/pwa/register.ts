import { registerSW } from 'virtual:pwa-register';

export const registerServiceWorker = () => {
  registerSW({ immediate: true });
};
