import { describe, it, expect } from 'vitest';
import {
  isForbiddenKey,
  containsForbiddenPattern,
  redactValue,
  redactObject,
} from '../../../src/lib/diagnostics/redact';

describe('redact', () => {
  describe('isForbiddenKey', () => {
    it('returns true for known sensitive keys', () => {
      const sensitiveKeys = [
        'data',
        'title',
        'label',
        'value',
        'text',
        'content',
        'body',
        'payload',
        'password',
        'secret',
        'token',
        'cookie',
        'session',
        'authorization',
        'name',
        'email',
        'phone',
        'address',
        'diagnosis',
        'medication',
        'symptom',
        'treatment',
        'doctor',
        'patient',
        'health',
        'medical',
        'condition',
      ];

      for (const key of sensitiveKeys) {
        expect(isForbiddenKey(key)).toBe(true);
      }
    });

    it('is case-insensitive', () => {
      expect(isForbiddenKey('Password')).toBe(true);
      expect(isForbiddenKey('DATA')).toBe(true);
      expect(isForbiddenKey('Token')).toBe(true);
    });

    it('returns false for safe keys', () => {
      expect(isForbiddenKey('version')).toBe(false);
      expect(isForbiddenKey('buildDate')).toBe(false);
      expect(isForbiddenKey('userAgent')).toBe(false);
      expect(isForbiddenKey('scope')).toBe(false);
      expect(isForbiddenKey('entryCount')).toBe(false);
    });
  });

  describe('containsForbiddenPattern', () => {
    it('detects email addresses', () => {
      expect(containsForbiddenPattern('user@example.com')).toBe(true);
      expect(containsForbiddenPattern('contact test@mail.org now')).toBe(true);
    });

    it('detects date-like patterns', () => {
      expect(containsForbiddenPattern('12.03.1990')).toBe(true);
      expect(containsForbiddenPattern('1990-03-12')).toBe(true);
    });

    it('does not flag safe strings', () => {
      expect(containsForbiddenPattern('workbox-precache-v2')).toBe(false);
      expect(containsForbiddenPattern('chromium')).toBe(false);
      expect(containsForbiddenPattern('abc123')).toBe(false);
    });
  });

  describe('redactValue', () => {
    it('redacts values with forbidden keys', () => {
      expect(redactValue('password', 'secret123')).toBe('[REDACTED]');
      expect(redactValue('diagnosis', 'ME/CFS')).toBe('[REDACTED]');
    });

    it('redacts strings containing forbidden patterns', () => {
      expect(redactValue('info', 'user@example.com')).toBe('[REDACTED]');
    });

    it('passes through safe values', () => {
      expect(redactValue('version', '1.0.0')).toBe('1.0.0');
      expect(redactValue('count', 42)).toBe(42);
    });
  });

  describe('redactObject', () => {
    it('redacts sensitive keys in flat objects', () => {
      const input = {
        version: '1.0',
        password: 'secret',
        diagnosis: 'ME/CFS',
      };
      const result = redactObject(input);
      expect(result.version).toBe('1.0');
      expect(result.password).toBe('[REDACTED]');
      expect(result.diagnosis).toBe('[REDACTED]');
    });

    it('redacts nested objects recursively', () => {
      const input = {
        app: { version: '1.0', data: 'sensitive' },
        count: 5,
      };
      const result = redactObject(input);
      expect((result.app as Record<string, unknown>).version).toBe('1.0');
      expect((result.app as Record<string, unknown>).data).toBe('[REDACTED]');
      expect(result.count).toBe(5);
    });

    it('redacts values with forbidden patterns', () => {
      const input = { contact: 'user@example.com' };
      const result = redactObject(input);
      expect(result.contact).toBe('[REDACTED]');
    });

    it('preserves arrays and non-sensitive primitives', () => {
      const input = { languages: ['de', 'en'], count: 3 };
      const result = redactObject(input);
      expect(result.languages).toEqual(['de', 'en']);
      expect(result.count).toBe(3);
    });

    it('does not leak any forbidden keys through nested structures', () => {
      const input = {
        outer: {
          patient: 'John',
          inner: {
            medication: 'Drug A',
            safe: 42,
          },
        },
      };
      const result = redactObject(input);
      const outer = result.outer as Record<string, unknown>;
      expect(outer.patient).toBe('[REDACTED]');
      const inner = outer.inner as Record<string, unknown>;
      expect(inner.medication).toBe('[REDACTED]');
      expect(inner.safe).toBe(42);
    });
  });
});
