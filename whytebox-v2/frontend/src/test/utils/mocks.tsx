/**
 * Mock Providers and Components
 * 
 * Reusable mocks for testing
 */

import React from 'react';
import { vi } from 'vitest';

/**
 * Mock Tutorial Context
 */
export const mockTutorialContext = {
  tutorials: [],
  currentTutorial: null,
  loading: false,
  error: null,
  completedSteps: new Set<string>(),
  loadTutorials: vi.fn(),
  setCurrentTutorial: vi.fn(),
  completeStep: vi.fn(),
  resetProgress: vi.fn(),
};

/**
 * Mock Quiz Context
 */
export const mockQuizContext = {
  quizzes: [],
  currentQuiz: null,
  loading: false,
  error: null,
  completedQuizzes: new Map(),
  loadQuizzes: vi.fn(),
  setCurrentQuiz: vi.fn(),
  submitQuiz: vi.fn(),
  resetQuiz: vi.fn(),
};

/**
 * Mock Learning Path Context
 */
export const mockLearningPathContext = {
  learningPaths: [],
  currentPath: null,
  loading: false,
  error: null,
  completedItems: new Set<string>(),
  loadLearningPaths: vi.fn(),
  setCurrentPath: vi.fn(),
  completeItem: vi.fn(),
  resetProgress: vi.fn(),
};

/**
 * Mock Video Context
 */
export const mockVideoContext = {
  videos: [],
  currentVideo: null,
  loading: false,
  error: null,
  watchedVideos: new Set<string>(),
  loadVideos: vi.fn(),
  setCurrentVideo: vi.fn(),
  markAsWatched: vi.fn(),
};

/**
 * Mock Documentation Context
 */
export const mockDocumentationContext = {
  articles: [],
  currentArticle: null,
  loading: false,
  error: null,
  searchResults: [],
  loadArticles: vi.fn(),
  setCurrentArticle: vi.fn(),
  searchArticles: vi.fn(),
};

/**
 * Mock Example Project Context
 */
export const mockExampleProjectContext = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  completedProjects: new Set<string>(),
  loadProjects: vi.fn(),
  setCurrentProject: vi.fn(),
  markAsCompleted: vi.fn(),
};

/**
 * Mock Community Context
 */
export const mockCommunityContext = {
  posts: [],
  currentPost: null,
  loading: false,
  error: null,
  loadPosts: vi.fn(),
  setCurrentPost: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  addComment: vi.fn(),
  likePost: vi.fn(),
};

/**
 * Mock Gamification Context
 */
export const mockGamificationContext = {
  achievements: [],
  userProgress: {
    level: 1,
    xp: 0,
    nextLevelXp: 100,
    streak: 0,
    totalPoints: 0,
  },
  unlockedAchievements: new Set<string>(),
  loading: false,
  error: null,
  loadAchievements: vi.fn(),
  awardXP: vi.fn(),
  unlockAchievement: vi.fn(),
};

/**
 * Mock Monaco Editor
 */
export const MockMonacoEditor: React.FC<any> = ({ value, onChange }) => (
  <textarea
    data-testid="mock-monaco-editor"
    value={value}
    onChange={(e) => onChange?.(e.target.value)}
  />
);

/**
 * Mock BabylonJS Scene
 */
export const MockBabylonScene: React.FC<any> = ({ children }) => (
  <div data-testid="mock-babylon-scene">{children}</div>
);

/**
 * Mock API Client
 */
export const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
};

/**
 * Mock Router
 */
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  pathname: '/',
  query: {},
};

/**
 * Create mock intersection observer
 */
export const createMockIntersectionObserver = () => {
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();

  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe,
    unobserve,
    disconnect,
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: () => [],
  })) as any;

  return { observe, unobserve, disconnect };
};

/**
 * Create mock resize observer
 */
export const createMockResizeObserver = () => {
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();

  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe,
    unobserve,
    disconnect,
  })) as any;

  return { observe, unobserve, disconnect };
};

// Made with Bob
