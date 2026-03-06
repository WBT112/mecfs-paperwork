import {
  DOCTOR_LETTER_FORMPACK_ID,
  OFFLABEL_ANTRAG_FORMPACK_ID,
} from './formpackIds';

/**
 * Reports whether a formpack uses the letter-style preview/export layout.
 *
 * @param formpackId - Active formpack identifier or `null`.
 * @returns `true` for letter-style formpacks, otherwise `false`.
 */
export const hasLetterLayout = (formpackId: string | null): boolean =>
  formpackId === DOCTOR_LETTER_FORMPACK_ID ||
  formpackId === OFFLABEL_ANTRAG_FORMPACK_ID;
