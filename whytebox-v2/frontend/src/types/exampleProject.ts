/**
 * Example Project Type Definitions
 * 
 * Comprehensive type system for example projects including:
 * - Project templates with starter code
 * - Step-by-step implementation guides
 * - Downloadable resources
 * - Integration with code playground
 * - Progress tracking
 */

/**
 * Project category types
 */
export type ProjectCategory = 
  | 'image-classification'
  | 'object-detection'
  | 'medical-imaging'
  | 'nlp'
  | 'time-series'
  | 'generative-ai'
  | 'reinforcement-learning';

/**
 * Project difficulty levels
 */
export type ProjectDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Project status
 */
export type ProjectStatus = 'not-started' | 'in-progress' | 'completed';

/**
 * Programming language
 */
export type ProgrammingLanguage = 'python' | 'javascript' | 'typescript';

/**
 * Framework type
 */
export type Framework = 'pytorch' | 'tensorflow' | 'keras' | 'scikit-learn' | 'onnx';

/**
 * Example project structure
 */
export interface ExampleProject {
  id: string;
  title: string;
  slug: string;
  category: ProjectCategory;
  difficulty: ProjectDifficulty;
  description: string;
  longDescription: string;
  objectives: string[];
  prerequisites: string[];
  estimatedTime: number; // minutes
  framework: Framework;
  language: ProgrammingLanguage;
  tags: string[];
  thumbnail: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  stats: {
    views: number;
    completions: number;
    rating: {
      average: number;
      count: number;
    };
  };
  steps: ProjectStep[];
  resources: ProjectResource[];
  starterCode: StarterCode;
  solutionCode?: SolutionCode;
  datasets: Dataset[];
  relatedProjects: string[]; // Project IDs
}

/**
 * Project implementation step
 */
export interface ProjectStep {
  id: string;
  order: number;
  title: string;
  description: string;
  content: string; // Markdown
  codeSnippets: CodeSnippet[];
  checkpoints: Checkpoint[];
  hints: string[];
  estimatedTime: number; // minutes
  isOptional: boolean;
}

/**
 * Code snippet in a step
 */
export interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  language: ProgrammingLanguage;
  code: string;
  filename: string;
  highlightLines?: number[];
  explanation?: string;
}

/**
 * Checkpoint for validation
 */
export interface Checkpoint {
  id: string;
  title: string;
  description: string;
  validationType: 'code-output' | 'file-exists' | 'test-passes' | 'manual';
  validation?: {
    expectedOutput?: string;
    testCommand?: string;
    filePath?: string;
  };
}

/**
 * Project resource
 */
export interface ProjectResource {
  id: string;
  type: 'documentation' | 'video' | 'article' | 'dataset' | 'model' | 'notebook';
  title: string;
  description: string;
  url: string;
  size?: number; // bytes
  format?: string;
  isRequired: boolean;
}

/**
 * Starter code package
 */
export interface StarterCode {
  id: string;
  description: string;
  files: ProjectFile[];
  setupInstructions: string;
  dependencies: Dependency[];
  downloadUrl: string;
}

/**
 * Solution code package
 */
export interface SolutionCode {
  id: string;
  description: string;
  files: ProjectFile[];
  explanation: string;
  downloadUrl: string;
  isLocked: boolean; // Unlock after completing project
}

/**
 * Project file
 */
export interface ProjectFile {
  path: string;
  content: string;
  language: ProgrammingLanguage;
  description: string;
  isEditable: boolean;
}

/**
 * Dependency specification
 */
export interface Dependency {
  name: string;
  version: string;
  description: string;
  isOptional: boolean;
}

/**
 * Dataset information
 */
export interface Dataset {
  id: string;
  name: string;
  description: string;
  size: number; // bytes
  format: string;
  downloadUrl: string;
  license: string;
  citation?: string;
  samples: number;
  features?: string[];
}

/**
 * User project progress
 */
export interface ProjectProgress {
  projectId: string;
  userId: string;
  status: ProjectStatus;
  currentStep: number;
  completedSteps: Set<string>; // Step IDs
  completedCheckpoints: Set<string>; // Checkpoint IDs
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
  timeSpent: number; // minutes
  notes: ProjectNote[];
  code: Map<string, string>; // filename -> content
}

/**
 * User note on project
 */
export interface ProjectNote {
  id: string;
  stepId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project submission
 */
export interface ProjectSubmission {
  id: string;
  projectId: string;
  userId: string;
  files: ProjectFile[];
  description: string;
  repositoryUrl?: string;
  demoUrl?: string;
  submittedAt: Date;
  feedback?: SubmissionFeedback;
}

/**
 * Feedback on submission
 */
export interface SubmissionFeedback {
  id: string;
  reviewerId: string;
  rating: number; // 1-5
  comments: string;
  strengths: string[];
  improvements: string[];
  createdAt: Date;
}

/**
 * Project filter options
 */
export interface ProjectFilters {
  categories: ProjectCategory[];
  difficulty: ProjectDifficulty[];
  frameworks: Framework[];
  languages: ProgrammingLanguage[];
  tags: string[];
  minRating: number;
  maxTime: number; // minutes
  hasDataset: boolean;
  hasSolution: boolean;
}

/**
 * Project search result
 */
export interface ProjectSearchResult {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  difficulty: ProjectDifficulty;
  framework: Framework;
  estimatedTime: number;
  thumbnail: string;
  rating: number;
  completions: number;
  relevanceScore: number;
}

/**
 * Project statistics
 */
export interface ProjectStats {
  totalProjects: number;
  totalCompletions: number;
  averageRating: number;
  categoryCounts: Record<ProjectCategory, number>;
  popularProjects: Array<{
    id: string;
    title: string;
    completions: number;
  }>;
  recentProjects: Array<{
    id: string;
    title: string;
    createdAt: Date;
  }>;
}

// Made with Bob
