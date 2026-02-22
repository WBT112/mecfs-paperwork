/**
 * Static registry of formpacks available to the app.
 */
export const FORMPACK_IDS = [
  'doctor-letter',
  'notfallpass',
  'offlabel-antrag',
] as const;

export type FormpackId = (typeof FORMPACK_IDS)[number];
