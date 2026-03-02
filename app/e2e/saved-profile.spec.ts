import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openFormpackWithRetry } from './helpers/formpack';
import {
  POLL_INTERVALS,
  POLL_TIMEOUT,
  getActiveRecordId,
  waitForRecordField,
} from './helpers/records';

const DB_NAME = 'mecfs-paperwork';
const DOCTOR_LETTER = 'doctor-letter';
const NOTFALLPASS = 'notfallpass';

const PATIENT_FIRST = 'TestVorname';
const PATIENT_LAST = 'TestNachname';
const DOCTOR_NAME = 'Dr. TestArzt';

const openFreshFormpack = async (page: Page, formpackId: string) => {
  await deleteDatabase(page, DB_NAME);
  await openFormpackWithRetry(
    page,
    formpackId,
    page.locator('#formpack-records-toggle'),
  );
};

const waitForActiveRecordId = async (
  page: Page,
  formpackId: string,
  timeoutMs = POLL_TIMEOUT,
): Promise<string> => {
  let activeId: string | null = null;
  await expect
    .poll(
      async () => {
        activeId = await getActiveRecordId(page, formpackId);
        return activeId;
      },
      { timeout: timeoutMs, intervals: POLL_INTERVALS },
    )
    .not.toBeNull();
  if (!activeId) {
    throw new Error('Active record id not available after polling.');
  }
  return activeId;
};

const getDefaultProfileData = async (page: Page) => {
  return page.evaluate(async (dbName) => {
    const STORAGE_ENCRYPTION_KIND = 'mecfs-paperwork-idb-encrypted';
    const STORAGE_KEY_COOKIE_NAME = 'mecfs-paperwork.storage-key';

    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null && !Array.isArray(value);

    const isEncryptedPayload = (
      value: unknown,
    ): value is { iv: string; ciphertext: string } => {
      return (
        isRecord(value) &&
        value.kind === STORAGE_ENCRYPTION_KIND &&
        typeof value.iv === 'string' &&
        typeof value.ciphertext === 'string'
      );
    };

    const fromBase64Url = (value: string): Uint8Array => {
      const base64 = value
        .replaceAll('-', '+')
        .replaceAll('_', '/')
        .padEnd(Math.ceil(value.length / 4) * 4, '=');
      const binary = atob(base64);
      return Uint8Array.from(binary, (char) => char.charCodeAt(0));
    };

    const getCookieValue = (name: string): string | null => {
      const cookies = document.cookie ? document.cookie.split('; ') : [];
      const prefix = `${name}=`;
      for (const cookie of cookies) {
        if (cookie.startsWith(prefix)) {
          return cookie.slice(prefix.length);
        }
      }
      return null;
    };

    const db = await new Promise<IDBDatabase | null>((resolve) => {
      let aborted = false;
      const request = indexedDB.open(dbName);
      request.onupgradeneeded = () => {
        aborted = true;
        request.transaction?.abort();
      };
      request.onsuccess = () => {
        const database = request.result;
        if (aborted) {
          database.close();
          resolve(null);
          return;
        }
        resolve(database);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });

    if (!db) {
      return null;
    }

    try {
      if (!db.objectStoreNames.contains('profiles')) {
        return null;
      }

      const entry = await new Promise<Record<string, unknown> | null>(
        (resolve, reject) => {
          const tx = db.transaction('profiles', 'readonly');
          const store = tx.objectStore('profiles');
          const getRequest = store.get('default');
          getRequest.onsuccess = () => {
            const value = getRequest.result;
            resolve(
              typeof value === 'object' &&
                value !== null &&
                !Array.isArray(value)
                ? (value as Record<string, unknown>)
                : null,
            );
          };
          getRequest.onerror = () => reject(getRequest.error);
        },
      );

      if (!entry) {
        return null;
      }

      const data = entry.data;
      if (!isRecord(data)) {
        return null;
      }

      if (isEncryptedPayload(data)) {
        const keyCookie = getCookieValue(STORAGE_KEY_COOKIE_NAME);
        if (!keyCookie) {
          return null;
        }

        try {
          const key = await crypto.subtle.importKey(
            'raw',
            fromBase64Url(keyCookie),
            { name: 'AES-GCM' },
            false,
            ['decrypt'],
          );
          const plainBuffer = await crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv: fromBase64Url(data.iv),
              tagLength: 128,
            },
            key,
            fromBase64Url(data.ciphertext),
          );
          const parsed = JSON.parse(new TextDecoder().decode(plainBuffer));
          return isRecord(parsed) ? (parsed as Record<string, unknown>) : null;
        } catch {
          return null;
        }
      }

      return data as Record<string, unknown>;
    } finally {
      db.close();
    }
  }, DB_NAME);
};

const waitForSavedProfile = async (page: Page) => {
  await expect
    .poll(
      async () => {
        const profileData = await getDefaultProfileData(page);
        const patientCategory = profileData?.patient;
        const doctorCategory = profileData?.doctor;

        const patient =
          typeof patientCategory === 'object' &&
          patientCategory !== null &&
          !Array.isArray(patientCategory)
            ? (patientCategory as Record<string, unknown>)
            : null;
        const doctor =
          typeof doctorCategory === 'object' &&
          doctorCategory !== null &&
          !Array.isArray(doctorCategory)
            ? (doctorCategory as Record<string, unknown>)
            : null;

        return (
          patient?.firstName === PATIENT_FIRST && doctor?.name === DOCTOR_NAME
        );
      },
      { timeout: POLL_TIMEOUT, intervals: POLL_INTERVALS },
    )
    .toBe(true);
};

