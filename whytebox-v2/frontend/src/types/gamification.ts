/**
 * Gamification & Achievements Type Definitions
 * 
 * Comprehensive type system for gamification including:
 * - Achievement system with unlocking mechanics
 * - Badge collection and display
 * - Point system and rewards
 * - Streak tracking
 * - Leaderboards and rankings
 * - Challenges and competitions
 * - Daily goals and missions
 */

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  requirements: AchievementRequirement[];
  rewards: Reward[];
  isSecret: boolean; // Hidden until unlocked
  isRepeatable: boolean;
  maxRepetitions?: number;
}

/**
 * Achievement categories
 */
export type AchievementCategory = 
  | 'learning'
  | 'projects'
  | 'community'
  | 'contributions'
  | 'special'
  | 'seasonal';

/**
 * Achievement rarity levels
 */
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

/**
 * Achievement requirement
 */
export interface AchievementRequirement {
  type: RequirementType;
  target: number;
  current: number;
  description: string;
}

/**
 * Requirement types
 */
export type RequirementType = 
  | 'complete-tutorials'
  | 'pass-quizzes'
  | 'finish-projects'
  | 'earn-points'
  | 'maintain-streak'
  | 'share-projects'
  | 'help-others'
  | 'write-comments'
  | 'receive-likes'
  | 'follow-users';

/**
 * User achievement progress
 */
export interface UserAchievement {
  achievementId: string;
  achievement: Achievement;
  progress: number; // 0-100
  unlockedAt?: Date;
  isUnlocked: boolean;
  timesCompleted: number;
}

/**
 * Badge
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: BadgeCategory;
  earnedAt: Date;
  displayOrder: number;
}

/**
 * Badge categories
 */
export type BadgeCategory = 
  | 'milestone'
  | 'skill'
  | 'contribution'
  | 'special-event'
  | 'verified';

/**
 * Reward
 */
export interface Reward {
  type: RewardType;
  value: number | string;
  description: string;
}

/**
 * Reward types
 */
export type RewardType = 
  | 'points'
  | 'badge'
  | 'title'
  | 'avatar-frame'
  | 'theme'
  | 'feature-unlock';

/**
 * Point transaction
 */
export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  type: PointTransactionType;
  reason: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Point transaction types
 */
export type PointTransactionType = 
  | 'earned'
  | 'spent'
  | 'bonus'
  | 'penalty'
  | 'refund';

/**
 * Streak information
 */
export interface Streak {
  userId: string;
  currentStreak: number; // days
  longestStreak: number; // days
  lastActivityDate: Date;
  streakStartDate: Date;
  isActive: boolean;
  freezesAvailable: number; // Streak protection
}

/**
 * Daily goal
 */
export interface DailyGoal {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: GoalType;
  target: number;
  current: number;
  points: number;
  expiresAt: Date;
  isCompleted: boolean;
  completedAt?: Date;
}

/**
 * Goal types
 */
export type GoalType = 
  | 'complete-tutorial'
  | 'pass-quiz'
  | 'work-on-project'
  | 'help-community'
  | 'learn-minutes'
  | 'earn-points';

/**
 * Challenge
 */
export interface Challenge {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  duration: number; // minutes
  startDate: Date;
  endDate: Date;
  participants: number;
  maxParticipants?: number;
  prizes: Prize[];
  requirements: ChallengeRequirement[];
  leaderboard: ChallengeLeaderboardEntry[];
  isActive: boolean;
  isFeatured: boolean;
}

/**
 * Challenge requirement
 */
export interface ChallengeRequirement {
  type: string;
  description: string;
  points: number;
}

/**
 * Prize
 */
export interface Prize {
  rank: number;
  title: string;
  description: string;
  rewards: Reward[];
}

/**
 * Challenge leaderboard entry
 */
export interface ChallengeLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  score: number;
  completedAt: Date;
}

/**
 * User participation in challenge
 */
export interface ChallengeParticipation {
  challengeId: string;
  userId: string;
  joinedAt: Date;
  progress: number; // 0-100
  score: number;
  rank?: number;
  isCompleted: boolean;
  completedAt?: Date;
}

/**
 * Level system
 */
export interface Level {
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number;
  perks: string[];
  icon: string;
  color: string;
}

/**
 * User level progress
 */
export interface UserLevel {
  currentLevel: number;
  currentPoints: number;
  pointsToNextLevel: number;
  progressPercentage: number;
  levelInfo: Level;
  nextLevelInfo?: Level;
}

/**
 * Title (user rank/title)
 */
export interface Title {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

/**
 * Milestone
 */
export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  target: number;
  current: number;
  isCompleted: boolean;
  completedAt?: Date;
  rewards: Reward[];
}

/**
 * Quest (multi-step achievement)
 */
export interface Quest {
  id: string;
  title: string;
  description: string;
  storyline: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // minutes
  steps: QuestStep[];
  rewards: Reward[];
  isActive: boolean;
  isCompleted: boolean;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Quest step
 */
export interface QuestStep {
  id: string;
  order: number;
  title: string;
  description: string;
  requirement: AchievementRequirement;
  isCompleted: boolean;
  completedAt?: Date;
}

/**
 * Gamification statistics
 */
export interface GamificationStats {
  totalPoints: number;
  totalAchievements: number;
  unlockedAchievements: number;
  totalBadges: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  rank: number;
  completedChallenges: number;
  completedQuests: number;
  dailyGoalsCompleted: number;
}

/**
 * Notification for gamification events
 */
export interface GamificationNotification {
  id: string;
  type: 'achievement' | 'badge' | 'level-up' | 'streak' | 'challenge' | 'reward';
  title: string;
  message: string;
  icon: string;
  data: any;
  createdAt: Date;
  isRead: boolean;
}

/**
 * Reward shop item
 */
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ShopCategory;
  price: number; // points
  type: RewardType;
  value: string;
  isAvailable: boolean;
  isPurchased: boolean;
  purchasedAt?: Date;
}

/**
 * Shop categories
 */
export type ShopCategory = 
  | 'avatars'
  | 'themes'
  | 'titles'
  | 'badges'
  | 'features'
  | 'boosts';

/**
 * Boost (temporary power-up)
 */
export interface Boost {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: BoostType;
  multiplier: number;
  duration: number; // minutes
  isActive: boolean;
  activatedAt?: Date;
  expiresAt?: Date;
}

/**
 * Boost types
 */
export type BoostType = 
  | 'points-multiplier'
  | 'xp-multiplier'
  | 'streak-freeze'
  | 'double-rewards';

// Made with Bob
