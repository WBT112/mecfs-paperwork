import { isRecord } from './utils';

export const hasPreviewValue = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'number') {
    return true;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasPreviewValue(entry));
  }
  if (isRecord(value)) {
    return Object.values(value).some((entry) => hasPreviewValue(entry));
  }
  return false;
};
