import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TutorialProvider, useTutorial } from '../TutorialContext';
import type { Tutorial, TutorialStep } from '@/types/tutorial';

// Mock tutorial data
const createMockStep = (id: string, title: string): TutorialStep => ({
  id,
  type: 'info',
  title,
  content: `Content for ${title}`,
  canSkip: true,
});

const createMockTutorial = (id: string, title: string): Tutorial => ({
  id,
  title,
  description: `Description for ${title}`,
  category: 'test',
  difficulty: 'beginner',
  estimatedTime: 10,
  tags: ['test'],
  steps: [
    createMockStep(`${id}-step-1`, 'Step 1'),
    createMockStep(`${id}-step-2`, 'Step 2'),
    createMockStep(`${id}-step-3`, 'Step 3'),
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  version: '1.0.0',
});

describe('TutorialContext Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Context Provider with Components', () => {
    it('should provide tutorial context to child components', () => {
      const TestComponent = () => {
        const { isActive } = useTutorial();
        return <div data-testid="active-status">{isActive ? 'Active' : 'Inactive'}</div>;
      };

      render(
        <TutorialProvider>
          <TestComponent />
        </TutorialProvider>
      );

      expect(screen.getByTestId('active-status')).toHaveTextContent('Inactive');
    });

    it('should start tutorial and update context', async () => {
      const user = userEvent.setup();
      const tutorial = createMockTutorial('tut-1', 'Test Tutorial');

      const TestComponent = () => {
        const { startTutorial, currentTutorial, isActive } = useTutorial();

        return (
          <div>
            <button onClick={() => startTutorial('tut-1')}>Start</button>
            <div data-testid="active">{isActive ? 'Yes' : 'No'}</div>
            <div data-testid="title">{currentTutorial?.title || 'None'}</div>
          </div>
        );
      };

      render(
        <TutorialProvider initialTutorials={[tutorial]}>
          <TestComponent />
        </TutorialProvider>
      );

      expect(screen.getByTestId('active')).toHaveTextContent('No');
      expect(screen.getByTestId('title')).toHaveTextContent('None');

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('active')).toHaveTextContent('Yes');
        expect(screen.getByTestId('title')).toHaveTextContent('Test Tutorial');
      });
    });

    it('should persist progress to localStorage', async () => {
      const user = userEvent.setup();
      const tutorial = createMockTutorial('tut-1', 'Test Tutorial');

      const TestComponent = () => {
        const { startTutorial } = useTutorial();
        return <button onClick={() => startTutorial('tut-1')}>Start</button>;
      };

      render(
        <TutorialProvider initialTutorials={[tutorial]}>
          <TestComponent />
        </TutorialProvider>
      );

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        const stored = localStorage.getItem('tutorial-progress');
        expect(stored).toBeTruthy();
        const progress = JSON.parse(stored!);
        expect(progress['tut-1']).toMatchObject({
          tutorialId: 'tut-1',
          status: 'in_progress',
        });
      });
    });

    it('should load progress from localStorage on mount', () => {
      const progress = {
        'tut-1': {
          tutorialId: 'tut-1',
          userId: 'user-1',
          status: 'in_progress',
          currentStepId: 'tut-1-step-2',
          completedSteps: ['tut-1-step-1'],
          startedAt: new Date().toISOString(),
          timeSpent: 120,
        },
      };

      localStorage.setItem('tutorial-progress', JSON.stringify(progress));

      const TestComponent = () => {
        const { getProgress } = useTutorial();
        const tutProgress = getProgress('tut-1');

        return (
          <div>
            <div data-testid="status">{tutProgress?.status || 'none'}</div>
            <div data-testid="step">{tutProgress?.currentStepId || 'none'}</div>
          </div>
        );
      };

      render(
        <TutorialProvider>
          <TestComponent />
        </TutorialProvider>
      );

      expect(screen.getByTestId('status')).toHaveTextContent('in_progress');
      expect(screen.getByTestId('step')).toHaveTextContent('tut-1-step-2');
    });
  });

  describe('Tutorial Navigation', () => {
    it('should navigate to next step', async () => {
      const user = userEvent.setup();
      const tutorial = createMockTutorial('tut-1', 'Test Tutorial');

      const TestComponent = () => {
        const { startTutorial, nextStep, currentStepIndex, currentStep } = useTutorial();

        return (
          <div>
            <button onClick={() => startTutorial('tut-1')}>Start</button>
            <button onClick={nextStep}>Next</button>
            <div data-testid="index">{currentStepIndex}</div>
            <div data-testid="step-title">{currentStep?.title || 'None'}</div>
          </div>
        );
      };

      render(
        <TutorialProvider initialTutorials={[tutorial]}>
          <TestComponent />
        </TutorialProvider>
      );

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('index')).toHaveTextContent('0');
        expect(screen.getByTestId('step-title')).toHaveTextContent('Step 1');
      });

      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByTestId('index')).toHaveTextContent('1');
        expect(screen.getByTestId('step-title')).toHaveTextContent('Step 2');
      });
    });

    it('should navigate to previous step', async () => {
      const user = userEvent.setup();
      const tutorial = createMockTutorial('tut-1', 'Test Tutorial');

      const TestComponent = () => {
        const { startTutorial, nextStep, previousStep, currentStepIndex } = useTutorial();

        return (
          <div>
            <button onClick={() => startTutorial('tut-1')}>Start</button>
            <button onClick={nextStep}>Next</button>
            <button onClick={previousStep}>Previous</button>
            <div data-testid="index">{currentStepIndex}</div>
          </div>
        );
      };

      render(
        <TutorialProvider initialTutorials={[tutorial]}>
          <TestComponent />
        </TutorialProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByTestId('index')).toHaveTextContent('2');
      });

      await user.click(screen.getByText('Previous'));

      await waitFor(() => {
        expect(screen.getByTestId('index')).toHaveTextContent('1');
      });
    });

    it('should go to specific step', async () => {
      const user = userEvent.setup();
      const tutorial = createMockTutorial('tut-1', 'Test Tutorial');

      const TestComponent = () => {
        const { startTutorial, goToStep, currentStepIndex } = useTutorial();

        return (
          <div>
            <button onClick={() => startTutorial('tut-1')}>Start</button>
            <button onClick={() => goToStep('tut-1-step-3')}>Go to Step 3</button>
            <div data-testid="index">{currentStepIndex}</div>
          </div>
        );
      };

      render(
        <TutorialProvider initialTutorials={[tutorial]}>
          <TestComponent />
        </TutorialProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Go to Step 3'));

      await waitFor(() => {
        expect(screen.getByTestId('index')).toHaveTextContent('2');
      });
    });

    it('should skip step if allowed', async () => {
      const user = userEvent.setup();
      const tutorial = createMockTutorial('tut-1', 'Test Tutorial');

      const TestComponent = () => {
        const { startTutorial, skipStep, currentStepIndex } = useTutorial();

        return (
          <div>
            <button onClick={() => startTutorial('tut-1')}>Start</button>
            <button onClick={skipStep}>Skip</button>
            <div data-testid="index">{currentStepIndex}</div>
          </div>
        );
      };

      render(
        <TutorialProvider initialTutorials={[tutorial]}>
          <TestComponent />
        </TutorialProvider>
      );

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('index')).toHaveTextContent('0');
      });

      await user.click(screen.getByText('Skip'));

      await waitFor(() => {
        expect(screen.getByTestId('index')).toHaveTextContent('1');
      });
    });
  });

  describe('Tutorial Completion', () => {
    it('should track completed steps', async () => {
      const user = userEvent.setup();
      const tutorial = createMockTutorial('tut-1', 'Test Tutorial');

      const TestComponent = () => {
        const { startTutorial, completeStep, progress } = useTutorial();

        return (
          <div>
            <button onClick={() => startTutorial('tut-1')}>Start</button>
            <button onClick={() => completeStep('tut-1-step-1')}>Complete Step 1</button>
            <div data-testid="completed">{progress?.completedSteps.length || 0}</div>
          </div>
        );
      };

      render(
        <TutorialProvider initialTutorials={[tutorial]}>
          <TestComponent />
        </TutorialProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Complete Step 1'));

      await waitFor(() => {
        expect(screen.getByTestId('completed')).toHaveTextContent('1');
      });
    });

    it('should mark tutorial as completed when all steps done', async () => {
      const user = userEvent.setup();
      const tutorial = createMockTutorial('tut-1', 'Test Tutorial');

      const TestComponent = () => {
        const { startTutorial, completeStep, progress } = useTutorial();

        return (
          <div>
            <button onClick={() => startTutorial('tut-1')}>Start</button>
            <button onClick={() => {
              completeStep('tut-1-step-1');
              completeStep('tut-1-step-2');
              completeStep('tut-1-step-3');
            }}>Complete All</button>
            <div data-testid="status">{progress?.status || 'none'}</div>
          </div>
        );
      };

      render(
        <TutorialProvider initialTutorials={[tutorial]}>
          <TestComponent />
        </TutorialProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Complete All'));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('completed');
      });
    });
  });

  describe('Tutorial State Management', () => {
    it('should pause and resume tutorial', async () => {
      const user = userEvent.setup();
      const tutorial = createMockTutorial('tut-1', 'Test Tutorial');

      const TestComponent = () => {
        const { startTutorial, pauseTutorial, resumeTutorial, isPaused, showOverlay } = useTutorial();

        return (
          <div>
            <button onClick={() => startTutorial('tut-1')}>Start</button>
            <button onClick={pauseTutorial}>Pause</button>
            <button onClick={resumeTutorial}>Resume</button>
            <div data-testid="paused">{isPaused ? 'Yes' : 'No'}</div>
            <div data-testid="overlay">{showOverlay ? 'Visible' : 'Hidden'}</div>
          </div>
        );
      };

      render(
        <TutorialProvider initialTutorials={[tutorial]}>
          <TestComponent />
        </TutorialProvider>
      );

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('paused')).toHaveTextContent('No');
        expect(screen.getByTestId('overlay')).toHaveTextContent('Visible');
      });

      await user.click(screen.getByText('Pause'));

      await waitFor(() => {
        expect(screen.getByTestId('paused')).toHaveTextContent('Yes');
        expect(screen.getByTestId('overlay')).toHaveTextContent('Hidden');
      });

      await user.click(screen.getByText('Resume'));

      await waitFor(() => {
        expect(screen.getByTestId('paused')).toHaveTextContent('No');
        expect(screen.getByTestId('overlay')).toHaveTextContent('Visible');
      });
    });

    it('should exit tutorial and reset state', async () => {
      const user = userEvent.setup();
      const tutorial = createMockTutorial('tut-1', 'Test Tutorial');

      const TestComponent = () => {
        const { startTutorial, exitTutorial, isActive, currentTutorial } = useTutorial();

        return (
          <div>
            <button onClick={() => startTutorial('tut-1')}>Start</button>
            <button onClick={exitTutorial}>Exit</button>
            <div data-testid="active">{isActive ? 'Yes' : 'No'}</div>
            <div data-testid="tutorial">{currentTutorial?.title || 'None'}</div>
          </div>
        );
      };

      render(
        <TutorialProvider initialTutorials={[tutorial]}>
          <TestComponent />
        </TutorialProvider>
      );

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('active')).toHaveTextContent('Yes');
        expect(screen.getByTestId('tutorial')).toHaveTextContent('Test Tutorial');
      });

      await user.click(screen.getByText('Exit'));

      await waitFor(() => {
        expect(screen.getByTestId('active')).toHaveTextContent('No');
        expect(screen.getByTestId('tutorial')).toHaveTextContent('None');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tutorial ID', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const { startTutorial } = useTutorial();
        const [error, setError] = React.useState<string>('');

        const handleStart = async () => {
          try {
            await startTutorial('invalid-id');
          } catch (err) {
            setError((err as Error).message);
          }
        };

        return (
          <div>
            <button onClick={handleStart}>Start Invalid</button>
            <div data-testid="error">{error}</div>
          </div>
        );
      };

      render(
        <TutorialProvider>
          <TestComponent />
        </TutorialProvider>
      );

      await user.click(screen.getByText('Start Invalid'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Tutorial invalid-id not found');
      });
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('tutorial-progress', 'invalid-json');

      const TestComponent = () => {
        const { getProgress } = useTutorial();
        const progress = getProgress('tut-1');

        return <div data-testid="progress">{progress ? 'Found' : 'Not Found'}</div>;
      };

      expect(() => {
        render(
          <TutorialProvider>
            <TestComponent />
          </TutorialProvider>
        );
      }).not.toThrow();

      expect(screen.getByTestId('progress')).toHaveTextContent('Not Found');
    });
  });

  describe('Multiple Components Integration', () => {
    it('should update all components when context changes', async () => {
      const user = userEvent.setup();
      const tutorial = createMockTutorial('tut-1', 'Test Tutorial');

      const StatusDisplay = ({ id }: { id: string }) => {
        const { isActive } = useTutorial();
        return <div data-testid={`status-${id}`}>{isActive ? 'Active' : 'Inactive'}</div>;
      };

      const TestComponent = () => {
        const { startTutorial } = useTutorial();

        return (
          <div>
            <button onClick={() => startTutorial('tut-1')}>Start</button>
            <StatusDisplay id="1" />
            <StatusDisplay id="2" />
            <StatusDisplay id="3" />
          </div>
        );
      };

      render(
        <TutorialProvider initialTutorials={[tutorial]}>
          <TestComponent />
        </TutorialProvider>
      );

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('status-1')).toHaveTextContent('Active');
        expect(screen.getByTestId('status-2')).toHaveTextContent('Active');
        expect(screen.getByTestId('status-3')).toHaveTextContent('Active');
      });
    });
  });
});

// Made with Bob
