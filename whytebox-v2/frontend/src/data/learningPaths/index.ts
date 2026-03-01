/**
 * Learning Paths Data Service
 * Manages learning path data and provides utility functions
 */

import { LearningPath, PathFilters, PathSortBy, PathProgress } from '../../types/learningPath';
import { aiExplainabilityFundamentals } from './ai-explainability-fundamentals';

/**
 * All available learning paths
 */
export const allLearningPaths: LearningPath[] = [
  aiExplainabilityFundamentals,
];

/**
 * Get all learning paths
 */
export const getAllPaths = (): LearningPath[] => {
  return allLearningPaths;
};

/**
 * Get path by ID
 */
export const getPathById = (id: string): LearningPath | undefined => {
  return allLearningPaths.find(path => path.id === id);
};

/**
 * Get paths by category
 */
export const getPathsByCategory = (category: string): LearningPath[] => {
  return allLearningPaths.filter(path => path.category === category);
};

/**
 * Get all categories
 */
export const getAllCategories = (): string[] => {
  const categories = new Set(allLearningPaths.map(path => path.category));
  return Array.from(categories).sort();
};

/**
 * Filter learning paths
 */
export const filterPaths = (filters: PathFilters): LearningPath[] => {
  let filtered = [...allLearningPaths];

  if (filters.difficulty) {
    filtered = filtered.filter(path => path.difficulty === filters.difficulty);
  }

  if (filters.category) {
    filtered = filtered.filter(path => path.category === filters.category);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(path =>
      filters.tags!.some(tag => path.tags.includes(tag))
    );
  }

  if (filters.certificateAvailable !== undefined) {
    filtered = filtered.filter(path => path.certificateAvailable === filters.certificateAvailable);
  }

  if (filters.minHours !== undefined) {
    filtered = filtered.filter(path => path.estimatedHours >= filters.minHours!);
  }

  if (filters.maxHours !== undefined) {
    filtered = filtered.filter(path => path.estimatedHours <= filters.maxHours!);
  }

  return filtered;
};

/**
 * Sort learning paths
 */
export const sortPaths = (paths: LearningPath[], sortBy: PathSortBy): LearningPath[] => {
  const sorted = [...paths];

  switch (sortBy) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    
    case 'difficulty':
      const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
      return sorted.sort((a, b) => 
        difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
      );
    
    case 'duration':
      return sorted.sort((a, b) => a.estimatedHours - b.estimatedHours);
    
    case 'newest':
      return sorted.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    
    case 'popularity':
      // TODO: Implement based on enrollment count
      return sorted;
    
    case 'recommended':
      // TODO: Implement based on user progress and preferences
      return sorted;
    
    default:
      return sorted;
  }
};

/**
 * Search learning paths
 */
export const searchPaths = (query: string): LearningPath[] => {
  const lowerQuery = query.toLowerCase();
  return allLearningPaths.filter(path =>
    path.title.toLowerCase().includes(lowerQuery) ||
    path.description.toLowerCase().includes(lowerQuery) ||
    path.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    path.skills.some(skill => skill.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Get user's enrolled paths from localStorage
 */
export const getEnrolledPaths = (): Map<string, PathProgress> => {
  try {
    const saved = localStorage.getItem('enrolledPaths');
    if (!saved) return new Map();
    
    const parsed = JSON.parse(saved);
    return new Map(Object.entries(parsed).map(([key, value]: [string, any]) => {
      const progress: PathProgress = {
        ...value,
        startedAt: new Date(value.startedAt),
        completedAt: value.completedAt ? new Date(value.completedAt) : undefined,
        milestoneProgress: new Map(Object.entries(value.milestoneProgress || {}).map(([k, v]: [string, any]) => [
          k,
          {
            ...v,
            completedItems: new Set(v.completedItems),
            completedAt: v.completedAt ? new Date(v.completedAt) : undefined,
          },
        ])),
        itemProgress: new Map(Object.entries(value.itemProgress || {}).map(([k, v]: [string, any]) => [
          k,
          {
            ...v,
            completedAt: v.completedAt ? new Date(v.completedAt) : undefined,
          },
        ])),
      };
      return [key, progress];
    }));
  } catch (error) {
    console.error('Failed to load enrolled paths:', error);
    return new Map();
  }
};

/**
 * Check if user is enrolled in a path
 */
export const isEnrolled = (pathId: string): boolean => {
  const enrolled = getEnrolledPaths();
  return enrolled.has(pathId);
};

/**
 * Get user's progress for a path
 */
export const getPathProgress = (pathId: string): PathProgress | null => {
  const enrolled = getEnrolledPaths();
  return enrolled.get(pathId) || null;
};

/**
 * Calculate overall learning progress
 */
export const calculateOverallProgress = () => {
  const enrolled = getEnrolledPaths();
  const totalPaths = allLearningPaths.length;
  const enrolledCount = enrolled.size;
  const completedCount = Array.from(enrolled.values()).filter(
    p => p.status === 'completed'
  ).length;
  
  return {
    total: totalPaths,
    enrolled: enrolledCount,
    completed: completedCount,
    enrollmentRate: totalPaths > 0 ? (enrolledCount / totalPaths) * 100 : 0,
    completionRate: enrolledCount > 0 ? (completedCount / enrolledCount) * 100 : 0,
  };
};

/**
 * Get recommended paths based on user progress
 */
export const getRecommendedPaths = (limit: number = 3): LearningPath[] => {
  const enrolled = getEnrolledPaths();
  const enrolledIds = new Set(enrolled.keys());
  
  // Get unenrolled paths
  const unenrolled = allLearningPaths.filter(path => !enrolledIds.has(path.id));
  
  // Sort by difficulty (easier first) and return limited number
  return unenrolled
    .sort((a, b) => {
      const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    })
    .slice(0, limit);
};

/**
 * Get all unique tags
 */
export const getAllTags = (): string[] => {
  const tags = new Set<string>();
  allLearningPaths.forEach(path => {
    path.tags.forEach(tag => tags.add(tag));
  });
  return Array.from(tags).sort();
};

/**
 * Get all unique skills
 */
export const getAllSkills = (): string[] => {
  const skills = new Set<string>();
  allLearningPaths.forEach(path => {
    path.skills.forEach(skill => skills.add(skill));
  });
  return Array.from(skills).sort();
};

// Made with Bob
