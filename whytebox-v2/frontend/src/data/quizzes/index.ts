/**
 * Quiz Data Service
 * Manages quiz data and provides utility functions
 */

import { Quiz, QuizFilters, QuizSortBy, QuizResult } from '../../types/quiz';
import { gradcamBasicsQuiz } from './gradcam-basics';
import { neuralNetworksIntroQuiz } from './neural-networks-intro';

/**
 * All available quizzes
 */
export const allQuizzes: Quiz[] = [
  neuralNetworksIntroQuiz,
  gradcamBasicsQuiz,
];

/**
 * Get all quizzes
 */
export const getAllQuizzes = (): Quiz[] => {
  return allQuizzes;
};

/**
 * Get quiz by ID
 */
export const getQuizById = (id: string): Quiz | undefined => {
  return allQuizzes.find(quiz => quiz.id === id);
};

/**
 * Get quizzes by category
 */
export const getQuizzesByCategory = (category: string): Quiz[] => {
  return allQuizzes.filter(quiz => quiz.category === category);
};

/**
 * Get all categories
 */
export const getAllCategories = (): string[] => {
  const categories = new Set(allQuizzes.map(quiz => quiz.category));
  return Array.from(categories).sort();
};

/**
 * Filter quizzes
 */
export const filterQuizzes = (filters: QuizFilters): Quiz[] => {
  let filtered = [...allQuizzes];

  if (filters.category) {
    filtered = filtered.filter(quiz => quiz.category === filters.category);
  }

  if (filters.difficulty) {
    filtered = filtered.filter(quiz => quiz.difficulty === filters.difficulty);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(quiz =>
      filters.tags!.some(tag => quiz.tags.includes(tag))
    );
  }

  return filtered;
};

/**
 * Sort quizzes
 */
export const sortQuizzes = (quizzes: Quiz[], sortBy: QuizSortBy): Quiz[] => {
  const sorted = [...quizzes];

  switch (sortBy) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    
    case 'difficulty':
      const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
      return sorted.sort((a, b) => 
        difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
      );
    
    case 'estimatedTime':
      return sorted.sort((a, b) => a.estimatedTime - b.estimatedTime);
    
    case 'recentlyAdded':
      return sorted.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    
    case 'popularity':
      // TODO: Implement based on attempt count
      return sorted;
    
    case 'myScore':
      // TODO: Implement based on user scores
      return sorted;
    
    default:
      return sorted;
  }
};

/**
 * Search quizzes
 */
export const searchQuizzes = (query: string): Quiz[] => {
  const lowerQuery = query.toLowerCase();
  return allQuizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(lowerQuery) ||
    quiz.description.toLowerCase().includes(lowerQuery) ||
    quiz.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Get user's quiz history from localStorage
 */
export const getUserQuizHistory = (): QuizResult[] => {
  try {
    const history = localStorage.getItem('quizHistory');
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to load quiz history:', error);
    return [];
  }
};

/**
 * Get user's best score for a quiz
 */
export const getUserBestScore = (quizId: string): number | undefined => {
  const history = getUserQuizHistory();
  const quizResults = history.filter(result => result.quizId === quizId);
  
  if (quizResults.length === 0) return undefined;
  
  return Math.max(...quizResults.map(result => result.score));
};

/**
 * Check if user has completed a quiz
 */
export const hasUserCompletedQuiz = (quizId: string): boolean => {
  const history = getUserQuizHistory();
  return history.some(result => result.quizId === quizId && result.passed);
};

/**
 * Get quiz statistics
 */
export const getQuizStatistics = (quizId: string) => {
  const history = getUserQuizHistory();
  const quizResults = history.filter(result => result.quizId === quizId);
  
  if (quizResults.length === 0) {
    return {
      attempts: 0,
      bestScore: 0,
      averageScore: 0,
      completed: false,
    };
  }
  
  const scores = quizResults.map(result => result.score);
  const bestScore = Math.max(...scores);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const completed = quizResults.some(result => result.passed);
  
  return {
    attempts: quizResults.length,
    bestScore,
    averageScore,
    completed,
  };
};

/**
 * Get recommended quizzes based on user progress
 */
export const getRecommendedQuizzes = (limit: number = 3): Quiz[] => {
  const history = getUserQuizHistory();
  const completedQuizIds = new Set(
    history.filter(result => result.passed).map(result => result.quizId)
  );
  
  // Get incomplete quizzes
  const incomplete = allQuizzes.filter(quiz => !completedQuizIds.has(quiz.id));
  
  // Sort by difficulty (easier first) and return limited number
  return incomplete
    .sort((a, b) => {
      const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    })
    .slice(0, limit);
};

/**
 * Get all unique tags
 */
export const getAllTags = (): string[] => {
  const tags = new Set<string>();
  allQuizzes.forEach(quiz => {
    quiz.tags.forEach(tag => tags.add(tag));
  });
  return Array.from(tags).sort();
};

/**
 * Calculate overall progress
 */
export const calculateOverallProgress = () => {
  const history = getUserQuizHistory();
  const completedQuizzes = new Set(
    history.filter(result => result.passed).map(result => result.quizId)
  );
  
  const totalQuizzes = allQuizzes.length;
  const completedCount = completedQuizzes.size;
  const percentage = totalQuizzes > 0 ? (completedCount / totalQuizzes) * 100 : 0;
  
  return {
    total: totalQuizzes,
    completed: completedCount,
    percentage,
  };
};

/**
 * Export quiz result as JSON
 */
export const exportQuizResult = (result: QuizResult): string => {
  return JSON.stringify(result, null, 2);
};

/**
 * Clear quiz history
 */
export const clearQuizHistory = (): void => {
  localStorage.removeItem('quizHistory');
  localStorage.removeItem('currentQuizAttempt');
};

// Made with Bob
