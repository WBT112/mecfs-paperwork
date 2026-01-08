/**
 * Static registry of formpacks available to the app.
 */
export const FORMPACK_IDS = ['notfallpass'] as const;

export type FormpackId = (typeof FORMPACK_IDS)[number];
