/**
 * Clears service workers and Cache Storage without touching persisted user data.
 *
 * @remarks
 * RATIONALE: This recovery path targets stale offline app-shell state. It must
 * not delete IndexedDB records, snapshots, profiles, or encryption material.
 *
 * @param options - Optional flags for controlling the final browser reload.
 * @returns A promise that resolves after the app shell cleanup is finished.
 */
export const resetAppShell = async (options?: {
  reload?: boolean;
}): Promise<void> => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
  }

  if ('caches' in globalThis) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  if (options?.reload ?? true) {
    globalThis.location.reload();
  }
};
