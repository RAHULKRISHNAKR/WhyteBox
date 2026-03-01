import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Quiz,
  QuizAttempt,
  Question,
  QuestionAnswer,
  QuestionResult,
  QuizResult
} from '@/types/quiz';

/** In-memory progress state for the active quiz session */
export interface QuizProgress {
  currentQuestionIndex: number;
  answeredQuestions: Set<string>;
  bookmarked: Set<string>;
  hintsUsed: Map<string, number>;
  startedAt: Date;
}

export interface QuizContextValue {
  // Current quiz state
  currentQuiz: Quiz | null;
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  currentAttempt: QuizAttempt | null;
  
  // Live progress (replaces raw state access)
  progress: QuizProgress | null;

  // Quiz management
  startQuiz: (quizId: string) => Promise<void>;
  exitQuiz: () => void;
  pauseQuiz: () => void;
  resumeQuiz: () => void;
  retakeQuiz: () => void;
  
  // Navigation
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (questionIndex: number) => void;
  
  // Answer management
  submitAnswer: (answer: QuestionAnswer) => void;
  updateAnswer: (questionId: string, answer: QuestionAnswer) => void;
  /** Convenience wrapper: answer a question by id + raw value */
  answerQuestion: (questionId: string, answer: QuestionAnswer['answer']) => void;
  /** Record a hint usage for a question */
  useHint: (questionId: string) => void;
  /** Toggle bookmark for a question */
  bookmarkQuestion: (questionId: string) => void;
  /** Get the evaluated result for a question (only available after submitQuiz) */
  getQuestionResult: (questionId: string) => QuestionResult | null;
  
  // Quiz completion
  submitQuiz: () => Promise<void>;
  
  // Progress helpers
  getAttempt: (quizId: string) => QuizAttempt | null;
  getAllAttempts: () => QuizAttempt[];
  /** Returns { current: 1-based index, total } */
  getQuestionProgress: () => { current: number; total: number };
  /** Returns elapsed seconds since quiz started */
  getTimeElapsed: () => number;
  
  // UI state
  isActive: boolean;
  isPaused: boolean;
  timeRemaining: number | null;
}

export const QuizContext = createContext<QuizContextValue | undefined>(undefined);

export interface QuizProviderProps {
  children: React.ReactNode;
  initialQuizzes?: Quiz[];
}

const STORAGE_KEY = 'quiz-attempts';

