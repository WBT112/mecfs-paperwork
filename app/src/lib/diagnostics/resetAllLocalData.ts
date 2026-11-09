import { deleteDB } from 'idb';
import { clearStorageEncryptionKeyCookie } from '../../storage/atRestEncryption';
import { resetAppShell } from './resetAppShell';

const DB_NAME = 'mecfs-paperwork';

/**
 * Deletes persisted data before clearing the app shell and encryption material.
 *
 * @returns A promise that resolves once cleanup and the reload request complete.
 * @throws When database deletion or app-shell cleanup fails.
 * @remarks
 * A blocked deletion remains pending. Never remove the key or report completion
 * before IndexedDB confirms deletion; cooperating connections close on version changes.
 */
export const resetAllLocalData = async (): Promise<void> => {
  if (typeof indexedDB !== 'undefined') {
    await deleteDB(DB_NAME);
  }

  await resetAppShell({ reload: false });
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  clearStorageEncryptionKeyCookie();
  globalThis.location.reload();
};
