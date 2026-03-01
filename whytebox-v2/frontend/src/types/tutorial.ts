/**
 * Tutorial System Type Definitions
 * Defines types for the interactive tutorial system
 */

export type TutorialStepType = 
  | 'info'           // Information display
  | 'action'         // User must perform an action
  | 'highlight'      // Highlight UI element
  | 'interactive'    // Interactive component
  | 'quiz'           // Quiz question
  | 'code'           // Code example
  | 'video';         // Video content

export type TutorialStatus = 
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'skipped';

export interface TutorialStep {
  id: string;
  type: TutorialStepType;
  title: string;
  content: string;
  
  // Optional fields
  targetElement?: string;        // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    type: 'click' | 'input' | 'navigate' | 'custom';
    target?: string;
    value?: any;
    validator?: (value: any) => boolean;
  };
  
  // Media content
  imageUrl?: string;
  videoUrl?: string;
  codeSnippet?: {
    language: string;
    code: string;
    editable?: boolean;
  };
  
  // Quiz content
  quiz?: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  };
  
  // Navigation
  canSkip?: boolean;
  nextStepId?: string;
  previousStepId?: string;
  
  // Completion criteria
  completionCriteria?: {
    type: 'auto' | 'manual' | 'action' | 'time';
    value?: any;
  };
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;        // in minutes
  prerequisites?: string[];     // IDs of prerequisite tutorials
  tags: string[];
  
  steps: TutorialStep[];
  
  // Metadata
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  
  // Completion rewards
  rewards?: {
    points: number;
    badges?: string[];
  };
}

export interface TutorialProgress {
  tutorialId: string;
  userId: string;
  status: TutorialStatus;
  currentStepId: string;
  completedSteps: string[];
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
  timeSpent: number;           // in seconds
}

export interface TutorialContextValue {
  // Current tutorial state
  currentTutorial: Tutorial | null;
  currentStep: TutorialStep | null;
  currentStepIndex: number;
  progress: TutorialProgress | null;
  
  // Tutorial management
  startTutorial: (tutorialId: string) => Promise<void>;
  exitTutorial: () => void;
  pauseTutorial: () => void;
  resumeTutorial: () => void;
  
  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepId: string) => void;
  skipStep: () => void;
  
  // Step completion
  completeStep: (stepId: string, data?: any) => void;
  validateStepAction: (action: any) => boolean;
  
  // Progress tracking
  updateProgress: (progress: Partial<TutorialProgress>) => void;
  getProgress: (tutorialId: string) => TutorialProgress | null;
  
  // UI state
  isActive: boolean;
  isPaused: boolean;
  highlightedElement: string | null;
  showOverlay: boolean;
}

export interface TutorialCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  tutorials: string[];         // Tutorial IDs
  order: number;
}

export interface TutorialFilter {
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  status?: TutorialStatus;
  searchQuery?: string;
}

// Made with Bob
