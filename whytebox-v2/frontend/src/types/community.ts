/**
 * Community Features Type Definitions
 * 
 * Comprehensive type system for community features including:
 * - User profiles with achievements
 * - Project sharing and showcases
 * - Discussion threads and comments
 * - Collaboration tools
 * - Social interactions (likes, follows, mentions)
 */

/**
 * User profile
 */
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks: SocialLinks;
  joinedAt: Date;
  lastActive: Date;
  stats: UserStats;
  achievements: Achievement[];
  badges: Badge[];
  skills: Skill[];
  interests: string[];
  isVerified: boolean;
  isPremium: boolean;
}

/**
 * Social media links
 */
export interface SocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  portfolio?: string;
}

/**
 * User statistics
 */
export interface UserStats {
  projectsCompleted: number;
  projectsShared: number;
  tutorialsCompleted: number;
  quizzesPassed: number;
  totalPoints: number;
  rank: number;
  followers: number;
  following: number;
  contributions: number;
  streak: number; // days
}

/**
 * Achievement
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  unlockedAt: Date;
  progress?: {
    current: number;
    total: number;
  };
}

/**
 * Achievement categories
 */
export type AchievementCategory = 
  | 'learning'
  | 'projects'
  | 'community'
  | 'contributions'
  | 'special';

/**
 * Badge
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: Date;
}

/**
 * Skill
 */
export interface Skill {
  id: string;
  name: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  endorsements: number;
}

/**
 * Shared project
 */
export interface SharedProject {
  id: string;
  userId: string;
  user: UserProfile;
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  repositoryUrl?: string;
  demoUrl?: string;
  files: ProjectFile[];
  createdAt: Date;
  updatedAt: Date;
  stats: ProjectStats;
  visibility: 'public' | 'unlisted' | 'private';
  isFeatured: boolean;
}

/**
 * Project file
 */
export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  size: number;
}

/**
 * Project statistics
 */
export interface ProjectStats {
  views: number;
  likes: number;
  forks: number;
  comments: number;
  shares: number;
}

/**
 * Discussion thread
 */
export interface DiscussionThread {
  id: string;
  authorId: string;
  author: UserProfile;
  title: string;
  content: string;
  category: DiscussionCategory;
  tags: string[];
  isPinned: boolean;
  isLocked: boolean;
  isSolved: boolean;
  createdAt: Date;
  updatedAt: Date;
  stats: ThreadStats;
  comments: Comment[];
}

/**
 * Discussion categories
 */
export type DiscussionCategory = 
  | 'general'
  | 'help'
  | 'showcase'
  | 'feedback'
  | 'announcements'
  | 'ideas';

/**
 * Thread statistics
 */
export interface ThreadStats {
  views: number;
  replies: number;
  likes: number;
  participants: number;
}

/**
 * Comment
 */
export interface Comment {
  id: string;
  threadId?: string;
  projectId?: string;
  authorId: string;
  author: UserProfile;
  content: string;
  parentId?: string; // For nested comments
  mentions: string[]; // User IDs
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  likes: number;
  isEdited: boolean;
  isDeleted: boolean;
  replies: Comment[];
}

/**
 * Notification
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}

/**
 * Notification types
 */
export type NotificationType = 
  | 'like'
  | 'comment'
  | 'mention'
  | 'follow'
  | 'achievement'
  | 'project-featured'
  | 'reply'
  | 'system';

/**
 * Follow relationship
 */
export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: Date;
}

/**
 * Like
 */
export interface Like {
  id: string;
  userId: string;
  targetType: 'project' | 'comment' | 'thread';
  targetId: string;
  createdAt: Date;
}

/**
 * Collaboration request
 */
export interface CollaborationRequest {
  id: string;
  projectId: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  respondedAt?: Date;
}

/**
 * Collaboration
 */
export interface Collaboration {
  id: string;
  projectId: string;
  members: CollaborationMember[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Collaboration member
 */
export interface CollaborationMember {
  userId: string;
  user: UserProfile;
  role: 'owner' | 'collaborator' | 'viewer';
  joinedAt: Date;
  permissions: CollaborationPermissions;
}

/**
 * Collaboration permissions
 */
export interface CollaborationPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManage: boolean;
}

/**
 * Activity feed item
 */
export interface ActivityItem {
  id: string;
  userId: string;
  user: UserProfile;
  type: ActivityType;
  action: string;
  targetType?: string;
  targetId?: string;
  targetTitle?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Activity types
 */
export type ActivityType = 
  | 'project-shared'
  | 'project-completed'
  | 'achievement-unlocked'
  | 'comment-posted'
  | 'thread-created'
  | 'user-followed'
  | 'project-liked'
  | 'milestone-reached';

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  user: UserProfile;
  score: number;
  change: number; // Position change from previous period
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
}

/**
 * Community statistics
 */
export interface CommunityStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalThreads: number;
  totalComments: number;
  topContributors: UserProfile[];
  featuredProjects: SharedProject[];
  trendingThreads: DiscussionThread[];
}

/**
 * Search filters for community
 */
export interface CommunityFilters {
  userSearch?: string;
  projectCategories: string[];
  projectTags: string[];
  discussionCategories: DiscussionCategory[];
  sortBy: 'recent' | 'popular' | 'trending' | 'top-rated';
  timeRange: 'today' | 'week' | 'month' | 'year' | 'all';
}

/**
 * Mention
 */
export interface Mention {
  userId: string;
  username: string;
  displayName: string;
  position: {
    start: number;
    end: number;
  };
}

/**
 * Report
 */
export interface Report {
  id: string;
  reporterId: string;
  targetType: 'user' | 'project' | 'comment' | 'thread';
  targetId: string;
  reason: ReportReason;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  resolvedAt?: Date;
}

/**
 * Report reasons
 */
export type ReportReason = 
  | 'spam'
  | 'harassment'
  | 'inappropriate-content'
  | 'copyright'
  | 'misinformation'
  | 'other';

// Made with Bob
