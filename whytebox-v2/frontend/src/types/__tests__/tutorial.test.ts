/**
 * Tutorial Type Tests
 * 
 * Unit tests for tutorial type definitions and validation
 */

import { describe, it, expect } from 'vitest';
import type {
  Tutorial,
  TutorialStep,
  TutorialStepType,
  TutorialStatus,
  TutorialProgress,
  TutorialCategory,
  TutorialFilter,
} from '../tutorial';

describe('Tutorial Types', () => {
  describe('TutorialStepType', () => {
    it('should accept valid step types', () => {
      const validTypes: TutorialStepType[] = [
        'info',
        'action',
        'highlight',
        'interactive',
        'quiz',
        'code',
        'video',
      ];

      validTypes.forEach(type => {
        expect(['info', 'action', 'highlight', 'interactive', 'quiz', 'code', 'video']).toContain(type);
      });
    });
  });

  describe('TutorialStatus', () => {
    it('should accept valid status values', () => {
      const validStatuses: TutorialStatus[] = [
        'not_started',
        'in_progress',
        'completed',
        'skipped',
      ];

      validStatuses.forEach(status => {
        expect(['not_started', 'in_progress', 'completed', 'skipped']).toContain(status);
      });
    });
  });

  describe('TutorialStep', () => {
    it('should have required properties', () => {
      const step: TutorialStep = {
        id: 'step-1',
        type: 'info',
        title: 'Introduction',
        content: 'Welcome to the tutorial',
      };

      expect(step).toHaveProperty('id');
      expect(step).toHaveProperty('type');
      expect(step).toHaveProperty('title');
      expect(step).toHaveProperty('content');
    });

    it('should support code snippet', () => {
      const stepWithCode: TutorialStep = {
        id: 'step-2',
        type: 'code',
        title: 'Code Example',
        content: 'Here is some code',
        codeSnippet: {
          language: 'javascript',
          code: 'console.log("Hello");',
          editable: true,
        },
      };

      expect(stepWithCode.codeSnippet).toBeDefined();
      expect(stepWithCode.codeSnippet?.language).toBe('javascript');
      expect(stepWithCode.codeSnippet?.code).toBe('console.log("Hello");');
      expect(stepWithCode.codeSnippet?.editable).toBe(true);
    });

    it('should support quiz content', () => {
      const stepWithQuiz: TutorialStep = {
        id: 'step-3',
        type: 'quiz',
        title: 'Quiz Question',
        content: 'Test your knowledge',
        quiz: {
          question: 'What is 2+2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1,
          explanation: 'The answer is 4',
        },
      };

      expect(stepWithQuiz.quiz).toBeDefined();
      expect(stepWithQuiz.quiz?.question).toBe('What is 2+2?');
      expect(stepWithQuiz.quiz?.options).toHaveLength(4);
      expect(stepWithQuiz.quiz?.correctAnswer).toBe(1);
    });

    it('should support action configuration', () => {
      const stepWithAction: TutorialStep = {
        id: 'step-4',
        type: 'action',
        title: 'Perform Action',
        content: 'Click the button',
        action: {
          type: 'click',
          target: '#submit-button',
        },
      };

      expect(stepWithAction.action).toBeDefined();
      expect(stepWithAction.action?.type).toBe('click');
      expect(stepWithAction.action?.target).toBe('#submit-button');
    });

    it('should support media URLs', () => {
      const stepWithMedia: TutorialStep = {
        id: 'step-5',
        type: 'video',
        title: 'Watch Video',
        content: 'Learn from video',
        imageUrl: '/images/thumbnail.png',
        videoUrl: '/videos/tutorial.mp4',
      };

      expect(stepWithMedia.imageUrl).toBe('/images/thumbnail.png');
      expect(stepWithMedia.videoUrl).toBe('/videos/tutorial.mp4');
    });

    it('should support navigation properties', () => {
      const step: TutorialStep = {
        id: 'step-6',
        type: 'info',
        title: 'Navigation Step',
        content: 'Navigate through tutorial',
        canSkip: true,
        nextStepId: 'step-7',
        previousStepId: 'step-5',
      };

      expect(step.canSkip).toBe(true);
      expect(step.nextStepId).toBe('step-7');
      expect(step.previousStepId).toBe('step-5');
    });
  });

  describe('Tutorial', () => {
    it('should have all required properties', () => {
      const tutorial: Tutorial = {
        id: 'tutorial-1',
        title: 'Getting Started',
        description: 'Learn the basics',
        category: 'basics',
        difficulty: 'beginner',
        estimatedTime: 30,
        tags: [],
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      };

      expect(tutorial).toHaveProperty('id');
      expect(tutorial).toHaveProperty('title');
      expect(tutorial).toHaveProperty('description');
      expect(tutorial).toHaveProperty('category');
      expect(tutorial).toHaveProperty('difficulty');
      expect(tutorial).toHaveProperty('estimatedTime');
      expect(tutorial).toHaveProperty('tags');
      expect(tutorial).toHaveProperty('steps');
      expect(tutorial).toHaveProperty('createdAt');
      expect(tutorial).toHaveProperty('updatedAt');
      expect(tutorial).toHaveProperty('version');
    });

    it('should accept valid difficulty levels', () => {
      const difficulties: Array<'beginner' | 'intermediate' | 'advanced'> = [
        'beginner',
        'intermediate',
        'advanced',
      ];

      difficulties.forEach(difficulty => {
        const tutorial: Tutorial = {
          id: `tut-${difficulty}`,
          title: `${difficulty} Tutorial`,
          description: 'Test',
          category: 'test',
          difficulty,
          estimatedTime: 30,
          tags: [],
          steps: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
        };

        expect(tutorial.difficulty).toBe(difficulty);
      });
    });

    it('should contain array of steps', () => {
      const tutorial: Tutorial = {
        id: 'tut-2',
        title: 'Multi-step Tutorial',
        description: 'Multiple steps',
        category: 'neural-networks',
        difficulty: 'intermediate',
        estimatedTime: 45,
        tags: [],
        steps: [
          {
            id: 'step-1',
            type: 'info',
            title: 'Step 1',
            content: 'First step',
          },
          {
            id: 'step-2',
            type: 'info',
            title: 'Step 2',
            content: 'Second step',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      };

      expect(tutorial.steps).toHaveLength(2);
      expect(tutorial.steps[0].id).toBe('step-1');
      expect(tutorial.steps[1].id).toBe('step-2');
    });

    it('should support prerequisites array', () => {
      const tutorial: Tutorial = {
        id: 'tut-3',
        title: 'Advanced Tutorial',
        description: 'Requires prerequisites',
        category: 'advanced',
        difficulty: 'advanced',
        estimatedTime: 60,
        tags: [],
        steps: [],
        prerequisites: ['tut-1', 'tut-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      };

      expect(tutorial.prerequisites).toHaveLength(2);
      expect(tutorial.prerequisites).toContain('tut-1');
      expect(tutorial.prerequisites).toContain('tut-2');
    });

    it('should support tags array', () => {
      const tutorial: Tutorial = {
        id: 'tut-4',
        title: 'Tagged Tutorial',
        description: 'With tags',
        category: 'visualization',
        difficulty: 'intermediate',
        estimatedTime: 40,
        tags: ['3d', 'visualization', 'babylonjs'],
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      };

      expect(tutorial.tags).toHaveLength(3);
      expect(tutorial.tags).toContain('3d');
      expect(tutorial.tags).toContain('visualization');
    });

    it('should support rewards', () => {
      const tutorial: Tutorial = {
        id: 'tut-5',
        title: 'Tutorial with Rewards',
        description: 'Earn rewards',
        category: 'basics',
        difficulty: 'beginner',
        estimatedTime: 25,
        tags: [],
        steps: [],
        rewards: {
          points: 100,
          badges: ['first-tutorial', 'quick-learner'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      };

      expect(tutorial.rewards).toBeDefined();
      expect(tutorial.rewards?.points).toBe(100);
      expect(tutorial.rewards?.badges).toHaveLength(2);
    });

    it('should have positive estimated time', () => {
      const tutorial: Tutorial = {
        id: 'tut-6',
        title: 'Timed Tutorial',
        description: 'With duration',
        category: 'basics',
        difficulty: 'beginner',
        estimatedTime: 25,
        tags: [],
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      };

      expect(tutorial.estimatedTime).toBeGreaterThan(0);
    });
  });

  describe('TutorialProgress', () => {
    it('should track tutorial progress', () => {
      const progress: TutorialProgress = {
        tutorialId: 'tut-1',
        userId: 'user-1',
        status: 'in_progress',
        currentStepId: 'step-2',
        completedSteps: ['step-1'],
        timeSpent: 300,
      };

      expect(progress.tutorialId).toBe('tut-1');
      expect(progress.userId).toBe('user-1');
      expect(progress.status).toBe('in_progress');
      expect(progress.currentStepId).toBe('step-2');
      expect(progress.completedSteps).toHaveLength(1);
      expect(progress.timeSpent).toBe(300);
    });

    it('should support optional timestamps', () => {
      const progress: TutorialProgress = {
        tutorialId: 'tut-1',
        userId: 'user-1',
        status: 'completed',
        currentStepId: 'step-final',
        completedSteps: ['step-1', 'step-2', 'step-final'],
        startedAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-02'),
        timeSpent: 3600,
        score: 95,
      };

      expect(progress.startedAt).toBeInstanceOf(Date);
      expect(progress.completedAt).toBeInstanceOf(Date);
      expect(progress.score).toBe(95);
    });
  });

  describe('TutorialCategory', () => {
    it('should define tutorial categories', () => {
      const category: TutorialCategory = {
        id: 'cat-1',
        name: 'Neural Networks',
        description: 'Learn about neural networks',
        icon: 'brain',
        tutorials: ['tut-1', 'tut-2', 'tut-3'],
        order: 1,
      };

      expect(category.id).toBe('cat-1');
      expect(category.name).toBe('Neural Networks');
      expect(category.tutorials).toHaveLength(3);
      expect(category.order).toBe(1);
    });
  });

  describe('TutorialFilter', () => {
    it('should support filtering by category', () => {
      const filter: TutorialFilter = {
        category: 'basics',
      };

      expect(filter.category).toBe('basics');
    });

    it('should support filtering by difficulty', () => {
      const filter: TutorialFilter = {
        difficulty: 'beginner',
      };

      expect(filter.difficulty).toBe('beginner');
    });

    it('should support filtering by tags', () => {
      const filter: TutorialFilter = {
        tags: ['3d', 'visualization'],
      };

      expect(filter.tags).toHaveLength(2);
    });

    it('should support filtering by status', () => {
      const filter: TutorialFilter = {
        status: 'completed',
      };

      expect(filter.status).toBe('completed');
    });

    it('should support search query', () => {
      const filter: TutorialFilter = {
        searchQuery: 'neural network',
      };

      expect(filter.searchQuery).toBe('neural network');
    });

    it('should support combined filters', () => {
      const filter: TutorialFilter = {
        category: 'basics',
        difficulty: 'beginner',
        tags: ['intro'],
        status: 'not_started',
        searchQuery: 'getting started',
      };

      expect(filter.category).toBe('basics');
      expect(filter.difficulty).toBe('beginner');
      expect(filter.tags).toContain('intro');
      expect(filter.status).toBe('not_started');
      expect(filter.searchQuery).toBe('getting started');
    });
  });
});

// Made with Bob
