/**
 * Quiz System Type Definitions
 * Comprehensive type system for interactive quizzes
 */

/**
 * Question types supported by the quiz system
 */
export type QuestionType = 
  | 'multiple-choice'
  | 'true-false'
  | 'fill-in-blank'
  | 'code-completion'
  | 'matching';

/**
 * Difficulty levels for questions
 */
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Base question interface
 */
export interface BaseQuestion {
  id: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  question: string;
  explanation: string;
  points: number;
  timeLimit?: number; // in seconds
  hints?: string[];
  tags?: string[];
}

/**
 * Multiple choice question
 */
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
  allowMultiple?: boolean;
}

/**
 * True/False question
 */
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false';
  correctAnswer: boolean;
}

/**
 * Fill in the blank question
 */
export interface FillInBlankQuestion extends BaseQuestion {
  type: 'fill-in-blank';
  template: string; // e.g., "The capital of France is ___"
  correctAnswers: string[]; // Multiple acceptable answers
  caseSensitive?: boolean;
}

/**
 * Code completion question
 */
export interface CodeCompletionQuestion extends BaseQuestion {
  type: 'code-completion';
  codeTemplate: string;
  correctCode: string;
  language: string;
  testCases?: {
    input: string;
    expectedOutput: string;
  }[];
}

/**
 * Matching question
 */
export interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  pairs: {
    id: string;
    left: string;
    right: string;
  }[];
}

/**
 * Union type for all question types
 */
export type Question = 
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | FillInBlankQuestion
  | CodeCompletionQuestion
  | MatchingQuestion;

/**
 * Quiz metadata
 */
export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: QuestionDifficulty;
  estimatedTime: number; // in minutes
  passingScore: number; // percentage
  questions: Question[];
  tags: string[];
  prerequisites?: string[]; // Quiz IDs
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User's answer to a question
 */
export interface QuestionAnswer {
  questionId: string;
  answer: string | string[] | boolean | Record<string, string>;
  timeSpent: number; // in seconds
  hintsUsed: number;
  timestamp: Date;
}

/**
 * Question result after evaluation
 */
export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  feedback: string;
  correctAnswer?: string | string[];
  userAnswer: string | string[] | boolean | Record<string, string>;
  timeSpent: number;
}

/**
 * Quiz attempt tracking
 */
export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  answers: QuestionAnswer[];
  results?: QuizResult;
  status: 'in-progress' | 'completed' | 'abandoned';
}

/**
 * Quiz result summary
 */
export interface QuizResult {
  attemptId: string;
  quizId: string;
  userId: string;
  score: number; // percentage
  pointsEarned: number;
  pointsPossible: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number; // in seconds
  passed: boolean;
  questionResults: QuestionResult[];
  completedAt: Date;
  certificateEarned?: boolean;
}

/**
 * Quiz statistics
 */
export interface QuizStatistics {
  quizId: string;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  averageTimeSpent: number;
  difficultyRating: number; // 1-5
  completionRate: number;
  questionStats: {
    questionId: string;
    correctRate: number;
    averageTimeSpent: number;
    skipRate: number;
  }[];
}

/**
 * Quiz progress tracking
 */
export interface QuizProgress {
  quizId: string;
  currentQuestionIndex: number;
  answeredQuestions: Set<string>;
  timeElapsed: number;
  hintsUsed: Map<string, number>;
  bookmarked: Set<string>;
}

/**
 * Quiz filter options
 */
export interface QuizFilters {
  category?: string;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  completed?: boolean;
  minScore?: number;
  maxScore?: number;
}

/**
 * Quiz sort options
 */
export type QuizSortBy = 
  | 'title'
  | 'difficulty'
  | 'estimatedTime'
  | 'popularity'
  | 'recentlyAdded'
  | 'myScore';

/**
 * Quiz context state
 */
export interface QuizContextState {
  currentQuiz: Quiz | null;
  currentAttempt: QuizAttempt | null;
  progress: QuizProgress | null;
  results: QuizResult | null;
  isLoading: boolean;
  error: string | null;
}

// Made with Bob
