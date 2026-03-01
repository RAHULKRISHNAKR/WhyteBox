/**
 * Documentation System Type Definitions
 * 
 * Comprehensive type system for the documentation platform including:
 * - Full-text search with filters
 * - Markdown rendering with syntax highlighting
 * - Interactive demos and code examples
 * - User feedback and ratings
 * - Version control and history
 */

/**
 * Documentation category types
 */
export type DocCategory = 
  | 'getting-started'
  | 'concepts'
  | 'api-reference'
  | 'tutorials'
  | 'guides'
  | 'examples'
  | 'troubleshooting'
  | 'faq';

/**
 * Documentation difficulty levels
 */
export type DocDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Search filter options
 */
export interface SearchFilters {
  categories: DocCategory[];
  difficulty: DocDifficulty[];
  tags: string[];
  hasDemo: boolean;
  hasCode: boolean;
  minRating: number;
}

/**
 * Search result item
 */
export interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  category: DocCategory;
  difficulty: DocDifficulty;
  url: string;
  highlights: string[];
  relevanceScore: number;
  lastUpdated: Date;
}

/**
 * Documentation article structure
 */
export interface DocArticle {
  id: string;
  title: string;
  slug: string;
  category: DocCategory;
  difficulty: DocDifficulty;
  description: string;
  content: string; // Markdown content
  tags: string[];
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  version: string;
  readTime: number; // minutes
  views: number;
  rating: {
    average: number;
    count: number;
  };
  relatedArticles: string[]; // Article IDs
  prerequisites: string[]; // Article IDs
  demo?: DocDemo;
  codeExamples: CodeExample[];
}

/**
 * Interactive demo configuration
 */
export interface DocDemo {
  id: string;
  type: 'interactive' | 'video' | 'sandbox';
  title: string;
  description: string;
  config: {
    // For interactive demos
    component?: string;
    props?: Record<string, any>;
    // For video demos
    videoUrl?: string;
    // For sandbox demos
    sandboxUrl?: string;
    files?: SandboxFile[];
  };
}

/**
 * Sandbox file structure
 */
export interface SandboxFile {
  path: string;
  content: string;
  language: string;
  readOnly: boolean;
}

/**
 * Code example in documentation
 */
export interface CodeExample {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
  output?: string;
  runnable: boolean;
  editable: boolean;
  highlightLines?: number[];
}

/**
 * User feedback on documentation
 */
export interface DocFeedback {
  id: string;
  articleId: string;
  userId: string;
  rating: number; // 1-5
  helpful: boolean;
  comment?: string;
  issues: FeedbackIssue[];
  createdAt: Date;
}

/**
 * Feedback issue types
 */
export type FeedbackIssueType = 
  | 'outdated'
  | 'incorrect'
  | 'unclear'
  | 'missing-info'
  | 'broken-link'
  | 'typo';

/**
 * Specific issue in documentation
 */
export interface FeedbackIssue {
  type: FeedbackIssueType;
  description: string;
  location?: string; // Section or line reference
}

/**
 * Documentation table of contents
 */
export interface DocTOC {
  items: TOCItem[];
}

/**
 * Table of contents item
 */
export interface TOCItem {
  id: string;
  title: string;
  level: number; // 1-6 for h1-h6
  anchor: string;
  children: TOCItem[];
}

/**
 * Documentation version history
 */
export interface DocVersion {
  version: string;
  date: Date;
  author: string;
  changes: string[];
  content: string;
}

/**
 * Documentation navigation structure
 */
export interface DocNavigation {
  previous?: {
    title: string;
    url: string;
  };
  next?: {
    title: string;
    url: string;
  };
  parent?: {
    title: string;
    url: string;
  };
}

/**
 * Documentation search index entry
 */
export interface SearchIndexEntry {
  id: string;
  title: string;
  content: string;
  category: DocCategory;
  difficulty: DocDifficulty;
  tags: string[];
  url: string;
  lastUpdated: Date;
}

/**
 * Documentation statistics
 */
export interface DocStats {
  totalArticles: number;
  totalViews: number;
  averageRating: number;
  categoryCounts: Record<DocCategory, number>;
  popularArticles: Array<{
    id: string;
    title: string;
    views: number;
  }>;
  recentlyUpdated: Array<{
    id: string;
    title: string;
    updatedAt: Date;
  }>;
}

// Made with Bob
