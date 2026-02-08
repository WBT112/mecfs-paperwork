import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  pushError,
  getErrors,
  clearErrors,
  getErrorCount,
  installGlobalErrorListeners,
} from '../../../src/lib/diagnostics/errorRingBuffer';

describe('errorRingBuffer', () => {
  beforeEach(() => {
    clearErrors();
  });

  describe('pushError / getErrors', () => {
    it('stores errors with timestamp and source', () => {
      pushError('Something failed', 'test');
      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Something failed');
      expect(errors[0]).toContain('(test)');
    });

    it('maintains insertion order', () => {
      pushError('First', 'a');
      pushError('Second', 'b');
      const errors = getErrors();
      expect(errors[0]).toContain('First');
      expect(errors[1]).toContain('Second');
    });

    it('truncates long messages to 500 chars', () => {
      const longMessage = 'x'.repeat(600);
      pushError(longMessage, 'test');
      const errors = getErrors();
      expect(errors[0].length).toBeLessThan(700);
    });

    it('truncates long sources to 100 chars', () => {
      const longSource = 'y'.repeat(200);
      pushError('error', longSource);
      const errors = getErrors();
      expect(errors[0]).toContain('y'.repeat(100));
      expect(errors[0]).not.toContain('y'.repeat(101));
    });
  });

  describe('ring buffer eviction', () => {
    it('keeps at most 50 errors', () => {
      for (let i = 0; i < 60; i++) {
        pushError(`Error ${i}`, 'test');
      }
      expect(getErrorCount()).toBe(50);
      const errors = getErrors();
      expect(errors[0]).toContain('Error 10');
      expect(errors[49]).toContain('Error 59');
    });
  });

  describe('clearErrors', () => {
    it('removes all stored errors', () => {
      pushError('Error', 'test');
      expect(getErrorCount()).toBe(1);
      clearErrors();
      expect(getErrorCount()).toBe(0);
      expect(getErrors()).toEqual([]);
    });
  });

  describe('getErrorCount', () => {
    it('returns current count', () => {
      expect(getErrorCount()).toBe(0);
      pushError('a', 'test');
      expect(getErrorCount()).toBe(1);
      pushError('b', 'test');
      expect(getErrorCount()).toBe(2);
    });
  });

  describe('installGlobalErrorListeners', () => {
    let cleanup: (() => void) | undefined;

    afterEach(() => {
      cleanup?.();
    });

    it('captures window error events', () => {
      cleanup = installGlobalErrorListeners();
      const event = new ErrorEvent('error', {
        message: 'Test error event',
      });
      window.dispatchEvent(event);
      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Test error event');
      expect(errors[0]).toContain('window.onerror');
    });

    it('captures unhandled promise rejections', () => {
      cleanup = installGlobalErrorListeners();
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('Async failure'),
      });
      window.dispatchEvent(event);
      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Async failure');
      expect(errors[0]).toContain('unhandledrejection');
    });

    it('handles non-Error rejection reasons', () => {
      cleanup = installGlobalErrorListeners();
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: 'string reason',
      });
      window.dispatchEvent(event);
      const errors = getErrors();
      expect(errors[0]).toContain('string reason');
    });

    it('returns a cleanup function that removes listeners', () => {
      cleanup = installGlobalErrorListeners();
      cleanup();
      cleanup = undefined;

      const event = new ErrorEvent('error', { message: 'Should not capture' });
      window.dispatchEvent(event);
      expect(getErrors()).toHaveLength(0);
    });

    it('uses fallback message for empty error events', () => {
      cleanup = installGlobalErrorListeners();
      // ErrorEvent with empty message
      const event = new ErrorEvent('error', { message: '' });
      window.dispatchEvent(event);
      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Unknown error');
    });

    it('handles null rejection reason', () => {
      cleanup = installGlobalErrorListeners();
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: null,
      });
      window.dispatchEvent(event);
      const errors = getErrors();
      expect(errors[0]).toContain('Unhandled rejection');
    });
  });
});
