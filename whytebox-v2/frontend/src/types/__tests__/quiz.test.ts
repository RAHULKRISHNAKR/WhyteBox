/**
 * Quiz Type Tests
 * 
 * Unit tests for quiz type definitions and validation
 */

import { describe, it, expect } from 'vitest';
import type {
  QuestionType,
  QuestionDifficulty,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  FillInBlankQuestion,
  CodeCompletionQuestion,
  MatchingQuestion,
  Question,
  Quiz,
  QuestionAnswer,
  QuestionResult,
  QuizAttempt,
  QuizResult,
  QuizStatistics,
  QuizProgress,
  QuizFilters,
  QuizSortBy,
} from '../quiz';

describe('Quiz Types', () => {
  describe('QuestionType', () => {
    it('should accept valid question types', () => {
      const validTypes: QuestionType[] = [
        'multiple-choice',
        'true-false',
        'fill-in-blank',
        'code-completion',
        'matching',
      ];

      validTypes.forEach(type => {
        expect([
          'multiple-choice',
          'true-false',
          'fill-in-blank',
          'code-completion',
          'matching',
        ]).toContain(type);
      });
    });
  });

  describe('QuestionDifficulty', () => {
    it('should accept valid difficulty levels', () => {
      const validDifficulties: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

      validDifficulties.forEach(difficulty => {
        expect(['easy', 'medium', 'hard']).toContain(difficulty);
      });
    });
  });

  describe('MultipleChoiceQuestion', () => {
    it('should have required properties', () => {
      const question: MultipleChoiceQuestion = {
        id: 'q1',
        type: 'multiple-choice',
        difficulty: 'easy',
        question: 'What is 2+2?',
        explanation: 'Basic addition',
        points: 10,
        options: [
          { id: 'opt1', text: '3', isCorrect: false },
          { id: 'opt2', text: '4', isCorrect: true },
          { id: 'opt3', text: '5', isCorrect: false },
        ],
      };

      expect(question.type).toBe('multiple-choice');
      expect(question.options).toHaveLength(3);
      expect(question.options[1].isCorrect).toBe(true);
    });

    it('should support multiple correct answers', () => {
      const question: MultipleChoiceQuestion = {
        id: 'q2',
        type: 'multiple-choice',
        difficulty: 'medium',
        question: 'Select all prime numbers',
        explanation: 'Prime numbers are divisible only by 1 and themselves',
        points: 15,
        options: [
          { id: 'opt1', text: '2', isCorrect: true },
          { id: 'opt2', text: '3', isCorrect: true },
          { id: 'opt3', text: '4', isCorrect: false },
          { id: 'opt4', text: '5', isCorrect: true },
        ],
        allowMultiple: true,
      };

      expect(question.allowMultiple).toBe(true);
      const correctOptions = question.options.filter(opt => opt.isCorrect);
      expect(correctOptions).toHaveLength(3);
    });

    it('should support optional fields', () => {
      const question: MultipleChoiceQuestion = {
        id: 'q3',
        type: 'multiple-choice',
        difficulty: 'hard',
        question: 'Complex question',
        explanation: 'Detailed explanation',
        points: 20,
        options: [
          { id: 'opt1', text: 'A', isCorrect: true },
          { id: 'opt2', text: 'B', isCorrect: false },
        ],
        timeLimit: 60,
        hints: ['Hint 1', 'Hint 2'],
        tags: ['advanced', 'theory'],
      };

      expect(question.timeLimit).toBe(60);
      expect(question.hints).toHaveLength(2);
      expect(question.tags).toHaveLength(2);
    });
  });

  describe('TrueFalseQuestion', () => {
    it('should have boolean answer', () => {
      const question: TrueFalseQuestion = {
        id: 'q4',
        type: 'true-false',
        difficulty: 'easy',
        question: 'The sky is blue',
        explanation: 'The sky appears blue due to Rayleigh scattering',
        points: 5,
        correctAnswer: true,
      };

      expect(question.type).toBe('true-false');
      expect(question.correctAnswer).toBe(true);
    });
  });

  describe('FillInBlankQuestion', () => {
    it('should have template and correct answers', () => {
      const question: FillInBlankQuestion = {
        id: 'q5',
        type: 'fill-in-blank',
        difficulty: 'medium',
        question: 'Complete the sentence',
        explanation: 'Paris is the capital of France',
        points: 10,
        template: 'The capital of France is ___',
        correctAnswers: ['Paris', 'paris'],
      };

      expect(question.type).toBe('fill-in-blank');
      expect(question.template).toContain('___');
      expect(question.correctAnswers).toHaveLength(2);
    });

    it('should support case sensitivity', () => {
      const question: FillInBlankQuestion = {
        id: 'q6',
        type: 'fill-in-blank',
        difficulty: 'hard',
        question: 'Enter the exact command',
        explanation: 'Case matters in commands',
        points: 15,
        template: 'Use ___ to list files',
        correctAnswers: ['ls'],
        caseSensitive: true,
      };

      expect(question.caseSensitive).toBe(true);
    });
  });

  describe('CodeCompletionQuestion', () => {
    it('should have code template and correct code', () => {
      const question: CodeCompletionQuestion = {
        id: 'q7',
        type: 'code-completion',
        difficulty: 'hard',
        question: 'Complete the function',
        explanation: 'Function to add two numbers',
        points: 25,
        codeTemplate: 'function add(a, b) {\n  // Your code here\n}',
        correctCode: 'function add(a, b) {\n  return a + b;\n}',
        language: 'javascript',
      };

      expect(question.type).toBe('code-completion');
      expect(question.language).toBe('javascript');
      expect(question.codeTemplate).toContain('// Your code here');
    });

    it('should support test cases', () => {
      const question: CodeCompletionQuestion = {
        id: 'q8',
        type: 'code-completion',
        difficulty: 'hard',
        question: 'Implement factorial',
        explanation: 'Recursive factorial function',
        points: 30,
        codeTemplate: 'def factorial(n):\n    pass',
        correctCode: 'def factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)',
        language: 'python',
        testCases: [
          { input: '5', expectedOutput: '120' },
          { input: '0', expectedOutput: '1' },
          { input: '3', expectedOutput: '6' },
        ],
      };

      expect(question.testCases).toHaveLength(3);
      expect(question.testCases?.[0].expectedOutput).toBe('120');
    });
  });

  describe('MatchingQuestion', () => {
    it('should have pairs to match', () => {
      const question: MatchingQuestion = {
        id: 'q9',
        type: 'matching',
        difficulty: 'medium',
        question: 'Match the terms with definitions',
        explanation: 'Basic ML concepts',
        points: 20,
        pairs: [
          { id: 'p1', left: 'CNN', right: 'Convolutional Neural Network' },
          { id: 'p2', left: 'RNN', right: 'Recurrent Neural Network' },
          { id: 'p3', left: 'GAN', right: 'Generative Adversarial Network' },
        ],
      };

      expect(question.type).toBe('matching');
      expect(question.pairs).toHaveLength(3);
      expect(question.pairs[0].left).toBe('CNN');
    });
  });

  describe('Quiz', () => {
    it('should have all required properties', () => {
      const quiz: Quiz = {
        id: 'quiz-1',
        title: 'Neural Networks Basics',
        description: 'Test your knowledge',
        category: 'neural-networks',
        difficulty: 'medium',
        estimatedTime: 30,
        passingScore: 70,
        questions: [],
        tags: ['ml', 'neural-networks'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(quiz).toHaveProperty('id');
      expect(quiz).toHaveProperty('title');
      expect(quiz).toHaveProperty('passingScore');
      expect(quiz.passingScore).toBe(70);
    });

    it('should contain multiple questions', () => {
      const quiz: Quiz = {
        id: 'quiz-2',
        title: 'Mixed Quiz',
        description: 'Various question types',
        category: 'basics',
        difficulty: 'easy',
        estimatedTime: 20,
        passingScore: 60,
        questions: [
          {
            id: 'q1',
            type: 'multiple-choice',
            difficulty: 'easy',
            question: 'Question 1',
            explanation: 'Explanation 1',
            points: 10,
            options: [
              { id: 'opt1', text: 'A', isCorrect: true },
              { id: 'opt2', text: 'B', isCorrect: false },
            ],
          },
          {
            id: 'q2',
            type: 'true-false',
            difficulty: 'easy',
            question: 'Question 2',
            explanation: 'Explanation 2',
            points: 5,
            correctAnswer: true,
          },
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(quiz.questions).toHaveLength(2);
      expect(quiz.questions[0].type).toBe('multiple-choice');
      expect(quiz.questions[1].type).toBe('true-false');
    });

    it('should support prerequisites', () => {
      const quiz: Quiz = {
        id: 'quiz-3',
        title: 'Advanced Quiz',
        description: 'Requires prerequisites',
        category: 'advanced',
        difficulty: 'hard',
        estimatedTime: 45,
        passingScore: 80,
        questions: [],
        tags: [],
        prerequisites: ['quiz-1', 'quiz-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(quiz.prerequisites).toHaveLength(2);
      expect(quiz.prerequisites).toContain('quiz-1');
    });
  });

  describe('QuestionAnswer', () => {
    it('should track user answer', () => {
      const answer: QuestionAnswer = {
        questionId: 'q1',
        answer: 'opt2',
        timeSpent: 30,
        hintsUsed: 1,
        timestamp: new Date(),
      };

      expect(answer.questionId).toBe('q1');
      expect(answer.timeSpent).toBe(30);
      expect(answer.hintsUsed).toBe(1);
    });

    it('should support different answer types', () => {
      const multipleAnswer: QuestionAnswer = {
        questionId: 'q2',
        answer: ['opt1', 'opt2', 'opt3'],
        timeSpent: 45,
        hintsUsed: 0,
        timestamp: new Date(),
      };

      const booleanAnswer: QuestionAnswer = {
        questionId: 'q3',
        answer: true,
        timeSpent: 15,
        hintsUsed: 0,
        timestamp: new Date(),
      };

      expect(Array.isArray(multipleAnswer.answer)).toBe(true);
      expect(typeof booleanAnswer.answer).toBe('boolean');
    });
  });

  describe('QuestionResult', () => {
    it('should evaluate question result', () => {
      const result: QuestionResult = {
        questionId: 'q1',
        isCorrect: true,
        pointsEarned: 10,
        pointsPossible: 10,
        feedback: 'Correct!',
        userAnswer: 'opt2',
        timeSpent: 25,
      };

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(result.pointsPossible);
    });

    it('should show correct answer for wrong answers', () => {
      const result: QuestionResult = {
        questionId: 'q2',
        isCorrect: false,
        pointsEarned: 0,
        pointsPossible: 15,
        feedback: 'Incorrect. The correct answer is...',
        correctAnswer: 'opt3',
        userAnswer: 'opt1',
        timeSpent: 40,
      };

      expect(result.isCorrect).toBe(false);
      expect(result.correctAnswer).toBe('opt3');
      expect(result.pointsEarned).toBe(0);
    });
  });

  describe('QuizAttempt', () => {
    it('should track quiz attempt', () => {
      const attempt: QuizAttempt = {
        id: 'attempt-1',
        quizId: 'quiz-1',
        userId: 'user-1',
        startedAt: new Date(),
        answers: [],
        status: 'in-progress',
      };

      expect(attempt.status).toBe('in-progress');
      expect(attempt.answers).toHaveLength(0);
    });

    it('should track completed attempt', () => {
      const attempt: QuizAttempt = {
        id: 'attempt-2',
        quizId: 'quiz-1',
        userId: 'user-1',
        startedAt: new Date('2024-01-01T10:00:00'),
        completedAt: new Date('2024-01-01T10:30:00'),
        answers: [
          {
            questionId: 'q1',
            answer: 'opt2',
            timeSpent: 30,
            hintsUsed: 0,
            timestamp: new Date(),
          },
        ],
        status: 'completed',
        results: {
          attemptId: 'attempt-2',
          quizId: 'quiz-1',
          userId: 'user-1',
          score: 85,
          pointsEarned: 85,
          pointsPossible: 100,
          correctAnswers: 8,
          totalQuestions: 10,
          timeSpent: 1800,
          passed: true,
          questionResults: [],
          completedAt: new Date(),
        },
      };

      expect(attempt.status).toBe('completed');
      expect(attempt.results?.passed).toBe(true);
      expect(attempt.results?.score).toBe(85);
    });
  });

  describe('QuizResult', () => {
    it('should calculate quiz results', () => {
      const result: QuizResult = {
        attemptId: 'attempt-1',
        quizId: 'quiz-1',
        userId: 'user-1',
        score: 75,
        pointsEarned: 75,
        pointsPossible: 100,
        correctAnswers: 7,
        totalQuestions: 10,
        timeSpent: 1200,
        passed: true,
        questionResults: [],
        completedAt: new Date(),
      };

      expect(result.score).toBe(75);
      expect(result.passed).toBe(true);
      expect(result.correctAnswers / result.totalQuestions).toBeCloseTo(0.7);
    });

    it('should support certificate earning', () => {
      const result: QuizResult = {
        attemptId: 'attempt-2',
        quizId: 'quiz-2',
        userId: 'user-2',
        score: 95,
        pointsEarned: 95,
        pointsPossible: 100,
        correctAnswers: 19,
        totalQuestions: 20,
        timeSpent: 1500,
        passed: true,
        questionResults: [],
        completedAt: new Date(),
        certificateEarned: true,
      };

      expect(result.certificateEarned).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(90);
    });
  });

  describe('QuizStatistics', () => {
    it('should track quiz statistics', () => {
      const stats: QuizStatistics = {
        quizId: 'quiz-1',
        totalAttempts: 100,
        averageScore: 72.5,
        passRate: 0.75,
        averageTimeSpent: 1500,
        difficultyRating: 3.5,
        completionRate: 0.85,
        questionStats: [
          {
            questionId: 'q1',
            correctRate: 0.8,
            averageTimeSpent: 45,
            skipRate: 0.05,
          },
        ],
      };

      expect(stats.totalAttempts).toBe(100);
      expect(stats.passRate).toBe(0.75);
      expect(stats.questionStats).toHaveLength(1);
    });
  });

  describe('QuizProgress', () => {
    it('should track quiz progress', () => {
      const progress: QuizProgress = {
        quizId: 'quiz-1',
        currentQuestionIndex: 3,
        answeredQuestions: new Set(['q1', 'q2', 'q3']),
        timeElapsed: 300,
        hintsUsed: new Map([['q2', 1]]),
        bookmarked: new Set(['q5']),
      };

      expect(progress.currentQuestionIndex).toBe(3);
      expect(progress.answeredQuestions.size).toBe(3);
      expect(progress.hintsUsed.get('q2')).toBe(1);
      expect(progress.bookmarked.has('q5')).toBe(true);
    });
  });

  describe('QuizFilters', () => {
    it('should support filtering options', () => {
      const filters: QuizFilters = {
        category: 'neural-networks',
        difficulty: 'medium',
        tags: ['ml', 'deep-learning'],
        completed: false,
        minScore: 70,
        maxScore: 100,
      };

      expect(filters.category).toBe('neural-networks');
      expect(filters.difficulty).toBe('medium');
      expect(filters.tags).toHaveLength(2);
      expect(filters.minScore).toBe(70);
    });
  });

  describe('QuizSortBy', () => {
    it('should accept valid sort options', () => {
      const validSortOptions: QuizSortBy[] = [
        'title',
        'difficulty',
        'estimatedTime',
        'popularity',
        'recentlyAdded',
        'myScore',
      ];

      validSortOptions.forEach(option => {
        expect([
          'title',
          'difficulty',
          'estimatedTime',
          'popularity',
          'recentlyAdded',
          'myScore',
        ]).toContain(option);
      });
    });
  });
});

// Made with Bob