export const QuizProvider: React.FC<QuizProviderProps> = ({
  children,
  initialQuizzes = []
}) => {
  const [quizzes] = useState<Quiz[]>(initialQuizzes);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null);
  const [attempts, setAttempts] = useState<Record<string, QuizAttempt[]>>({});
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  // In-session progress tracking
  const [progress, setProgress] = useState<QuizProgress | null>(null);
  // Evaluated results after submitQuiz
  const [questionResults, setQuestionResults] = useState<Record<string, QuestionResult>>({});

  // Load attempts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAttempts(parsed);
      }
    } catch (error) {
      console.error('Failed to load quiz attempts:', error);
      setAttempts({});
    }
  }, []);

  // Save attempts to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
    } catch (error) {
      console.error('Failed to save quiz attempts:', error);
    }
  }, [attempts]);

  // Timer effect
  useEffect(() => {
    if (!isActive || isPaused || timeRemaining === null || timeRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, isPaused, timeRemaining]);

  const startQuiz = useCallback(async (quizId: string) => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) {
      throw new Error(`Quiz ${quizId} not found`);
    }

    setCurrentQuiz(quiz);
    setCurrentQuestionIndex(0);
    setCurrentQuestion(quiz.questions[0] || null);
    setIsActive(true);
    setQuestionResults({});

    const now = new Date();
    const newAttempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      quizId,
      userId: 'current-user', // TODO: Get from auth context
      startedAt: now,
      answers: [],
      status: 'in-progress',
    };

    setCurrentAttempt(newAttempt);
    setProgress({
      currentQuestionIndex: 0,
      answeredQuestions: new Set(),
      bookmarked: new Set(),
      hintsUsed: new Map(),
      startedAt: now,
    });

    // Set timer if quiz has time limit (using estimatedTime as proxy)
    if (quiz.estimatedTime) {
      setTimeRemaining(quiz.estimatedTime * 60); // Convert minutes to seconds
    }
  }, [quizzes]);

  const exitQuiz = useCallback(() => {
    setCurrentQuiz(null);
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setCurrentAttempt(null);
    setIsActive(false);
    setTimeRemaining(null);
    setProgress(null);
    setQuestionResults({});
  }, []);

  const retakeQuiz = useCallback(() => {
    if (!currentQuiz) return;
    // Re-start the same quiz
    startQuiz(currentQuiz.id).catch(console.error);
  }, [currentQuiz, startQuiz]);

  const pauseQuiz = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeQuiz = useCallback(() => {
    setIsPaused(false);
  }, []);

  const nextQuestion = useCallback(() => {
    if (!currentQuiz || currentQuestionIndex >= currentQuiz.questions.length - 1) {
      return;
    }

    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setCurrentQuestion(currentQuiz.questions[nextIndex]);
    setProgress(prev => prev ? { ...prev, currentQuestionIndex: nextIndex } : prev);
  }, [currentQuiz, currentQuestionIndex]);

  const previousQuestion = useCallback(() => {
    if (!currentQuiz || currentQuestionIndex <= 0) {
      return;
    }

    const prevIndex = currentQuestionIndex - 1;
    setCurrentQuestionIndex(prevIndex);
    setCurrentQuestion(currentQuiz.questions[prevIndex]);
    setProgress(prev => prev ? { ...prev, currentQuestionIndex: prevIndex } : prev);
  }, [currentQuiz, currentQuestionIndex]);

  const goToQuestion = useCallback((questionIndex: number) => {
    if (!currentQuiz || questionIndex < 0 || questionIndex >= currentQuiz.questions.length) {
      return;
    }

    setCurrentQuestionIndex(questionIndex);
    setCurrentQuestion(currentQuiz.questions[questionIndex]);
    setProgress(prev => prev ? { ...prev, currentQuestionIndex: questionIndex } : prev);
  }, [currentQuiz]);

  const submitAnswer = useCallback((answer: QuestionAnswer) => {
    if (!currentAttempt || !currentQuestion) return;

    const updatedAnswers = [...currentAttempt.answers];
    const existingIndex = updatedAnswers.findIndex(a => a.questionId === answer.questionId);

    if (existingIndex >= 0) {
      updatedAnswers[existingIndex] = answer;
    } else {
      updatedAnswers.push(answer);
    }

    setCurrentAttempt({ ...currentAttempt, answers: updatedAnswers });
    setProgress(prev => {
      if (!prev) return prev;
      const answered = new Set(prev.answeredQuestions);
      answered.add(answer.questionId);
      return { ...prev, answeredQuestions: answered };
    });
  }, [currentAttempt, currentQuestion]);

  const updateAnswer = useCallback((questionId: string, answer: QuestionAnswer) => {
    if (!currentAttempt) return;

    const updatedAnswers = [...currentAttempt.answers];
    const existingIndex = updatedAnswers.findIndex(a => a.questionId === questionId);

    if (existingIndex >= 0) {
      updatedAnswers[existingIndex] = answer;
    } else {
      updatedAnswers.push(answer);
    }

    setCurrentAttempt({ ...currentAttempt, answers: updatedAnswers });
    setProgress(prev => {
      if (!prev) return prev;
      const answered = new Set(prev.answeredQuestions);
      answered.add(questionId);
      return { ...prev, answeredQuestions: answered };
    });
  }, [currentAttempt]);

  /** Convenience: answer by questionId + raw value */
  const answerQuestion = useCallback((questionId: string, answer: QuestionAnswer['answer']) => {
    const qa: QuestionAnswer = {
      questionId,
      answer,
      timeSpent: 0,
      hintsUsed: 0,
      timestamp: new Date(),
    };
    submitAnswer(qa);
  }, [submitAnswer]);

  const useHint = useCallback((questionId: string) => {
    setProgress(prev => {
      if (!prev) return prev;
      const hintsUsed = new Map(prev.hintsUsed);
      hintsUsed.set(questionId, (hintsUsed.get(questionId) || 0) + 1);
      return { ...prev, hintsUsed };
    });
  }, []);

  const bookmarkQuestion = useCallback((questionId: string) => {
    setProgress(prev => {
      if (!prev) return prev;
      const bookmarked = new Set(prev.bookmarked);
      if (bookmarked.has(questionId)) {
        bookmarked.delete(questionId);
      } else {
        bookmarked.add(questionId);
      }
      return { ...prev, bookmarked };
    });
  }, []);

  const getQuestionResult = useCallback((questionId: string): QuestionResult | null => {
    return questionResults[questionId] ?? null;
  }, [questionResults]);

  const getQuestionProgress = useCallback((): { current: number; total: number } => {
    const total = currentQuiz?.questions.length ?? 0;
    return { current: currentQuestionIndex + 1, total };
  }, [currentQuiz, currentQuestionIndex]);

  const getTimeElapsed = useCallback((): number => {
    if (!progress) return 0;
    return Math.floor((Date.now() - progress.startedAt.getTime()) / 1000);
  }, [progress]);

  const submitQuiz = useCallback(async () => {
    if (!currentAttempt || !currentQuiz) return;

    // Calculate score and build per-question results
    let correctCount = 0;
    let pointsEarned = 0;
    let pointsPossible = 0;
    const qResults: Record<string, QuestionResult> = {};

    currentAttempt.answers.forEach(answer => {
      const question = currentQuiz.questions.find(q => q.id === answer.questionId);
      if (!question) return;

      pointsPossible += question.points;
      let isCorrect = false;

      if (question.type === 'multiple-choice') {
        const mcQuestion = question as any;
        const correctOptions = mcQuestion.options.filter((opt: any) => opt.isCorrect);
        const userAnswers = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
        isCorrect = correctOptions.every((opt: any) =>
          userAnswers.includes(opt.id)
        ) && userAnswers.length === correctOptions.length;
      } else if (question.type === 'true-false') {
        const tfQuestion = question as any;
        isCorrect = answer.answer === tfQuestion.correctAnswer;
      } else if (question.type === 'fill-in-blank') {
        const fibQuestion = question as any;
        const userAns = String(answer.answer).trim();
        isCorrect = fibQuestion.correctAnswers.some((ca: string) =>
          fibQuestion.caseSensitive ? ca === userAns : ca.toLowerCase() === userAns.toLowerCase()
        );
      }

      if (isCorrect) {
        correctCount++;
        pointsEarned += question.points;
      }

      qResults[question.id] = {
        questionId: question.id,
        isCorrect,
        pointsEarned: isCorrect ? question.points : 0,
        pointsPossible: question.points,
        feedback: isCorrect ? 'Correct!' : question.explanation,
        userAnswer: answer.answer,
        timeSpent: answer.timeSpent,
      };
    });

    setQuestionResults(qResults);

    const score = pointsPossible > 0 ? (pointsEarned / pointsPossible) * 100 : 0;
    const passed = score >= currentQuiz.passingScore;
    const timeSpent = progress
      ? Math.floor((Date.now() - progress.startedAt.getTime()) / 1000)
      : currentQuiz.estimatedTime * 60 - (timeRemaining || 0);

    const result: QuizResult = {
      attemptId: currentAttempt.id,
      quizId: currentQuiz.id,
      userId: currentAttempt.userId,
      score,
      pointsEarned,
      pointsPossible,
      correctAnswers: correctCount,
      totalQuestions: currentQuiz.questions.length,
      timeSpent,
      passed,
      questionResults: Object.values(qResults),
      completedAt: new Date(),
    };

    const completedAttempt: QuizAttempt = {
      ...currentAttempt,
      completedAt: new Date(),
      status: 'completed',
      results: result,
    };

    setCurrentAttempt(completedAttempt);

    // Save to attempts history
    setAttempts(prev => ({
      ...prev,
      [currentQuiz.id]: [...(prev[currentQuiz.id] || []), completedAttempt],
    }));

    setIsActive(false);
  }, [currentAttempt, currentQuiz, timeRemaining, progress]);

  const getAttempt = useCallback((quizId: string): QuizAttempt | null => {
    const quizAttempts = attempts[quizId];
    if (!quizAttempts || quizAttempts.length === 0) return null;
    return quizAttempts[quizAttempts.length - 1]; // Return most recent attempt
  }, [attempts]);

  const getAllAttempts = useCallback((): QuizAttempt[] => {
    return Object.values(attempts).flat();
  }, [attempts]);

  const value: QuizContextValue = {
    currentQuiz,
    currentQuestion,
    currentQuestionIndex,
    currentAttempt,
    progress,
    startQuiz,
    exitQuiz,
    pauseQuiz,
    resumeQuiz,
    retakeQuiz,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    submitAnswer,
    updateAnswer,
    answerQuestion,
    useHint,
    bookmarkQuestion,
    getQuestionResult,
    submitQuiz,
    getAttempt,
    getAllAttempts,
    getQuestionProgress,
    getTimeElapsed,
    isActive,
    isPaused,
    timeRemaining,
  };

  return (
    <QuizContext.Provider value={value}>
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = (): QuizContextValue => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};

// Made with Bob
