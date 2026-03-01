/**
 * Test Helper Functions
 *
 * Common utilities for testing
 */

import { waitFor } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Wait for a condition to be true
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 3000
): Promise<void> => {
  await waitFor(() => {
    if (!condition()) {
      throw new Error('Condition not met');
    }
  }, { timeout });
};

/**
 * Create a mock file for file upload tests
 */
export const createMockFile = (
  name: string,
  size: number,
  type: string
): File => {
  const blob = new Blob(['a'.repeat(size)], { type });
  return new File([blob], name, { type });
};

/**
 * Mock localStorage
 */
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
};

/**
 * Create mock tutorial data
 */
export const createMockTutorial = (overrides = {}) => ({
  id: 'test-tutorial',
  title: 'Test Tutorial',
  description: 'Test description',
  difficulty: 'beginner' as const,
  duration: 30,
  category: 'basics' as const,
  steps: [],
  prerequisites: [],
  learningObjectives: [],
  tags: [],
  ...overrides,
});

/**
 * Create mock quiz data
 */
export const createMockQuiz = (overrides = {}) => ({
  id: 'test-quiz',
  title: 'Test Quiz',
  description: 'Test description',
  difficulty: 'beginner' as const,
  category: 'basics' as const,
  questions: [],
  passingScore: 70,
  timeLimit: 600,
  tags: [],
  ...overrides,
});

/**
 * Create mock learning path data
 */
export const createMockLearningPath = (overrides = {}) => ({
  id: 'test-path',
  title: 'Test Learning Path',
  description: 'Test description',
  difficulty: 'beginner' as const,
  estimatedHours: 10,
  items: [],
  prerequisites: [],
  learningObjectives: [],
  tags: [],
  ...overrides,
});

/**
 * Create mock user data
 */
export const createMockUser = (overrides = {}) => ({
  id: 'test-user',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user' as const,
  createdAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Delay execution for testing async operations
 */
export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a mock API response
 */
export const createMockResponse = <T>(data: T, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
  headers: new Headers(),
});

/**
 * Mock fetch for API testing
 */
export const mockFetch = (response: any) => {
  global.fetch = vi.fn().mockResolvedValue(createMockResponse(response));
};

/**
 * Reset all mocks
 */
export const resetAllMocks = () => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
};

// Made with Bob
