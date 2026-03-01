/**
 * Learning Path Type Definitions
 * Structured learning journeys with prerequisites and progress tracking
 */

/**
 * Learning path difficulty levels
 */
export type PathDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Learning path status
 */
export type PathStatus = 'not-started' | 'in-progress' | 'completed';

/**
 * Content item types in a learning path
 */
export type ContentItemType = 'tutorial' | 'quiz' | 'code-example' | 'video' | 'reading' | 'project';

/**
 * Content item in a learning path
 */
export interface ContentItem {
  id: string;
  type: ContentItemType;
  title: string;
  description: string;
  estimatedTime: number; // in minutes
  required: boolean;
  resourceId: string; // ID of the actual resource (tutorial, quiz, etc.)
  order: number;
}

/**
 * Learning path milestone
 */
export interface PathMilestone {
  id: string;
  title: string;
  description: string;
  items: ContentItem[];
  requiredCompletions: number; // Number of items that must be completed
  order: number;
}

/**
 * Learning path
 */
export interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: PathDifficulty;
  estimatedHours: number;
  category: string;
  milestones: PathMilestone[];
  prerequisites?: string[]; // IDs of prerequisite paths
  tags: string[];
  skills: string[]; // Skills learned in this path
  certificateAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User's progress on a content item
 */
export interface ContentItemProgress {
  itemId: string;
  completed: boolean;
  completedAt?: Date;
  score?: number; // For quizzes
  timeSpent: number; // in seconds
  attempts: number;
}

/**
 * User's progress on a milestone
 */
export interface MilestoneProgress {
  milestoneId: string;
  completedItems: Set<string>;
  totalItems: number;
  requiredItems: number;
  completed: boolean;
  completedAt?: Date;
}

/**
 * User's progress on a learning path
 */
export interface PathProgress {
  pathId: string;
  userId: string;
  status: PathStatus;
  startedAt: Date;
  completedAt?: Date;
  currentMilestoneIndex: number;
  milestoneProgress: Map<string, MilestoneProgress>;
  itemProgress: Map<string, ContentItemProgress>;
  totalTimeSpent: number; // in seconds
  certificateEarned: boolean;
}

/**
 * Learning path statistics
 */
export interface PathStatistics {
  pathId: string;
  totalEnrollments: number;
  completionRate: number;
  averageCompletionTime: number; // in hours
  averageRating: number;
  totalRatings: number;
}

/**
 * Certificate information
 */
export interface Certificate {
  id: string;
  pathId: string;
  userId: string;
  userName: string;
  pathTitle: string;
  completedAt: Date;
  skills: string[];
  verificationCode: string;
}

/**
 * Learning path recommendation
 */
export interface PathRecommendation {
  path: LearningPath;
  reason: string;
  matchScore: number; // 0-100
  prerequisitesMet: boolean;
}

/**
 * Learning path filter options
 */
export interface PathFilters {
  difficulty?: PathDifficulty;
  category?: string;
  tags?: string[];
  status?: PathStatus;
  minHours?: number;
  maxHours?: number;
  certificateAvailable?: boolean;
}

/**
 * Learning path sort options
 */
export type PathSortBy = 
  | 'title'
  | 'difficulty'
  | 'duration'
  | 'popularity'
  | 'newest'
  | 'recommended';

/**
 * Learning path context state
 */
export interface LearningPathContextState {
  enrolledPaths: Map<string, PathProgress>;
  currentPath: LearningPath | null;
  currentProgress: PathProgress | null;
  isLoading: boolean;
  error: string | null;
}

// Made with Bob
