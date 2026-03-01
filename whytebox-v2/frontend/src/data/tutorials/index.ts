/**
 * Tutorial Data Index
 * Exports all available tutorials
 */

import { Tutorial } from '../../types/tutorial';
import { gettingStartedTutorial } from './getting-started';
import { understandingGradCAMTutorial } from './understanding-gradcam';
import { modelArchitectureTutorial } from './model-architecture';
import { comparingMethodsTutorial } from './comparing-methods';

/**
 * All available tutorials
 */
export const allTutorials: Tutorial[] = [
  gettingStartedTutorial,
  understandingGradCAMTutorial,
  modelArchitectureTutorial,
  comparingMethodsTutorial,
];

/**
 * Get tutorial by ID
 */
export const getTutorialById = (id: string): Tutorial | undefined => {
  return allTutorials.find(tutorial => tutorial.id === id);
};

/**
 * Get tutorials by category
 */
export const getTutorialsByCategory = (category: string): Tutorial[] => {
  return allTutorials.filter(tutorial => tutorial.category === category);
};

/**
 * Get tutorials by difficulty
 */
export const getTutorialsByDifficulty = (
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): Tutorial[] => {
  return allTutorials.filter(tutorial => tutorial.difficulty === difficulty);
};

/**
 * Get tutorials by tag
 */
export const getTutorialsByTag = (tag: string): Tutorial[] => {
  return allTutorials.filter(tutorial => tutorial.tags.includes(tag));
};

/**
 * Search tutorials
 */
export const searchTutorials = (query: string): Tutorial[] => {
  const lowerQuery = query.toLowerCase();
  return allTutorials.filter(tutorial => {
    return (
      tutorial.title.toLowerCase().includes(lowerQuery) ||
      tutorial.description.toLowerCase().includes(lowerQuery) ||
      tutorial.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  });
};

/**
 * Get all unique categories
 */
export const getAllCategories = (): string[] => {
  const categories = new Set(allTutorials.map(t => t.category));
  return Array.from(categories);
};

/**
 * Get all unique tags
 */
export const getAllTags = (): string[] => {
  const tags = new Set(allTutorials.flatMap(t => t.tags));
  return Array.from(tags);
};

/**
 * Calculate total points available
 */
export const getTotalPointsAvailable = (): number => {
  return allTutorials.reduce((sum, tutorial) => {
    return sum + (tutorial.rewards?.points || 0);
  }, 0);
};

/**
 * Get recommended tutorials based on completed ones
 */
export const getRecommendedTutorials = (
  completedTutorialIds: string[]
): Tutorial[] => {
  return allTutorials.filter(tutorial => {
    // Not already completed
    if (completedTutorialIds.includes(tutorial.id)) {
      return false;
    }

    // Prerequisites met
    if (tutorial.prerequisites) {
      return tutorial.prerequisites.every(prereqId =>
        completedTutorialIds.includes(prereqId)
      );
    }

    return true;
  });
};

// Made with Bob
