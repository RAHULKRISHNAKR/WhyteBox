/**
 * Formatter Utility Tests
 * 
 * Unit tests for formatting utility functions
 */

import { describe, it, expect } from 'vitest';

/**
 * Format duration in minutes to human-readable string
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};

/**
 * Format score as percentage
 */
export const formatScore = (score: number): string => {
  return `${Math.round(score)}%`;
};

/**
 * Format date to relative time
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format difficulty level
 */
export const formatDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced' | 'easy' | 'medium' | 'hard'): string => {
  const map: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  };
  return map[difficulty] || difficulty;
};

describe('Formatter Utilities', () => {
  describe('formatDuration', () => {
    it('should format minutes correctly', () => {
      expect(formatDuration(30)).toBe('30 min');
      expect(formatDuration(45)).toBe('45 min');
      expect(formatDuration(59)).toBe('59 min');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(120)).toBe('2h');
      expect(formatDuration(180)).toBe('3h');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatDuration(90)).toBe('1h 30min');
      expect(formatDuration(135)).toBe('2h 15min');
      expect(formatDuration(195)).toBe('3h 15min');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0 min');
    });
  });

  describe('formatScore', () => {
    it('should format score as percentage', () => {
      expect(formatScore(85.5)).toBe('86%');
      expect(formatScore(72.3)).toBe('72%');
      expect(formatScore(100)).toBe('100%');
    });

    it('should round to nearest integer', () => {
      expect(formatScore(85.4)).toBe('85%');
      expect(formatScore(85.6)).toBe('86%');
    });

    it('should handle zero', () => {
      expect(formatScore(0)).toBe('0%');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent times', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should format minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60000);
      expect(formatRelativeTime(date)).toBe('5 min ago');
    });

    it('should format hours ago', () => {
      const date = new Date(Date.now() - 2 * 3600000);
      expect(formatRelativeTime(date)).toBe('2 hours ago');
    });

    it('should format single hour correctly', () => {
      const date = new Date(Date.now() - 1 * 3600000);
      expect(formatRelativeTime(date)).toBe('1 hour ago');
    });

    it('should format days ago', () => {
      const date = new Date(Date.now() - 3 * 86400000);
      expect(formatRelativeTime(date)).toBe('3 days ago');
    });

    it('should format single day correctly', () => {
      const date = new Date(Date.now() - 1 * 86400000);
      expect(formatRelativeTime(date)).toBe('1 day ago');
    });

    it('should format old dates as date string', () => {
      const date = new Date(Date.now() - 10 * 86400000);
      expect(formatRelativeTime(date)).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(100)).toBe('100');
      expect(formatNumber(999)).toBe('999');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that needs to be truncated';
      expect(truncateText(text, 20)).toBe('This is a very lo...');
    });

    it('should not truncate short text', () => {
      const text = 'Short text';
      expect(truncateText(text, 20)).toBe('Short text');
    });

    it('should handle exact length', () => {
      const text = 'Exactly twenty chars';
      expect(truncateText(text, 20)).toBe('Exactly twenty chars');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('formatDifficulty', () => {
    it('should format tutorial difficulties', () => {
      expect(formatDifficulty('beginner')).toBe('Beginner');
      expect(formatDifficulty('intermediate')).toBe('Intermediate');
      expect(formatDifficulty('advanced')).toBe('Advanced');
    });

    it('should format quiz difficulties', () => {
      expect(formatDifficulty('easy')).toBe('Easy');
      expect(formatDifficulty('medium')).toBe('Medium');
      expect(formatDifficulty('hard')).toBe('Hard');
    });

    it('should handle unknown difficulty', () => {
      expect(formatDifficulty('expert' as any)).toBe('expert');
    });
  });
});

// Made with Bob
