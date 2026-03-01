/**
 * Documentation Context
 * 
 * Manages documentation state including:
 * - Search functionality with filters
 * - Article viewing and navigation
 * - User feedback and ratings
 * - Reading progress tracking
 * - Bookmarks and favorites
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  DocArticle,
  SearchFilters,
  SearchResult,
  DocFeedback,
  DocStats,
  DocCategory,
  DocDifficulty,
} from '../types/documentation';

interface DocumentationContextType {
  // Search
  searchQuery: string;
  searchResults: SearchResult[];
  filters: SearchFilters;
  isSearching: boolean;
  setSearchQuery: (query: string) => void;
  updateFilters: (filters: Partial<SearchFilters>) => void;
  performSearch: () => Promise<void>;
  clearSearch: () => void;

  // Articles
  currentArticle: DocArticle | null;
  recentArticles: DocArticle[];
  popularArticles: DocArticle[];
  loadArticle: (id: string) => Promise<void>;
  getArticlesByCategory: (category: DocCategory) => DocArticle[];

  // Reading Progress
  readingProgress: Map<string, number>; // articleId -> percentage
  updateReadingProgress: (articleId: string, percentage: number) => void;
  markAsRead: (articleId: string) => void;
  isArticleRead: (articleId: string) => boolean;

  // Bookmarks
  bookmarks: Set<string>; // article IDs
  toggleBookmark: (articleId: string) => void;
  isBookmarked: (articleId: string) => boolean;

  // Feedback
  submitFeedback: (feedback: Omit<DocFeedback, 'id' | 'createdAt'>) => Promise<void>;
  getUserFeedback: (articleId: string) => DocFeedback | null;

  // Statistics
  stats: DocStats | null;
  loadStats: () => Promise<void>;

  // Utility
  loading: boolean;
  error: string | null;
}

const DocumentationContext = createContext<DocumentationContextType | undefined>(undefined);

const STORAGE_KEYS = {
  READING_PROGRESS: 'whytebox_doc_reading_progress',
  BOOKMARKS: 'whytebox_doc_bookmarks',
  FEEDBACK: 'whytebox_doc_feedback',
};

const DEFAULT_FILTERS: SearchFilters = {
  categories: [],
  difficulty: [],
  tags: [],
  hasDemo: false,
  hasCode: false,
  minRating: 0,
};

export const DocumentationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [isSearching, setIsSearching] = useState(false);

  // Article state
  const [currentArticle, setCurrentArticle] = useState<DocArticle | null>(null);
  const [recentArticles, setRecentArticles] = useState<DocArticle[]>([]);
  const [popularArticles, setPopularArticles] = useState<DocArticle[]>([]);
  const [allArticles, setAllArticles] = useState<DocArticle[]>([]);

  // Progress state
  const [readingProgress, setReadingProgress] = useState<Map<string, number>>(new Map());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [userFeedback, setUserFeedback] = useState<Map<string, DocFeedback>>(new Map());

  // Statistics
  const [stats, setStats] = useState<DocStats | null>(null);

  // Utility state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    loadPersistedData();
    loadInitialArticles();
  }, []);

  // Persist data when it changes
  useEffect(() => {
    persistData();
  }, [readingProgress, bookmarks, userFeedback]);

  const loadPersistedData = () => {
    try {
      // Load reading progress
      const progressData = localStorage.getItem(STORAGE_KEYS.READING_PROGRESS);
      if (progressData) {
        setReadingProgress(new Map(JSON.parse(progressData)));
      }

      // Load bookmarks
      const bookmarksData = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      if (bookmarksData) {
        setBookmarks(new Set(JSON.parse(bookmarksData)));
      }

      // Load feedback
      const feedbackData = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
      if (feedbackData) {
        setUserFeedback(new Map(JSON.parse(feedbackData)));
      }
    } catch (err) {
      console.error('Failed to load persisted documentation data:', err);
    }
  };

  const persistData = () => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.READING_PROGRESS,
        JSON.stringify(Array.from(readingProgress.entries()))
      );
      localStorage.setItem(
        STORAGE_KEYS.BOOKMARKS,
        JSON.stringify(Array.from(bookmarks))
      );
      localStorage.setItem(
        STORAGE_KEYS.FEEDBACK,
        JSON.stringify(Array.from(userFeedback.entries()))
      );
    } catch (err) {
      console.error('Failed to persist documentation data:', err);
    }
  };

  const loadInitialArticles = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/documentation/articles');
      // const articles = await response.json();
      
      // Mock data for now
      const mockArticles: DocArticle[] = [];
      setAllArticles(mockArticles);
      setRecentArticles(mockArticles.slice(0, 5));
      setPopularArticles(mockArticles.slice(0, 5));
    } catch (err) {
      setError('Failed to load articles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/documentation/search', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ query: searchQuery, filters }),
      // });
      // const results = await response.json();

      // Mock search for now
      const results: SearchResult[] = allArticles
        .filter(article => {
          const matchesQuery = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             article.description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesCategory = filters.categories.length === 0 || 
                                filters.categories.includes(article.category);
          const matchesDifficulty = filters.difficulty.length === 0 ||
                                  filters.difficulty.includes(article.difficulty);
          const matchesRating = article.rating.average >= filters.minRating;
          const matchesDemo = !filters.hasDemo || article.demo !== undefined;
          const matchesCode = !filters.hasCode || article.codeExamples.length > 0;

          return matchesQuery && matchesCategory && matchesDifficulty && 
                 matchesRating && matchesDemo && matchesCode;
        })
        .map(article => ({
          id: article.id,
          title: article.title,
          excerpt: article.description,
          category: article.category,
          difficulty: article.difficulty,
          url: `/docs/${article.slug}`,
          highlights: [],
          relevanceScore: 1.0,
          lastUpdated: article.updatedAt,
        }));

      setSearchResults(results);
    } catch (err) {
      setError('Search failed');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, filters, allArticles]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setFilters(DEFAULT_FILTERS);
  }, []);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const loadArticle = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/documentation/articles/${id}`);
      // const article = await response.json();

      const article = allArticles.find(a => a.id === id) || null;
      setCurrentArticle(article);

      // Track view
      if (article) {
        // TODO: Send view event to backend
      }
    } catch (err) {
      setError('Failed to load article');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [allArticles]);

  const getArticlesByCategory = useCallback((category: DocCategory) => {
    return allArticles.filter(article => article.category === category);
  }, [allArticles]);

  const updateReadingProgress = useCallback((articleId: string, percentage: number) => {
    setReadingProgress(prev => {
      const updated = new Map(prev);
      updated.set(articleId, Math.min(100, Math.max(0, percentage)));
      return updated;
    });
  }, []);

  const markAsRead = useCallback((articleId: string) => {
    updateReadingProgress(articleId, 100);
  }, [updateReadingProgress]);

  const isArticleRead = useCallback((articleId: string) => {
    return (readingProgress.get(articleId) || 0) >= 100;
  }, [readingProgress]);

  const toggleBookmark = useCallback((articleId: string) => {
    setBookmarks(prev => {
      const updated = new Set(prev);
      if (updated.has(articleId)) {
        updated.delete(articleId);
      } else {
        updated.add(articleId);
      }
      return updated;
    });
  }, []);

  const isBookmarked = useCallback((articleId: string) => {
    return bookmarks.has(articleId);
  }, [bookmarks]);

  const submitFeedback = useCallback(async (
    feedback: Omit<DocFeedback, 'id' | 'createdAt'>
  ) => {
    try {
      // TODO: Replace with actual API call
      // await fetch('/api/documentation/feedback', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(feedback),
      // });

      const newFeedback: DocFeedback = {
        ...feedback,
        id: `feedback_${Date.now()}`,
        createdAt: new Date(),
      };

      setUserFeedback(prev => {
        const updated = new Map(prev);
        updated.set(feedback.articleId, newFeedback);
        return updated;
      });
    } catch (err) {
      setError('Failed to submit feedback');
      console.error(err);
      throw err;
    }
  }, []);

  const getUserFeedback = useCallback((articleId: string) => {
    return userFeedback.get(articleId) || null;
  }, [userFeedback]);

  const loadStats = useCallback(async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/documentation/stats');
      // const statsData = await response.json();

      const statsData: DocStats = {
        totalArticles: allArticles.length,
        totalViews: 0,
        averageRating: 0,
        categoryCounts: {} as Record<DocCategory, number>,
        popularArticles: [],
        recentlyUpdated: [],
      };

      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [allArticles]);

  const value: DocumentationContextType = {
    searchQuery,
    searchResults,
    filters,
    isSearching,
    setSearchQuery,
    updateFilters,
    performSearch,
    clearSearch,
    currentArticle,
    recentArticles,
    popularArticles,
    loadArticle,
    getArticlesByCategory,
    readingProgress,
    updateReadingProgress,
    markAsRead,
    isArticleRead,
    bookmarks,
    toggleBookmark,
    isBookmarked,
    submitFeedback,
    getUserFeedback,
    stats,
    loadStats,
    loading,
    error,
  };

  return (
    <DocumentationContext.Provider value={value}>
      {children}
    </DocumentationContext.Provider>
  );
};

export const useDocumentation = () => {
  const context = useContext(DocumentationContext);
  if (!context) {
    throw new Error('useDocumentation must be used within DocumentationProvider');
  }
  return context;
};

// Made with Bob
