/**
 * Community Context
 * 
 * Manages community features including:
 * - User profiles and social interactions
 * - Project sharing and showcases
 * - Discussion threads and comments
 * - Notifications and activity feeds
 * - Collaboration and following
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  UserProfile,
  SharedProject,
  DiscussionThread,
  Comment,
  Notification,
  ActivityItem,
  LeaderboardEntry,
  CommunityStats,
  CommunityFilters,
  Follow,
  Like,
  CollaborationRequest,
  DiscussionCategory,
} from '../types/community';

interface CommunityContextType {
  // Current User
  currentUser: UserProfile | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  
  // Users
  users: UserProfile[];
  getUser: (userId: string) => UserProfile | null;
  searchUsers: (query: string) => UserProfile[];
  
  // Following
  following: Set<string>; // User IDs
  followers: Set<string>; // User IDs
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  
  // Projects
  sharedProjects: SharedProject[];
  featuredProjects: SharedProject[];
  userProjects: Map<string, SharedProject[]>; // userId -> projects
  shareProject: (project: Omit<SharedProject, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => Promise<void>;
  updateProject: (projectId: string, updates: Partial<SharedProject>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  getProjectsByUser: (userId: string) => SharedProject[];
  
  // Likes
  likes: Map<string, Set<string>>; // targetId -> Set of userIds
  likeTarget: (targetType: 'project' | 'comment' | 'thread', targetId: string) => Promise<void>;
  unlikeTarget: (targetType: 'project' | 'comment' | 'thread', targetId: string) => Promise<void>;
  hasLiked: (targetId: string) => boolean;
  getLikeCount: (targetId: string) => number;
  
  // Discussions
  threads: DiscussionThread[];
  currentThread: DiscussionThread | null;
  createThread: (thread: Omit<DiscussionThread, 'id' | 'createdAt' | 'updatedAt' | 'stats' | 'comments'>) => Promise<void>;
  updateThread: (threadId: string, updates: Partial<DiscussionThread>) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  loadThread: (threadId: string) => Promise<void>;
  getThreadsByCategory: (category: DiscussionCategory) => DiscussionThread[];
  
  // Comments
  addComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'replies'>) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  
  // Activity Feed
  activityFeed: ActivityItem[];
  loadActivityFeed: (userId?: string) => Promise<void>;
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];
  loadLeaderboard: (period: 'daily' | 'weekly' | 'monthly' | 'all-time') => Promise<void>;
  
  // Collaboration
  collaborationRequests: CollaborationRequest[];
  sendCollaborationRequest: (projectId: string, toUserId: string, message: string) => Promise<void>;
  respondToRequest: (requestId: string, accept: boolean) => Promise<void>;
  
  // Search & Filter
  filters: CommunityFilters;
  updateFilters: (filters: Partial<CommunityFilters>) => void;
  
  // Statistics
  stats: CommunityStats | null;
  loadStats: () => Promise<void>;
  
  // Utility
  loading: boolean;
  error: string | null;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

const STORAGE_KEYS = {
  FOLLOWING: 'whytebox_community_following',
  LIKES: 'whytebox_community_likes',
  NOTIFICATIONS: 'whytebox_community_notifications',
};

const DEFAULT_FILTERS: CommunityFilters = {
  projectCategories: [],
  projectTags: [],
  discussionCategories: [],
  sortBy: 'recent',
  timeRange: 'all',
};

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  // Social state
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followers, setFollowers] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Map<string, Set<string>>>(new Map());
  
  // Project state
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<SharedProject[]>([]);
  const [userProjects, setUserProjects] = useState<Map<string, SharedProject[]>>(new Map());
  
  // Discussion state
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [currentThread, setCurrentThread] = useState<DiscussionThread | null>(null);
  
  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Activity state
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Collaboration state
  const [collaborationRequests, setCollaborationRequests] = useState<CollaborationRequest[]>([]);
  
  // Filter state
  const [filters, setFilters] = useState<CommunityFilters>(DEFAULT_FILTERS);
  
  // Statistics
  const [stats, setStats] = useState<CommunityStats | null>(null);
  
  // Utility state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    loadPersistedData();
    loadInitialData();
  }, []);

  // Persist data when it changes
  useEffect(() => {
    persistData();
  }, [following, likes, notifications]);

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.isRead).length);
  }, [notifications]);

  const loadPersistedData = () => {
    try {
      // Load following
      const followingData = localStorage.getItem(STORAGE_KEYS.FOLLOWING);
      if (followingData) {
        setFollowing(new Set(JSON.parse(followingData)));
      }

      // Load likes
      const likesData = localStorage.getItem(STORAGE_KEYS.LIKES);
      if (likesData) {
        const parsed = JSON.parse(likesData);
        setLikes(new Map(parsed.map(([key, value]: [string, string[]]) => [key, new Set(value)])));
      }

      // Load notifications
      const notificationsData = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (notificationsData) {
        const parsed = JSON.parse(notificationsData);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        })));
      }
    } catch (err) {
      console.error('Failed to load persisted community data:', err);
    }
  };

  const persistData = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.FOLLOWING, JSON.stringify(Array.from(following)));
      localStorage.setItem(
        STORAGE_KEYS.LIKES,
        JSON.stringify(Array.from(likes.entries()).map(([key, value]) => [key, Array.from(value)]))
      );
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (err) {
      console.error('Failed to persist community data:', err);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // Load current user, projects, threads, etc.
    } catch (err) {
      setError('Failed to load community data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;

    try {
      // TODO: API call
      setCurrentUser({ ...currentUser, ...updates });
    } catch (err) {
      setError('Failed to update profile');
      throw err;
    }
  }, [currentUser]);

  const getUser = useCallback((userId: string) => {
    return users.find(u => u.id === userId) || null;
  }, [users]);

  const searchUsers = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return users.filter(user =>
      user.username.toLowerCase().includes(lowerQuery) ||
      user.displayName.toLowerCase().includes(lowerQuery)
    );
  }, [users]);

  const followUser = useCallback(async (userId: string) => {
    try {
      // TODO: API call
      setFollowing(prev => new Set(prev).add(userId));
      
      // Add notification for followed user
      // TODO: Send via API
    } catch (err) {
      setError('Failed to follow user');
      throw err;
    }
  }, []);

  const unfollowUser = useCallback(async (userId: string) => {
    try {
      // TODO: API call
      setFollowing(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    } catch (err) {
      setError('Failed to unfollow user');
      throw err;
    }
  }, []);

  const isFollowing = useCallback((userId: string) => {
    return following.has(userId);
  }, [following]);

  const shareProject = useCallback(async (
    project: Omit<SharedProject, 'id' | 'createdAt' | 'updatedAt' | 'stats'>
  ) => {
    try {
      // TODO: API call
      const newProject: SharedProject = {
        ...project,
        id: `project_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        stats: {
          views: 0,
          likes: 0,
          forks: 0,
          comments: 0,
          shares: 0,
        },
      };

      setSharedProjects(prev => [newProject, ...prev]);
      
      // Update user projects
      setUserProjects(prev => {
        const updated = new Map(prev);
        const userProjs = updated.get(project.userId) || [];
        updated.set(project.userId, [newProject, ...userProjs]);
        return updated;
      });
    } catch (err) {
      setError('Failed to share project');
      throw err;
    }
  }, []);

  const updateProject = useCallback(async (projectId: string, updates: Partial<SharedProject>) => {
    try {
      // TODO: API call
      setSharedProjects(prev =>
        prev.map(p => p.id === projectId ? { ...p, ...updates, updatedAt: new Date() } : p)
      );
    } catch (err) {
      setError('Failed to update project');
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      // TODO: API call
      setSharedProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      setError('Failed to delete project');
      throw err;
    }
  }, []);

  const getProjectsByUser = useCallback((userId: string) => {
    return userProjects.get(userId) || [];
  }, [userProjects]);

  const likeTarget = useCallback(async (
    targetType: 'project' | 'comment' | 'thread',
    targetId: string
  ) => {
    if (!currentUser) return;

    try {
      // TODO: API call
      setLikes(prev => {
        const updated = new Map(prev);
        const targetLikes = updated.get(targetId) || new Set();
        targetLikes.add(currentUser.id);
        updated.set(targetId, targetLikes);
        return updated;
      });

      // Update stats
      if (targetType === 'project') {
        setSharedProjects(prev =>
          prev.map(p => p.id === targetId ? { ...p, stats: { ...p.stats, likes: p.stats.likes + 1 } } : p)
        );
      }
    } catch (err) {
      setError('Failed to like');
      throw err;
    }
  }, [currentUser]);

  const unlikeTarget = useCallback(async (
    targetType: 'project' | 'comment' | 'thread',
    targetId: string
  ) => {
    if (!currentUser) return;

    try {
      // TODO: API call
      setLikes(prev => {
        const updated = new Map(prev);
        const targetLikes = updated.get(targetId);
        if (targetLikes) {
          targetLikes.delete(currentUser.id);
          updated.set(targetId, targetLikes);
        }
        return updated;
      });

      // Update stats
      if (targetType === 'project') {
        setSharedProjects(prev =>
          prev.map(p => p.id === targetId ? { ...p, stats: { ...p.stats, likes: Math.max(0, p.stats.likes - 1) } } : p)
        );
      }
    } catch (err) {
      setError('Failed to unlike');
      throw err;
    }
  }, [currentUser]);

  const hasLiked = useCallback((targetId: string) => {
    if (!currentUser) return false;
    return likes.get(targetId)?.has(currentUser.id) || false;
  }, [likes, currentUser]);

  const getLikeCount = useCallback((targetId: string) => {
    return likes.get(targetId)?.size || 0;
  }, [likes]);

  const createThread = useCallback(async (
    thread: Omit<DiscussionThread, 'id' | 'createdAt' | 'updatedAt' | 'stats' | 'comments'>
  ) => {
    try {
      // TODO: API call
      const newThread: DiscussionThread = {
        ...thread,
        id: `thread_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        stats: {
          views: 0,
          replies: 0,
          likes: 0,
          participants: 1,
        },
        comments: [],
      };

      setThreads(prev => [newThread, ...prev]);
    } catch (err) {
      setError('Failed to create thread');
      throw err;
    }
  }, []);

  const updateThread = useCallback(async (threadId: string, updates: Partial<DiscussionThread>) => {
    try {
      // TODO: API call
      setThreads(prev =>
        prev.map(t => t.id === threadId ? { ...t, ...updates, updatedAt: new Date() } : t)
      );
    } catch (err) {
      setError('Failed to update thread');
      throw err;
    }
  }, []);

  const deleteThread = useCallback(async (threadId: string) => {
    try {
      // TODO: API call
      setThreads(prev => prev.filter(t => t.id !== threadId));
    } catch (err) {
      setError('Failed to delete thread');
      throw err;
    }
  }, []);

  const loadThread = useCallback(async (threadId: string) => {
    try {
      // TODO: API call
      const thread = threads.find(t => t.id === threadId) || null;
      setCurrentThread(thread);
    } catch (err) {
      setError('Failed to load thread');
      throw err;
    }
  }, [threads]);

  const getThreadsByCategory = useCallback((category: DiscussionCategory) => {
    return threads.filter(t => t.category === category);
  }, [threads]);

  const addComment = useCallback(async (
    comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'replies'>
  ) => {
    try {
      // TODO: API call
      const newComment: Comment = {
        ...comment,
        id: `comment_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 0,
        isEdited: false,
        isDeleted: false,
        replies: [],
      };

      // Add to thread or project
      if (comment.threadId) {
        setThreads(prev =>
          prev.map(t =>
            t.id === comment.threadId
              ? { ...t, comments: [...t.comments, newComment], stats: { ...t.stats, replies: t.stats.replies + 1 } }
              : t
          )
        );
      }
    } catch (err) {
      setError('Failed to add comment');
      throw err;
    }
  }, []);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    try {
      // TODO: API call
      setThreads(prev =>
        prev.map(t => ({
          ...t,
          comments: t.comments.map(c =>
            c.id === commentId
              ? { ...c, content, isEdited: true, editedAt: new Date(), updatedAt: new Date() }
              : c
          ),
        }))
      );
    } catch (err) {
      setError('Failed to update comment');
      throw err;
    }
  }, []);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      // TODO: API call
      setThreads(prev =>
        prev.map(t => ({
          ...t,
          comments: t.comments.filter(c => c.id !== commentId),
          stats: { ...t.stats, replies: Math.max(0, t.stats.replies - 1) },
        }))
      );
    } catch (err) {
      setError('Failed to delete comment');
      throw err;
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const loadActivityFeed = useCallback(async (userId?: string) => {
    try {
      // TODO: API call
      // Load activity feed for user or global feed
    } catch (err) {
      setError('Failed to load activity feed');
      throw err;
    }
  }, []);

  const loadLeaderboard = useCallback(async (period: 'daily' | 'weekly' | 'monthly' | 'all-time') => {
    try {
      // TODO: API call
      // Load leaderboard for specified period
    } catch (err) {
      setError('Failed to load leaderboard');
      throw err;
    }
  }, []);

  const sendCollaborationRequest = useCallback(async (
    projectId: string,
    toUserId: string,
    message: string
  ) => {
    if (!currentUser) return;

    try {
      // TODO: API call
      const request: CollaborationRequest = {
        id: `collab_${Date.now()}`,
        projectId,
        fromUserId: currentUser.id,
        toUserId,
        message,
        status: 'pending',
        createdAt: new Date(),
      };

      setCollaborationRequests(prev => [request, ...prev]);
    } catch (err) {
      setError('Failed to send collaboration request');
      throw err;
    }
  }, [currentUser]);

  const respondToRequest = useCallback(async (requestId: string, accept: boolean) => {
    try {
      // TODO: API call
      setCollaborationRequests(prev =>
        prev.map(r =>
          r.id === requestId
            ? { ...r, status: accept ? 'accepted' : 'declined', respondedAt: new Date() }
            : r
        )
      );
    } catch (err) {
      setError('Failed to respond to request');
      throw err;
    }
  }, []);

  const updateFilters = useCallback((newFilters: Partial<CommunityFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const loadStats = useCallback(async () => {
    try {
      // TODO: API call
      const statsData: CommunityStats = {
        totalUsers: users.length,
        activeUsers: 0,
        totalProjects: sharedProjects.length,
        totalThreads: threads.length,
        totalComments: 0,
        topContributors: [],
        featuredProjects: [],
        trendingThreads: [],
      };

      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [users, sharedProjects, threads]);

  const value: CommunityContextType = {
    currentUser,
    updateProfile,
    users,
    getUser,
    searchUsers,
    following,
    followers,
    followUser,
    unfollowUser,
    isFollowing,
    sharedProjects,
    featuredProjects,
    userProjects,
    shareProject,
    updateProject,
    deleteProject,
    getProjectsByUser,
    likes,
    likeTarget,
    unlikeTarget,
    hasLiked,
    getLikeCount,
    threads,
    currentThread,
    createThread,
    updateThread,
    deleteThread,
    loadThread,
    getThreadsByCategory,
    addComment,
    updateComment,
    deleteComment,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    activityFeed,
    loadActivityFeed,
    leaderboard,
    loadLeaderboard,
    collaborationRequests,
    sendCollaborationRequest,
    respondToRequest,
    filters,
    updateFilters,
    stats,
    loadStats,
    loading,
    error,
  };

  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunity must be used within CommunityProvider');
  }
  return context;
};

// Made with Bob
