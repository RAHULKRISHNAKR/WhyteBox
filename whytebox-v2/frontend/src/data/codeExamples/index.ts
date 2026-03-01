/**
 * Code Examples Index
 * Exports all code examples and challenges
 */

import { CodeExample, CodeChallenge } from '../../types/codeExample';
import { gradcamBasicExample } from './gradcam-basic';
import { modelLoadingChallenge } from './model-loading-challenge';

/**
 * All code examples
 */
export const allCodeExamples: CodeExample[] = [
  gradcamBasicExample,
];

/**
 * All code challenges
 */
export const allCodeChallenges: CodeChallenge[] = [
  modelLoadingChallenge,
];

/**
 * Combined list of all examples and challenges
 */
export const allCode: (CodeExample | CodeChallenge)[] = [
  ...allCodeExamples,
  ...allCodeChallenges,
];

/**
 * Get code example by ID
 */
export const getCodeExampleById = (id: string): CodeExample | CodeChallenge | undefined => {
  return allCode.find(example => example.id === id);
};

/**
 * Get examples by category
 */
export const getCodeExamplesByCategory = (category: string): (CodeExample | CodeChallenge)[] => {
  return allCode.filter(example => example.category === category);
};

/**
 * Get examples by difficulty
 */
export const getCodeExamplesByDifficulty = (
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): (CodeExample | CodeChallenge)[] => {
  return allCode.filter(example => example.difficulty === difficulty);
};

/**
 * Get examples by language
 */
export const getCodeExamplesByLanguage = (language: string): (CodeExample | CodeChallenge)[] => {
  return allCode.filter(example => example.language === language);
};

/**
 * Search code examples
 */
export const searchCodeExamples = (query: string): (CodeExample | CodeChallenge)[] => {
  const lowerQuery = query.toLowerCase();
  return allCode.filter(example => {
    return (
      example.title.toLowerCase().includes(lowerQuery) ||
      example.description.toLowerCase().includes(lowerQuery) ||
      example.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  });
};

/**
 * Get all unique categories
 */
export const getAllCategories = (): string[] => {
  const categories = new Set(allCode.map(e => e.category));
  return Array.from(categories);
};

/**
 * Get all unique tags
 */
export const getAllTags = (): string[] => {
  const tags = new Set(allCode.flatMap(e => e.tags));
  return Array.from(tags);
};

/**
 * Get challenges only
 */
export const getChallenges = (): CodeChallenge[] => {
  return allCode.filter(example => 'points' in example) as CodeChallenge[];
};

/**
 * Get examples only (not challenges)
 */
export const getExamples = (): CodeExample[] => {
  return allCode.filter(example => !('points' in example)) as CodeExample[];
};

/**
 * Calculate total points available from challenges
 */
export const getTotalChallengePoints = (): number => {
  return getChallenges().reduce((sum, challenge) => sum + challenge.points, 0);
};

// Made with Bob
