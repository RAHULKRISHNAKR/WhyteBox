/**
 * TutorialCard Component Tests
 * 
 * Tests for the TutorialCard component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/test/utils';
import { TutorialCard } from '../TutorialCard';
import type { Tutorial } from '@/types/tutorial';

const mockTutorial: Tutorial = {
  id: 'tutorial-1',
  title: 'Getting Started with Neural Networks',
  description: 'Learn the basics of neural networks',
  category: 'basics',
  difficulty: 'beginner',
  estimatedTime: 30,
  tags: ['ml', 'neural-networks'],
  steps: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  version: '1.0.0',
};

describe('TutorialCard', () => {
  describe('Rendering', () => {
    it('should render tutorial title', () => {
      render(<TutorialCard tutorial={mockTutorial} />);
      expect(screen.getByText('Getting Started with Neural Networks')).toBeInTheDocument();
    });

    it('should render tutorial description', () => {
      render(<TutorialCard tutorial={mockTutorial} />);
      expect(screen.getByText('Learn the basics of neural networks')).toBeInTheDocument();
    });

    it('should render difficulty badge', () => {
      render(<TutorialCard tutorial={mockTutorial} />);
      expect(screen.getByText('Beginner')).toBeInTheDocument();
    });

    it('should render estimated time', () => {
      render(<TutorialCard tutorial={mockTutorial} />);
      expect(screen.getByText('30 min')).toBeInTheDocument();
    });

    it('should render tags', () => {
      render(<TutorialCard tutorial={mockTutorial} />);
      expect(screen.getByText('ml')).toBeInTheDocument();
      expect(screen.getByText('neural-networks')).toBeInTheDocument();
    });

    it('should render category', () => {
      render(<TutorialCard tutorial={mockTutorial} />);
      expect(screen.getByText(/basics/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when card is clicked', async () => {
      const handleClick = vi.fn();
      render(<TutorialCard tutorial={mockTutorial} onClick={handleClick} />);
      
      const card = screen.getByRole('article');
      await userEvent.click(card);
      
      expect(handleClick).toHaveBeenCalledWith(mockTutorial);
    });

    it('should call onStart when start button is clicked', async () => {
      const handleStart = vi.fn();
      render(<TutorialCard tutorial={mockTutorial} onStart={handleStart} />);
      
      const startButton = screen.getByRole('button', { name: /start/i });
      await userEvent.click(startButton);
      
      expect(handleStart).toHaveBeenCalledWith(mockTutorial.id);
    });

    it('should show hover effect on mouse enter', async () => {
      render(<TutorialCard tutorial={mockTutorial} />);
      
      const card = screen.getByRole('article');
      await userEvent.hover(card);
      
      expect(card).toHaveClass('hover:shadow-lg');
    });
  });

  describe('Progress Display', () => {
    it('should show progress bar when progress is provided', () => {
      render(<TutorialCard tutorial={mockTutorial} progress={50} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should show completed badge when progress is 100%', () => {
      render(<TutorialCard tutorial={mockTutorial} progress={100} />);
      
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    it('should show in progress badge when progress is between 0-100%', () => {
      render(<TutorialCard tutorial={mockTutorial} progress={50} />);
      
      expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    });
  });

  describe('Difficulty Levels', () => {
    it('should render beginner difficulty with correct color', () => {
      render(<TutorialCard tutorial={mockTutorial} />);
      
      const badge = screen.getByText('Beginner');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('should render intermediate difficulty with correct color', () => {
      const intermediateTutorial = { ...mockTutorial, difficulty: 'intermediate' as const };
      render(<TutorialCard tutorial={intermediateTutorial} />);
      
      const badge = screen.getByText('Intermediate');
      expect(badge).toHaveClass('bg-yellow-100');
    });

    it('should render advanced difficulty with correct color', () => {
      const advancedTutorial = { ...mockTutorial, difficulty: 'advanced' as const };
      render(<TutorialCard tutorial={advancedTutorial} />);
      
      const badge = screen.getByText('Advanced');
      expect(badge).toHaveClass('bg-red-100');
    });
  });

  describe('Prerequisites', () => {
    it('should show prerequisites badge when prerequisites exist', () => {
      const tutorialWithPrereqs = {
        ...mockTutorial,
        prerequisites: ['tutorial-0'],
      };
      render(<TutorialCard tutorial={tutorialWithPrereqs} />);
      
      expect(screen.getByText(/prerequisites/i)).toBeInTheDocument();
    });

    it('should not show prerequisites badge when no prerequisites', () => {
      render(<TutorialCard tutorial={mockTutorial} />);
      
      expect(screen.queryByText(/prerequisites/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TutorialCard tutorial={mockTutorial} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Getting Started'));
    });

    it('should be keyboard navigable', async () => {
      const handleClick = vi.fn();
      render(<TutorialCard tutorial={mockTutorial} onClick={handleClick} />);
      
      const card = screen.getByRole('article');
      card.focus();
      
      expect(card).toHaveFocus();
    });

    it('should support keyboard activation', async () => {
      const handleClick = vi.fn();
      render(<TutorialCard tutorial={mockTutorial} onClick={handleClick} />);
      
      const card = screen.getByRole('article');
      card.focus();
      await userEvent.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields', () => {
      const minimalTutorial: Tutorial = {
        id: 'tutorial-2',
        title: 'Minimal Tutorial',
        description: 'Description',
        category: 'basics',
        difficulty: 'beginner',
        estimatedTime: 15,
        tags: [],
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      };
      
      render(<TutorialCard tutorial={minimalTutorial} />);
      expect(screen.getByText('Minimal Tutorial')).toBeInTheDocument();
    });

    it('should handle long titles gracefully', () => {
      const longTitleTutorial = {
        ...mockTutorial,
        title: 'This is a very long tutorial title that should be truncated properly to avoid layout issues',
      };
      
      render(<TutorialCard tutorial={longTitleTutorial} />);
      const title = screen.getByText(/This is a very long/);
      expect(title).toHaveClass('truncate');
    });

    it('should handle many tags', () => {
      const manyTagsTutorial = {
        ...mockTutorial,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
      };
      
      render(<TutorialCard tutorial={manyTagsTutorial} />);
      // Should show first few tags and "+X more"
      expect(screen.getByText(/\+\d+ more/)).toBeInTheDocument();
    });
  });
});

// Made with Bob
