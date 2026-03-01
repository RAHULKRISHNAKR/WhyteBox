/**
 * Code Example Type Definitions
 * Defines types for interactive code examples and challenges
 */

export type ProgrammingLanguage = 
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'yaml'
  | 'markdown';

export type ExampleDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type ExampleCategory = 
  | 'gradcam'
  | 'saliency'
  | 'integrated-gradients'
  | 'model-loading'
  | 'preprocessing'
  | 'inference'
  | 'visualization'
  | 'general';

export interface TestCase {
  id: string;
  input: any;
  expectedOutput: any;
  description: string;
  hidden?: boolean;  // Hidden test cases for challenges
}

export interface CodeExample {
  id: string;
  title: string;
  description: string;
  category: ExampleCategory;
  difficulty: ExampleDifficulty;
  language: ProgrammingLanguage;
  
  // Code content
  code: string;
  solution?: string;  // For challenges
  starterCode?: string;  // Initial code for challenges
  
  // Metadata
  author?: string;
  tags: string[];
  estimatedTime: number;  // in minutes
  
  // Testing
  testCases?: TestCase[];
  hasTests: boolean;
  
  // Documentation
  explanation?: string;
  learningObjectives?: string[];
  prerequisites?: string[];
  relatedExamples?: string[];
  
  // Execution
  isExecutable: boolean;
  requiresBackend: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CodeChallenge extends CodeExample {
  // Challenge-specific fields
  points: number;
  hints: string[];
  maxAttempts?: number;
  timeLimit?: number;  // in seconds
  
  // Validation
  validationRules?: {
    minLines?: number;
    maxLines?: number;
    requiredImports?: string[];
    forbiddenKeywords?: string[];
  };
}

export interface CodeExecution {
  id: string;
  exampleId: string;
  userId: string;
  code: string;
  language: ProgrammingLanguage;
  
  // Execution result
  status: 'pending' | 'running' | 'success' | 'error' | 'timeout';
  output?: string;
  error?: string;
  executionTime?: number;  // in milliseconds
  
  // Test results
  testResults?: {
    passed: number;
    failed: number;
    total: number;
    details: {
      testId: string;
      passed: boolean;
      actualOutput?: any;
      error?: string;
    }[];
  };
  
  // Timestamps
  startedAt: Date;
  completedAt?: Date;
}

export interface CodeSubmission {
  id: string;
  challengeId: string;
  userId: string;
  code: string;
  
  // Submission result
  status: 'pending' | 'accepted' | 'rejected' | 'partial';
  score: number;
  maxScore: number;
  
  // Feedback
  feedback?: string;
  testResults?: CodeExecution['testResults'];
  
  // Attempts
  attemptNumber: number;
  
  // Timestamps
  submittedAt: Date;
  gradedAt?: Date;
}

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: ProgrammingLanguage;
  code: string;
  category: ExampleCategory;
  tags: string[];
}

export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: ProgrammingLanguage;
  description?: string;
  category: ExampleCategory;
}

export interface EditorSettings {
  theme: 'vs-dark' | 'vs-light' | 'hc-black';
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  autoSave: boolean;
  formatOnSave: boolean;
}

export interface CodeExampleFilter {
  category?: ExampleCategory;
  difficulty?: ExampleDifficulty;
  language?: ProgrammingLanguage;
  tags?: string[];
  searchQuery?: string;
  hasTests?: boolean;
  isExecutable?: boolean;
}

// Made with Bob
