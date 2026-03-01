/**
 * QuizCard Component Tests
 * 
 * Tests for the QuizCard component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/test/utils';
import { QuizCard } from '../QuizCard';
import type { Quiz } from '@/types/quiz';

const mockQuiz: Quiz = {
  id: 'quiz-1',
  title: 'Neural Networks Quiz',
  description: 'Test your knowledge of neural networks',
  category: 'neural-networks',
  difficulty: 'medium',
  estimatedTime: 20,
  passingScore: 70,
  questions: [
    {
      id: 'q1',
      type: 'multiple-choice',
      difficulty: 'easy',
      question: 'What is a neuron?',
      explanation: 'A neuron is a basic unit',
      points: 10,
      options: [
        { id: 'opt1', text: 'A', isCorrect: true },
        { id: 'opt2', text: 'B', isCorrect: false },
      ],
    },
  ],
  tags: ['ml', 'neural-networks'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('QuizCard', () => {
  describe('Rendering', () => {
    it('should render quiz title', () => {
      render(<QuizCard quiz={mockQuiz} />);
      expect(screen.getByText('Neural Networks Quiz')).toBeInTheDocument();
    });

    it('should render quiz description', () => {
      render(<QuizCard quiz={mockQuiz} />);
      expect(screen.getByText('Test your knowledge of neural networks')).toBeInTheDocument();
    });

    it('should render difficulty badge', () => {
      render(<QuizCard quiz={mockQuiz} />);
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should render question count', () => {
      render(<QuizCard quiz={mockQuiz} />);
      expect(screen.getByText('1 questions')).toBeInTheDocument();
    });

    it('should render estimated time', () => {
      render(<QuizCard quiz={mockQuiz} />);
      expect(screen.getByText('20 min')).toBeInTheDocument();
    });

    it('should render passing score', () => {
      render(<QuizCard quiz={mockQuiz} />);
      expect(screen.getByText('Passing Score:')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('should render tags', () => {
      render(<QuizCard quiz={mockQuiz} />);
      expect(screen.getByText('ml')).toBeInTheDocument();
      expect(screen.getByText('neural-networks')).toBeInTheDocument();
    });

    it('should render category', () => {
      render(<QuizCard quiz={mockQuiz} />);
      expect(screen.getByText(/neural-networks/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when card is clicked', async () => {
      const handleClick = vi.fn();
      render(<QuizCard quiz={mockQuiz} onClick={handleClick} />);
      
      const card = screen.getByRole('article');
      await userEvent.click(card);
      
      expect(handleClick).toHaveBeenCalledWith(mockQuiz);
    });

    it('should call onStart when start button is clicked', async () => {
      const handleStart = vi.fn();
      render(<QuizCard quiz={mockQuiz} onStart={handleStart} />);
      
      const startButton = screen.getByRole('button', { name: /start quiz/i });
      await userEvent.click(startButton);
      
      expect(handleStart).toHaveBeenCalledWith(mockQuiz);
    });

    it('should show hover effect on mouse enter', async () => {
      render(<QuizCard quiz={mockQuiz} />);
      
      const card = screen.getByRole('article');
      await userEvent.hover(card);
      
      expect(card).toHaveClass('hover:shadow-lg');
    });
  });

  describe('Score Display', () => {
    it('should show score when provided', () => {
      render(<QuizCard quiz={mockQuiz} score={85} />);
      
      expect(screen.getByText('Your Best Score:')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should show passed badge when score >= passing score', () => {
      render(<QuizCard quiz={mockQuiz} score={75} />);
      
      expect(screen.getByText('✓ Passed')).toBeInTheDocument();
    });

    it('should not show passed badge when score < passing score', () => {
      render(<QuizCard quiz={mockQuiz} score={65} />);
      
      expect(screen.queryByText('✓ Passed')).not.toBeInTheDocument();
    });

    it('should show attempts count when provided', () => {
      render(<QuizCard quiz={mockQuiz} score={80} attempts={3} />);
      
      expect(screen.getByText('Attempts: 3')).toBeInTheDocument();
    });

    it('should use userScore over score when both provided', () => {
      render(<QuizCard quiz={mockQuiz} score={60} userScore={90} />);
      
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.queryByText('60%')).not.toBeInTheDocument();
    });
  });

  describe('Score Colors', () => {
    it('should show green color for passing score', () => {
      render(<QuizCard quiz={mockQuiz} score={85} />);
      
      const scoreElement = screen.getByText('85%');
      expect(scoreElement).toHaveClass('text-green-600');
    });

    it('should show yellow color for near-passing score', () => {
      render(<QuizCard quiz={mockQuiz} score={60} />);
      
      const scoreElement = screen.getByText('60%');
      expect(scoreElement).toHaveClass('text-yellow-600');
    });

    it('should show red color for failing score', () => {
      render(<QuizCard quiz={mockQuiz} score={40} />);
      
      const scoreElement = screen.getByText('40%');
      expect(scoreElement).toHaveClass('text-red-600');
    });
  });

  describe('Difficulty Levels', () => {
    it('should render easy difficulty with correct color', () => {
      const easyQuiz = { ...mockQuiz, difficulty: 'easy' as const };
      render(<QuizCard quiz={easyQuiz} />);
      
      const badge = screen.getByText('Easy');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('should render medium difficulty with correct color', () => {
      render(<QuizCard quiz={mockQuiz} />);
      
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('bg-yellow-100');
    });

    it('should render hard difficulty with correct color', () => {
      const hardQuiz = { ...mockQuiz, difficulty: 'hard' as const };
      render(<QuizCard quiz={hardQuiz} />);
      
      const badge = screen.getByText('Hard');
      expect(badge).toHaveClass('bg-red-100');
    });
  });

  describe('Prerequisites', () => {
    it('should show prerequisites badge when prerequisites exist', () => {
      const quizWithPrereqs = {
        ...mockQuiz,
        prerequisites: ['quiz-0'],
      };
      render(<QuizCard quiz={quizWithPrereqs} />);
      
      expect(screen.getByText(/prerequisites/i)).toBeInTheDocument();
    });

    it('should not show prerequisites badge when no prerequisites', () => {
      render(<QuizCard quiz={mockQuiz} />);
      
      const text = screen.queryByText(/prerequisites/i);
      // Should only appear in aria-label, not as visible text
      expect(text).not.toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('should show "Start Quiz" when no score', () => {
      render(<QuizCard quiz={mockQuiz} />);
      
      expect(screen.getByRole('button', { name: /start quiz/i })).toBeInTheDocument();
    });

    it('should show "Retake Quiz" when score exists', () => {
      render(<QuizCard quiz={mockQuiz} score={75} />);
      
      expect(screen.getByRole('button', { name: /retake quiz/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<QuizCard quiz={mockQuiz} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Neural Networks Quiz'));
    });

    it('should be keyboard navigable', async () => {
      const handleClick = vi.fn();
      render(<QuizCard quiz={mockQuiz} onClick={handleClick} />);
      
      const card = screen.getByRole('article');
      card.focus();
      
      expect(card).toHaveFocus();
    });

    it('should support keyboard activation', async () => {
      const handleClick = vi.fn();
      render(<QuizCard quiz={mockQuiz} onClick={handleClick} />);
      
      const card = screen.getByRole('article');
      card.focus();
      await userEvent.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields', () => {
      const minimalQuiz: Quiz = {
        id: 'quiz-2',
        title: 'Minimal Quiz',
        description: 'Description',
        category: 'basics',
        difficulty: 'easy',
        estimatedTime: 10,
        passingScore: 60,
        questions: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      render(<QuizCard quiz={minimalQuiz} />);
      expect(screen.getByText('Minimal Quiz')).toBeInTheDocument();
    });

    it('should handle long titles gracefully', () => {
      const longTitleQuiz = {
        ...mockQuiz,
        title: 'This is a very long quiz title that should be truncated properly to avoid layout issues',
      };
      
      render(<QuizCard quiz={longTitleQuiz} />);
      const title = screen.getByText(/This is a very long/);
      expect(title).toHaveClass('truncate');
    });

    it('should handle many tags', () => {
      const manyTagsQuiz = {
        ...mockQuiz,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
      };
      
      render(<QuizCard quiz={manyTagsQuiz} />);
      // Should show first 3 tags and "+X more"
      expect(screen.getByText(/\+3 more/)).toBeInTheDocument();
    });

    it('should handle multiple questions correctly', () => {
      const multiQuestionQuiz = {
        ...mockQuiz,
        questions: [
          ...mockQuiz.questions,
          {
            id: 'q2',
            type: 'true-false' as const,
            difficulty: 'easy' as const,
            question: 'True or false?',
            explanation: 'Explanation',
            points: 5,
            correctAnswer: true,
          },
        ],
      };
      
      render(<QuizCard quiz={multiQuestionQuiz} />);
      expect(screen.getByText('2 questions')).toBeInTheDocument();
    });

    it('should handle zero attempts', () => {
      render(<QuizCard quiz={mockQuiz} score={80} attempts={0} />);
      
      expect(screen.getByText('Attempts: 0')).toBeInTheDocument();
    });
  });
});

// Made with Bob
