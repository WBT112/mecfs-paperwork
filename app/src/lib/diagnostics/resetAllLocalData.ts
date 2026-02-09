const DB_NAME = 'mecfs-paperwork';
const toError = (reason: unknown, fallbackMessage: string): Error =>
  reason instanceof Error ? reason : new Error(fallbackMessage);

export const resetAllLocalData = async (): Promise<void> => {
  // 1. Delete IndexedDB database
  if (typeof indexedDB !== 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(
          toError(
            request.error,
            `Failed to delete IndexedDB database "${DB_NAME}".`,
          ),
        );
      };
      request.onblocked = () => {
        resolve();
      };
    });
  }

  // 2. Unregister all service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
  }

  // 3. Clear all caches
  if ('caches' in globalThis) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }

  // 4. Clear localStorage
  globalThis.localStorage.clear();

  // 5. Reload the page to reinitialize cleanly
  globalThis.location.reload();
};