test.describe('saved profile across formpacks', () => {
  test('saves details in doctor-letter and applies them in notfallpass', async ({
    page,
  }) => {
    // --- Step 1: Open doctor-letter, fill patient + doctor, enable save ---
    await openFreshFormpack(page, DOCTOR_LETTER);

    // Wait for the form to be visible
    await expect(page.locator('.formpack-form')).toBeVisible({
      timeout: POLL_TIMEOUT,
    });

    // Ensure "Save master data" checkbox is checked (on by default)
    const saveCheckbox = page.locator(
      '.profile-quickfill input[type="checkbox"]',
    );
    await expect(saveCheckbox).toBeVisible({ timeout: POLL_TIMEOUT });
    await expect(saveCheckbox).toBeChecked({ timeout: POLL_TIMEOUT });

    // Fill patient fields
    const patientFirst = page.locator('#root_patient_firstName');
    await expect(patientFirst).toBeVisible({ timeout: POLL_TIMEOUT });
    await patientFirst.fill(PATIENT_FIRST);

    const patientLast = page.locator('#root_patient_lastName');
    await patientLast.fill(PATIENT_LAST);

    // Fill doctor name
    const doctorName = page.locator('#root_doctor_name');
    await expect(doctorName).toBeVisible({ timeout: POLL_TIMEOUT });
    await doctorName.fill(DOCTOR_NAME);

    // Wait for autosave to persist the data
    const recordId = await waitForActiveRecordId(page, DOCTOR_LETTER);
    await waitForRecordField(
      page,
      recordId,
      (r) => (r?.data?.['patient'] as Record<string, unknown>)?.['firstName'],
      PATIENT_FIRST,
    );

    await waitForSavedProfile(page);

    // --- Step 2: Open notfallpass (keep DB so profile data persists) ---
    await openFormpackWithRetry(
      page,
      NOTFALLPASS,
      page.locator('#formpack-records-toggle'),
    );

    await expect(page.locator('.formpack-form')).toBeVisible({
      timeout: POLL_TIMEOUT,
    });

    // The Apply button should be enabled (profile has data)
    const applyButton = page.getByRole('button', {
      name: /Stammdaten übernehmen|Apply master data/,
    });
    await expect(applyButton).toBeVisible({ timeout: POLL_TIMEOUT });
    await expect(applyButton).toBeEnabled({ timeout: POLL_TIMEOUT });

    await clickActionButton(applyButton);

    // Verify success message
    await expect(page.locator('.profile-quickfill__success')).toBeVisible({
      timeout: 5_000,
    });

    // Verify person.firstName and person.lastName were filled
    await expect(page.locator('#root_person_firstName')).toHaveValue(
      PATIENT_FIRST,
      { timeout: 5_000 },
    );
    await expect(page.locator('#root_person_lastName')).toHaveValue(
      PATIENT_LAST,
      { timeout: 5_000 },
    );

    // Verify doctor.name was filled
    const notfallDoctorName = page.locator('#root_doctor_name');
    await expect(notfallDoctorName).toHaveValue(DOCTOR_NAME, {
      timeout: 5_000,
    });
  });

  test('apply does not overwrite existing non-empty fields', async ({
    page,
  }) => {
    // --- Step 1: Save profile from doctor-letter ---
    await openFreshFormpack(page, DOCTOR_LETTER);
    await expect(page.locator('.formpack-form')).toBeVisible({
      timeout: POLL_TIMEOUT,
    });

    const saveCheckbox = page.locator(
      '.profile-quickfill input[type="checkbox"]',
    );
    await expect(saveCheckbox).toBeChecked({ timeout: POLL_TIMEOUT });

    await page.locator('#root_patient_firstName').fill(PATIENT_FIRST);
    await page.locator('#root_patient_lastName').fill(PATIENT_LAST);
    await page.locator('#root_doctor_name').fill(DOCTOR_NAME);

    const recordId = await waitForActiveRecordId(page, DOCTOR_LETTER);
    await waitForRecordField(
      page,
      recordId,
      (r) => (r?.data?.['doctor'] as Record<string, unknown>)?.['name'],
      DOCTOR_NAME,
    );

    await waitForSavedProfile(page);

    // --- Step 2: Open notfallpass (keep DB so profile data persists) ---
    await openFormpackWithRetry(
      page,
      NOTFALLPASS,
      page.locator('#formpack-records-toggle'),
    );
    await expect(page.locator('.formpack-form')).toBeVisible({
      timeout: POLL_TIMEOUT,
    });

    const existingDoctorName = 'Dr. Existing';
    const doctorField = page.locator('#root_doctor_name');
    await expect(doctorField).toBeVisible({ timeout: POLL_TIMEOUT });
    await doctorField.fill(existingDoctorName);

    const applyButton = page.getByRole('button', {
      name: /Stammdaten übernehmen|Apply master data/,
    });
    await expect(applyButton).toBeEnabled({ timeout: POLL_TIMEOUT });
    await clickActionButton(applyButton);

    // Doctor name should NOT be overwritten
    await expect(doctorField).toHaveValue(existingDoctorName, {
      timeout: 5_000,
    });

    // Person firstName and lastName should be filled (were empty)
    await expect(page.locator('#root_person_firstName')).toHaveValue(
      PATIENT_FIRST,
      { timeout: 5_000 },
    );
    await expect(page.locator('#root_person_lastName')).toHaveValue(
      PATIENT_LAST,
      { timeout: 5_000 },
    );
  });
});
