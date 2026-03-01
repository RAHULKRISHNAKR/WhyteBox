/**
 * Documentation Data Service
 * 
 * Central export for all documentation articles
 */

import { DocArticle } from '../../types/documentation';
import { gettingStartedGuide } from './getting-started-guide';

/**
 * All available documentation articles
 */
export const allDocArticles: DocArticle[] = [
  gettingStartedGuide,
  // Additional articles will be added here
];

/**
 * Get article by ID
 */
export const getArticleById = (id: string): DocArticle | undefined => {
  return allDocArticles.find(article => article.id === id);
};

/**
 * Get article by slug
 */
export const getArticleBySlug = (slug: string): DocArticle | undefined => {
  return allDocArticles.find(article => article.slug === slug);
};

/**
 * Get articles by category
 */
export const getArticlesByCategory = (category: string): DocArticle[] => {
  return allDocArticles.filter(article => article.category === category);
};

/**
 * Get articles by tag
 */
export const getArticlesByTag = (tag: string): DocArticle[] => {
  return allDocArticles.filter(article => article.tags.includes(tag));
};

/**
 * Get articles by difficulty
 */
export const getArticlesByDifficulty = (difficulty: string): DocArticle[] => {
  return allDocArticles.filter(article => article.difficulty === difficulty);
};

/**
 * Search articles by query
 */
export const searchArticles = (query: string): DocArticle[] => {
  const lowerQuery = query.toLowerCase();
  return allDocArticles.filter(article => 
    article.title.toLowerCase().includes(lowerQuery) ||
    article.description.toLowerCase().includes(lowerQuery) ||
    article.content.toLowerCase().includes(lowerQuery) ||
    article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Get popular articles (sorted by views)
 */
export const getPopularArticles = (limit: number = 10): DocArticle[] => {
  return [...allDocArticles]
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
};

/**
 * Get recent articles (sorted by update date)
 */
export const getRecentArticles = (limit: number = 10): DocArticle[] => {
  return [...allDocArticles]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
};

/**
 * Get top rated articles
 */
export const getTopRatedArticles = (limit: number = 10): DocArticle[] => {
  return [...allDocArticles]
    .sort((a, b) => b.rating.average - a.rating.average)
    .slice(0, limit);
};

// Made with Bob
