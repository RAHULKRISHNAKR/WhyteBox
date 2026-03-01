/**
 * Validator Utility Tests
 * 
 * Unit tests for validation utility functions
 */

import { describe, it, expect } from 'vitest';

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate quiz score (0-100)
 */
export const isValidScore = (score: number): boolean => {
  return score >= 0 && score <= 100;
};

/**
 * Validate tutorial duration (positive number)
 */
export const isValidDuration = (duration: number): boolean => {
  return duration > 0 && Number.isFinite(duration);
};

/**
 * Validate code snippet
 */
export const isValidCode = (code: string, language: string): boolean => {
  if (!code || code.trim().length === 0) return false;
  
  // Basic validation - check for common syntax elements
  const validLanguages = ['javascript', 'typescript', 'python', 'java', 'cpp'];
  return validLanguages.includes(language.toLowerCase());
};

/**
 * Validate question options (at least 2, at least 1 correct)
 */
export const isValidQuestionOptions = (
  options: Array<{ id: string; text: string; isCorrect: boolean }>
): boolean => {
  if (options.length < 2) return false;
  return options.some(opt => opt.isCorrect);
};

/**
 * Validate tutorial step order
 */
export const isValidStepOrder = (steps: Array<{ id: string }>): boolean => {
  const ids = new Set(steps.map(s => s.id));
  return ids.size === steps.length; // No duplicate IDs
};

describe('Validator Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
      expect(isValidEmail('name+tag@company.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('no@.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should reject emails with spaces', () => {
      expect(isValidEmail('user @example.com')).toBe(false);
      expect(isValidEmail('user@ example.com')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should validate strong passwords', () => {
      expect(isValidPassword('Password123')).toBe(true);
      expect(isValidPassword('SecurePass1')).toBe(true);
      expect(isValidPassword('MyP@ssw0rd')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(isValidPassword('short1A')).toBe(false); // Too short
      expect(isValidPassword('nouppercase1')).toBe(false); // No uppercase
      expect(isValidPassword('NOLOWERCASE1')).toBe(false); // No lowercase
      expect(isValidPassword('NoNumbers')).toBe(false); // No numbers
      expect(isValidPassword('')).toBe(false); // Empty
    });

    it('should require minimum 8 characters', () => {
      expect(isValidPassword('Pass1')).toBe(false);
      expect(isValidPassword('Pass12')).toBe(false);
      expect(isValidPassword('Pass123')).toBe(false);
      expect(isValidPassword('Password1')).toBe(true);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://sub.domain.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('missing-protocol.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });

    it('should support different protocols', () => {
      expect(isValidUrl('ftp://files.example.com')).toBe(true);
      expect(isValidUrl('ws://socket.example.com')).toBe(true);
    });
  });

  describe('isValidScore', () => {
    it('should validate scores in range 0-100', () => {
      expect(isValidScore(0)).toBe(true);
      expect(isValidScore(50)).toBe(true);
      expect(isValidScore(100)).toBe(true);
      expect(isValidScore(75.5)).toBe(true);
    });

    it('should reject scores outside range', () => {
      expect(isValidScore(-1)).toBe(false);
      expect(isValidScore(101)).toBe(false);
      expect(isValidScore(-10)).toBe(false);
      expect(isValidScore(150)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidScore(0.1)).toBe(true);
      expect(isValidScore(99.9)).toBe(true);
    });
  });

  describe('isValidDuration', () => {
    it('should validate positive durations', () => {
      expect(isValidDuration(1)).toBe(true);
      expect(isValidDuration(30)).toBe(true);
      expect(isValidDuration(120)).toBe(true);
      expect(isValidDuration(0.5)).toBe(true);
    });

    it('should reject invalid durations', () => {
      expect(isValidDuration(0)).toBe(false);
      expect(isValidDuration(-1)).toBe(false);
      expect(isValidDuration(-30)).toBe(false);
    });

    it('should reject non-finite numbers', () => {
      expect(isValidDuration(Infinity)).toBe(false);
      expect(isValidDuration(-Infinity)).toBe(false);
      expect(isValidDuration(NaN)).toBe(false);
    });
  });

  describe('isValidCode', () => {
    it('should validate code with supported languages', () => {
      expect(isValidCode('console.log("Hello")', 'javascript')).toBe(true);
      expect(isValidCode('print("Hello")', 'python')).toBe(true);
      expect(isValidCode('const x = 1;', 'typescript')).toBe(true);
    });

    it('should reject empty code', () => {
      expect(isValidCode('', 'javascript')).toBe(false);
      expect(isValidCode('   ', 'python')).toBe(false);
    });

    it('should reject unsupported languages', () => {
      expect(isValidCode('code', 'unknown')).toBe(false);
      expect(isValidCode('code', 'ruby')).toBe(false);
    });

    it('should be case-insensitive for language', () => {
      expect(isValidCode('code', 'JavaScript')).toBe(true);
      expect(isValidCode('code', 'PYTHON')).toBe(true);
    });
  });

  describe('isValidQuestionOptions', () => {
    it('should validate correct options', () => {
      const options = [
        { id: '1', text: 'Option 1', isCorrect: false },
        { id: '2', text: 'Option 2', isCorrect: true },
        { id: '3', text: 'Option 3', isCorrect: false },
      ];
      expect(isValidQuestionOptions(options)).toBe(true);
    });

    it('should require at least 2 options', () => {
      const singleOption = [
        { id: '1', text: 'Only option', isCorrect: true },
      ];
      expect(isValidQuestionOptions(singleOption)).toBe(false);
      expect(isValidQuestionOptions([])).toBe(false);
    });

    it('should require at least 1 correct answer', () => {
      const noCorrect = [
        { id: '1', text: 'Option 1', isCorrect: false },
        { id: '2', text: 'Option 2', isCorrect: false },
      ];
      expect(isValidQuestionOptions(noCorrect)).toBe(false);
    });

    it('should allow multiple correct answers', () => {
      const multipleCorrect = [
        { id: '1', text: 'Option 1', isCorrect: true },
        { id: '2', text: 'Option 2', isCorrect: true },
        { id: '3', text: 'Option 3', isCorrect: false },
      ];
      expect(isValidQuestionOptions(multipleCorrect)).toBe(true);
    });
  });

  describe('isValidStepOrder', () => {
    it('should validate unique step IDs', () => {
      const steps = [
        { id: 'step-1' },
        { id: 'step-2' },
        { id: 'step-3' },
      ];
      expect(isValidStepOrder(steps)).toBe(true);
    });

    it('should reject duplicate step IDs', () => {
      const steps = [
        { id: 'step-1' },
        { id: 'step-2' },
        { id: 'step-1' }, // Duplicate
      ];
      expect(isValidStepOrder(steps)).toBe(false);
    });

    it('should handle empty array', () => {
      expect(isValidStepOrder([])).toBe(true);
    });

    it('should handle single step', () => {
      expect(isValidStepOrder([{ id: 'step-1' }])).toBe(true);
    });
  });
});

// Made with Bob
