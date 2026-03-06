import {
  DOCTOR_LETTER_FORMPACK_ID,
  OFFLABEL_ANTRAG_FORMPACK_ID,
} from '../../../formpacks';
import { isRecord } from '../../../lib/utils';

export const mergeDummyPatch = (base: unknown, patch: unknown): unknown => {
  if (patch === undefined) {
    return base;
  }
  if (Array.isArray(patch)) {
    return patch;
  }
  if (!isRecord(base) || !isRecord(patch)) {
    return patch;
  }

  const next: Record<string, unknown> = { ...base };
  for (const [key, patchValue] of Object.entries(patch)) {
    next[key] = mergeDummyPatch(base[key], patchValue);
  }
  return next;
};
export const hasLetterLayout = (formpackId: string | null): boolean =>
  formpackId === DOCTOR_LETTER_FORMPACK_ID ||
  formpackId === OFFLABEL_ANTRAG_FORMPACK_ID;
