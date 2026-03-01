import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QuizProvider, useQuiz } from '../QuizContext';
import type { Quiz, Question, MultipleChoiceQuestion } from '@/types/quiz';

// Mock quiz data
const createMockQuestion = (id: string, question: string): MultipleChoiceQuestion => ({
  id,
  type: 'multiple-choice',
  difficulty: 'easy',
  question,
  explanation: `Explanation for ${question}`,
  points: 10,
  options: [
    { id: 'opt-1', text: 'Option 1', isCorrect: true },
    { id: 'opt-2', text: 'Option 2', isCorrect: false },
    { id: 'opt-3', text: 'Option 3', isCorrect: false },
  ],
});

const createMockQuiz = (id: string, title: string): Quiz => ({
  id,
  title,
  description: `Description for ${title}`,
  category: 'test',
  difficulty: 'easy',
  estimatedTime: 10,
  passingScore: 70,
  questions: [
    createMockQuestion(`${id}-q1`, 'Question 1'),
    createMockQuestion(`${id}-q2`, 'Question 2'),
    createMockQuestion(`${id}-q3`, 'Question 3'),
  ],
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('QuizContext Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Context Provider with Components', () => {
    it('should provide quiz context to child components', () => {
      const TestComponent = () => {
        const { isActive } = useQuiz();
        return <div data-testid="active-status">{isActive ? 'Active' : 'Inactive'}</div>;
      };

      render(
        <QuizProvider>
          <TestComponent />
        </QuizProvider>
      );

      expect(screen.getByTestId('active-status')).toHaveTextContent('Inactive');
    });

    it('should start quiz and update context', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, currentQuiz, isActive } = useQuiz();

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <div data-testid="active">{isActive ? 'Yes' : 'No'}</div>
            <div data-testid="title">{currentQuiz?.title || 'None'}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      expect(screen.getByTestId('active')).toHaveTextContent('No');
      expect(screen.getByTestId('title')).toHaveTextContent('None');

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('active')).toHaveTextContent('Yes');
        expect(screen.getByTestId('title')).toHaveTextContent('Test Quiz');
      });
    });

    it('should persist attempts to localStorage', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, submitQuiz } = useQuiz();
        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <button onClick={() => submitQuiz()}>Submit</button>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        const stored = localStorage.getItem('quiz-attempts');
        expect(stored).toBeTruthy();
        const attempts = JSON.parse(stored!);
        expect(attempts['quiz-1']).toBeDefined();
        expect(attempts['quiz-1'].length).toBe(1);
      });
    });

    it('should load attempts from localStorage on mount', () => {
      const attempts = {
        'quiz-1': [{
          id: 'attempt-1',
          quizId: 'quiz-1',
          userId: 'user-1',
          startedAt: new Date().toISOString(),
          answers: [],
          status: 'in-progress',
        }],
      };

      localStorage.setItem('quiz-attempts', JSON.stringify(attempts));

      const TestComponent = () => {
        const { getAttempt } = useQuiz();
        const attempt = getAttempt('quiz-1');

        return (
          <div>
            <div data-testid="has-attempt">{attempt ? 'Yes' : 'No'}</div>
            <div data-testid="status">{attempt?.status || 'none'}</div>
          </div>
        );
      };

      render(
        <QuizProvider>
          <TestComponent />
        </QuizProvider>
      );

      expect(screen.getByTestId('has-attempt')).toHaveTextContent('Yes');
      expect(screen.getByTestId('status')).toHaveTextContent('in-progress');
    });
  });

  describe('Quiz Navigation', () => {
    it('should navigate to next question', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, nextQuestion, currentQuestionIndex, currentQuestion } = useQuiz();

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <button onClick={nextQuestion}>Next</button>
            <div data-testid="index">{currentQuestionIndex}</div>
            <div data-testid="question">{currentQuestion?.question || 'None'}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('index')).toHaveTextContent('0');
        expect(screen.getByTestId('question')).toHaveTextContent('Question 1');
      });

      await user.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByTestId('index')).toHaveTextContent('1');
        expect(screen.getByTestId('question')).toHaveTextContent('Question 2');
      });
    });

    it('should navigate to previous question', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, nextQuestion, previousQuestion, currentQuestionIndex } = useQuiz();

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <button onClick={nextQuestion}>Next</button>
            <button onClick={previousQuestion}>Previous</button>
            <div data-testid="index">{currentQuestionIndex}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
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

    it('should go to specific question', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, goToQuestion, currentQuestionIndex } = useQuiz();

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <button onClick={() => goToQuestion(2)}>Go to Question 3</button>
            <div data-testid="index">{currentQuestionIndex}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Go to Question 3'));

      await waitFor(() => {
        expect(screen.getByTestId('index')).toHaveTextContent('2');
      });
    });

    it('should not navigate beyond quiz bounds', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, nextQuestion, currentQuestionIndex } = useQuiz();

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <button onClick={nextQuestion}>Next</button>
            <div data-testid="index">{currentQuestionIndex}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start'));
      
      // Try to go beyond last question
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Next')); // Should not advance

      await waitFor(() => {
        expect(screen.getByTestId('index')).toHaveTextContent('2'); // Stays at last question
      });
    });
  });

  describe('Answer Management', () => {
    it('should submit and track answers', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, submitAnswer, currentAttempt, currentQuestion } = useQuiz();

        const handleSubmit = () => {
          if (currentQuestion) {
            submitAnswer({
              questionId: currentQuestion.id,
              answer: 'opt-1',
              timeSpent: 30,
              hintsUsed: 0,
              timestamp: new Date(),
            });
          }
        };

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <button onClick={handleSubmit}>Submit Answer</button>
            <div data-testid="answers">{currentAttempt?.answers.length || 0}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Submit Answer'));

      await waitFor(() => {
        expect(screen.getByTestId('answers')).toHaveTextContent('1');
      });
    });

    it('should update existing answers', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, submitAnswer, currentAttempt, currentQuestion } = useQuiz();

        const handleSubmit = (answer: string) => {
          if (currentQuestion) {
            submitAnswer({
              questionId: currentQuestion.id,
              answer,
              timeSpent: 30,
              hintsUsed: 0,
              timestamp: new Date(),
            });
          }
        };

        const firstAnswer = currentAttempt?.answers[0];

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <button onClick={() => handleSubmit('opt-1')}>Answer 1</button>
            <button onClick={() => handleSubmit('opt-2')}>Answer 2</button>
            <div data-testid="answers">{currentAttempt?.answers.length || 0}</div>
            <div data-testid="answer-value">{firstAnswer?.answer as string || 'none'}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Answer 1'));

      await waitFor(() => {
        expect(screen.getByTestId('answer-value')).toHaveTextContent('opt-1');
      });

      await user.click(screen.getByText('Answer 2'));

      await waitFor(() => {
        expect(screen.getByTestId('answers')).toHaveTextContent('1'); // Still 1 answer
        expect(screen.getByTestId('answer-value')).toHaveTextContent('opt-2'); // Updated
      });
    });
  });

  describe('Quiz Completion', () => {
    it('should submit quiz and calculate score', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, submitAnswer, submitQuiz, currentAttempt, currentQuestion } = useQuiz();

        const handleAnswer = () => {
          if (currentQuestion) {
            submitAnswer({
              questionId: currentQuestion.id,
              answer: 'opt-1', // Correct answer
              timeSpent: 30,
              hintsUsed: 0,
              timestamp: new Date(),
            });
          }
        };

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <button onClick={handleAnswer}>Answer</button>
            <button onClick={() => submitQuiz()}>Submit Quiz</button>
            <div data-testid="status">{currentAttempt?.status || 'none'}</div>
            <div data-testid="score">{currentAttempt?.results?.score || 0}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start'));
      await user.click(screen.getByText('Answer'));
      await user.click(screen.getByText('Submit Quiz'));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('completed');
        expect(screen.getByTestId('score')).not.toHaveTextContent('0');
      });
    });

    it('should mark quiz as completed and deactivate', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, submitQuiz, isActive, currentAttempt } = useQuiz();

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <button onClick={() => submitQuiz()}>Submit</button>
            <div data-testid="active">{isActive ? 'Yes' : 'No'}</div>
            <div data-testid="status">{currentAttempt?.status || 'none'}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('active')).toHaveTextContent('Yes');
      });

      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByTestId('active')).toHaveTextContent('No');
        expect(screen.getByTestId('status')).toHaveTextContent('completed');
      });
    });
  });

  describe('Quiz State Management', () => {
    it('should pause and resume quiz', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, pauseQuiz, resumeQuiz, isPaused } = useQuiz();

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <button onClick={pauseQuiz}>Pause</button>
            <button onClick={resumeQuiz}>Resume</button>
            <div data-testid="paused">{isPaused ? 'Yes' : 'No'}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('paused')).toHaveTextContent('No');
      });

      await user.click(screen.getByText('Pause'));

      await waitFor(() => {
        expect(screen.getByTestId('paused')).toHaveTextContent('Yes');
      });

      await user.click(screen.getByText('Resume'));

      await waitFor(() => {
        expect(screen.getByTestId('paused')).toHaveTextContent('No');
      });
    });

    it('should exit quiz and reset state', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, exitQuiz, isActive, currentQuiz } = useQuiz();

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <button onClick={exitQuiz}>Exit</button>
            <div data-testid="active">{isActive ? 'Yes' : 'No'}</div>
            <div data-testid="quiz">{currentQuiz?.title || 'None'}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('active')).toHaveTextContent('Yes');
        expect(screen.getByTestId('quiz')).toHaveTextContent('Test Quiz');
      });

      await user.click(screen.getByText('Exit'));

      await waitFor(() => {
        expect(screen.getByTestId('active')).toHaveTextContent('No');
        expect(screen.getByTestId('quiz')).toHaveTextContent('None');
      });
    });

    it('should track time remaining', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const TestComponent = () => {
        const { startQuiz, timeRemaining } = useQuiz();

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <div data-testid="time">{timeRemaining !== null ? timeRemaining : 'null'}</div>
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start'));

      await waitFor(() => {
        expect(screen.getByTestId('time')).not.toHaveTextContent('null');
      });

      const initialTime = parseInt(screen.getByTestId('time').textContent || '0');

      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        const currentTime = parseInt(screen.getByTestId('time').textContent || '0');
        expect(currentTime).toBeLessThan(initialTime);
      });

      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid quiz ID', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const { startQuiz } = useQuiz();
        const [error, setError] = React.useState<string>('');

        const handleStart = async () => {
          try {
            await startQuiz('invalid-id');
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
        <QuizProvider>
          <TestComponent />
        </QuizProvider>
      );

      await user.click(screen.getByText('Start Invalid'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Quiz invalid-id not found');
      });
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('quiz-attempts', 'invalid-json');

      const TestComponent = () => {
        const { getAttempt } = useQuiz();
        const attempt = getAttempt('quiz-1');

        return <div data-testid="attempt">{attempt ? 'Found' : 'Not Found'}</div>;
      };

      expect(() => {
        render(
          <QuizProvider>
            <TestComponent />
          </QuizProvider>
        );
      }).not.toThrow();

      expect(screen.getByTestId('attempt')).toHaveTextContent('Not Found');
    });
  });

  describe('Multiple Components Integration', () => {
    it('should update all components when context changes', async () => {
      const user = userEvent.setup();
      const quiz = createMockQuiz('quiz-1', 'Test Quiz');

      const StatusDisplay = ({ id }: { id: string }) => {
        const { isActive } = useQuiz();
        return <div data-testid={`status-${id}`}>{isActive ? 'Active' : 'Inactive'}</div>;
      };

      const TestComponent = () => {
        const { startQuiz } = useQuiz();

        return (
          <div>
            <button onClick={() => startQuiz('quiz-1')}>Start</button>
            <StatusDisplay id="1" />
            <StatusDisplay id="2" />
            <StatusDisplay id="3" />
          </div>
        );
      };

      render(
        <QuizProvider initialQuizzes={[quiz]}>
          <TestComponent />
        </QuizProvider>
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
