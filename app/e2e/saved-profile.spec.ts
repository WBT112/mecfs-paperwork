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

    // Wait for profile save to complete (give autosave + profile save time)
    await page.waitForTimeout(2000);

    // --- Step 2: Open notfallpass, click Apply, verify fields ---
    await openFreshFormpack(page, NOTFALLPASS);

    await expect(page.locator('.formpack-form')).toBeVisible({
      timeout: POLL_TIMEOUT,
    });

    // The Apply button should be enabled (profile has data)
    const applyButton = page.locator('.profile-quickfill .app__button');
    await expect(applyButton).toBeVisible({ timeout: POLL_TIMEOUT });
    await expect(applyButton).toBeEnabled({ timeout: POLL_TIMEOUT });

    await clickActionButton(applyButton);

    // Verify success message
    await expect(page.locator('.profile-quickfill__success')).toBeVisible({
      timeout: 5_000,
    });

    // Verify person.name was filled (firstName + lastName concatenated)
    const personName = page.locator('#root_person_name');
    await expect(personName).toHaveValue(`${PATIENT_FIRST} ${PATIENT_LAST}`, {
      timeout: 5_000,
    });

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

    await page.waitForTimeout(2000);

    // --- Step 2: Open notfallpass, pre-fill doctor name, then apply ---
    await openFreshFormpack(page, NOTFALLPASS);
    await expect(page.locator('.formpack-form')).toBeVisible({
      timeout: POLL_TIMEOUT,
    });

    const existingDoctorName = 'Dr. Existing';
    const doctorField = page.locator('#root_doctor_name');
    await expect(doctorField).toBeVisible({ timeout: POLL_TIMEOUT });
    await doctorField.fill(existingDoctorName);

    const applyButton = page.locator('.profile-quickfill .app__button');
    await expect(applyButton).toBeEnabled({ timeout: POLL_TIMEOUT });
    await clickActionButton(applyButton);

    // Doctor name should NOT be overwritten
    await expect(doctorField).toHaveValue(existingDoctorName, {
      timeout: 5_000,
    });

    // Person name should be filled (was empty)
    const personName = page.locator('#root_person_name');
    await expect(personName).toHaveValue(`${PATIENT_FIRST} ${PATIENT_LAST}`, {
      timeout: 5_000,
    });
  });
});
