import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { 
  Tutorial, 
  TutorialProgress, 
  TutorialStep,
  TutorialStatus,
  TutorialContextValue as ITutorialContextValue 
} from '@/types/tutorial';

export const TutorialContext = createContext<ITutorialContextValue | undefined>(undefined);

export interface TutorialProviderProps {
  children: React.ReactNode;
  initialTutorials?: Tutorial[];
}

const STORAGE_KEY = 'tutorial-progress';

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ 
  children, 
  initialTutorials = [] 
}) => {
  const [tutorials] = useState<Tutorial[]>(initialTutorials);
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [progress, setProgress] = useState<TutorialProgress | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, TutorialProgress>>({});
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState<boolean>(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProgressMap(parsed);
      }
    } catch (error) {
      console.error('Failed to load tutorial progress:', error);
      setProgressMap({});
    }
  }, []);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressMap));
    } catch (error) {
      console.error('Failed to save tutorial progress:', error);
    }
  }, [progressMap]);

  const startTutorial = useCallback(async (tutorialId: string) => {
    const tutorial = tutorials.find(t => t.id === tutorialId);
    if (!tutorial) {
      throw new Error(`Tutorial ${tutorialId} not found`);
    }

    setCurrentTutorial(tutorial);
    setCurrentStepIndex(0);
    setCurrentStep(tutorial.steps[0] || null);
    setIsActive(true);
    setShowOverlay(true);

    const newProgress: TutorialProgress = {
      tutorialId,
      userId: 'current-user', // TODO: Get from auth context
      status: 'in_progress',
      currentStepId: tutorial.steps[0]?.id || '',
      completedSteps: [],
      startedAt: new Date(),
      timeSpent: 0,
    };

    setProgress(newProgress);
    setProgressMap(prev => ({
      ...prev,
      [tutorialId]: newProgress,
    }));
  }, [tutorials]);

  const exitTutorial = useCallback(() => {
    setCurrentTutorial(null);
    setCurrentStep(null);
    setCurrentStepIndex(0);
    setProgress(null);
    setIsActive(false);
    setShowOverlay(false);
    setHighlightedElement(null);
  }, []);

  const pauseTutorial = useCallback(() => {
    setIsPaused(true);
    setShowOverlay(false);
  }, []);

  const resumeTutorial = useCallback(() => {
    setIsPaused(false);
    setShowOverlay(true);
  }, []);

  const nextStep = useCallback(() => {
    if (!currentTutorial || currentStepIndex >= currentTutorial.steps.length - 1) {
      return;
    }

    const nextIndex = currentStepIndex + 1;
    const nextStep = currentTutorial.steps[nextIndex];

    setCurrentStepIndex(nextIndex);
    setCurrentStep(nextStep);

    if (progress) {
      const updatedProgress = {
        ...progress,
        currentStepId: nextStep.id,
      };
      setProgress(updatedProgress);
      setProgressMap(prev => ({
        ...prev,
        [currentTutorial.id]: updatedProgress,
      }));
    }

    if (nextStep.targetElement) {
      setHighlightedElement(nextStep.targetElement);
    }
  }, [currentTutorial, currentStepIndex, progress]);

  const previousStep = useCallback(() => {
    if (!currentTutorial || currentStepIndex <= 0) {
      return;
    }

    const prevIndex = currentStepIndex - 1;
    const prevStep = currentTutorial.steps[prevIndex];

    setCurrentStepIndex(prevIndex);
    setCurrentStep(prevStep);

    if (progress) {
      const updatedProgress = {
        ...progress,
        currentStepId: prevStep.id,
      };
      setProgress(updatedProgress);
      setProgressMap(prev => ({
        ...prev,
        [currentTutorial.id]: updatedProgress,
      }));
    }

    if (prevStep.targetElement) {
      setHighlightedElement(prevStep.targetElement);
    }
  }, [currentTutorial, currentStepIndex, progress]);

  const goToStep = useCallback((stepId: string) => {
    if (!currentTutorial) return;

    const stepIndex = currentTutorial.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;

    const step = currentTutorial.steps[stepIndex];
    setCurrentStepIndex(stepIndex);
    setCurrentStep(step);

    if (progress) {
      const updatedProgress = {
        ...progress,
        currentStepId: step.id,
      };
      setProgress(updatedProgress);
      setProgressMap(prev => ({
        ...prev,
        [currentTutorial.id]: updatedProgress,
      }));
    }

    if (step.targetElement) {
      setHighlightedElement(step.targetElement);
    }
  }, [currentTutorial, progress]);

  const skipStep = useCallback(() => {
    if (!currentTutorial || !currentStep || !progress) return;

    if (currentStep.canSkip !== false) {
      nextStep();
    }
  }, [currentTutorial, currentStep, progress, nextStep]);

  const completeStep = useCallback((stepId: string, data?: any) => {
    if (!currentTutorial || !progress) return;

    const updatedProgress = {
      ...progress,
      completedSteps: [...progress.completedSteps, stepId],
    };

    setProgress(updatedProgress);
    setProgressMap(prev => ({
      ...prev,
      [currentTutorial.id]: updatedProgress,
    }));

    // Check if tutorial is complete
    if (updatedProgress.completedSteps.length === currentTutorial.steps.length) {
      const completedProgress = {
        ...updatedProgress,
        status: 'completed' as TutorialStatus,
        completedAt: new Date(),
      };
      setProgress(completedProgress);
      setProgressMap(prev => ({
        ...prev,
        [currentTutorial.id]: completedProgress,
      }));
    } else {
      nextStep();
    }
  }, [currentTutorial, progress, nextStep]);

  const validateStepAction = useCallback((action: any): boolean => {
    if (!currentStep?.action?.validator) return true;
    return currentStep.action.validator(action);
  }, [currentStep]);

  const updateProgress = useCallback((progressUpdate: Partial<TutorialProgress>) => {
    if (!progress || !currentTutorial) return;

    const updatedProgress = {
      ...progress,
      ...progressUpdate,
    };

    setProgress(updatedProgress);
    setProgressMap(prev => ({
      ...prev,
      [currentTutorial.id]: updatedProgress,
    }));
  }, [progress, currentTutorial]);

  const getProgress = useCallback((tutorialId: string): TutorialProgress | null => {
    return progressMap[tutorialId] || null;
  }, [progressMap]);

  const value: ITutorialContextValue = {
    currentTutorial,
    currentStep,
    currentStepIndex,
    progress,
    startTutorial,
    exitTutorial,
    pauseTutorial,
    resumeTutorial,
    nextStep,
    previousStep,
    goToStep,
    skipStep,
    completeStep,
    validateStepAction,
    updateProgress,
    getProgress,
    isActive,
    isPaused,
    highlightedElement,
    showOverlay,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = (): ITutorialContextValue => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

// Made with Bob
