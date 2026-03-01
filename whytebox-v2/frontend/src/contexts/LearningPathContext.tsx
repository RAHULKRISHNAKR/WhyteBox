/**
 * Learning Path Context
 * Manages learning path enrollment, progress tracking, and completion
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  LearningPath,
  PathProgress,
  ContentItemProgress,
  MilestoneProgress,
  PathStatus,
  Certificate,
  LearningPathContextState,
} from '../types/learningPath';

interface LearningPathContextValue extends LearningPathContextState {
  // Path management
  enrollInPath: (path: LearningPath) => void;
  unenrollFromPath: (pathId: string) => void;
  
  // Progress tracking
  markItemComplete: (pathId: string, itemId: string, score?: number) => void;
  updateItemProgress: (pathId: string, itemId: string, timeSpent: number) => void;
  
  // Navigation
  goToNextItem: () => void;
  goToPreviousItem: () => void;
  goToMilestone: (milestoneIndex: number) => void;
  
  // Progress queries
  getPathProgress: (pathId: string) => PathProgress | null;
  getMilestoneProgress: (pathId: string, milestoneId: string) => MilestoneProgress | null;
  getItemProgress: (pathId: string, itemId: string) => ContentItemProgress | null;
  isItemCompleted: (pathId: string, itemId: string) => boolean;
  isMilestoneCompleted: (pathId: string, milestoneId: string) => boolean;
  
  // Certificate
  generateCertificate: (pathId: string) => Certificate | null;
  getCertificate: (pathId: string) => Certificate | null;
}

const LearningPathContext = createContext<LearningPathContextValue | undefined>(undefined);

export const useLearningPath = () => {
  const context = useContext(LearningPathContext);
  if (!context) {
    throw new Error('useLearningPath must be used within LearningPathProvider');
  }
  return context;
};

interface LearningPathProviderProps {
  children: React.ReactNode;
}

export const LearningPathProvider: React.FC<LearningPathProviderProps> = ({ children }) => {
  const [state, setState] = useState<LearningPathContextState>({
    enrolledPaths: new Map(),
    currentPath: null,
    currentProgress: null,
    isLoading: false,
    error: null,
  });

  // Load enrolled paths from localStorage
  useEffect(() => {
    const savedPaths = localStorage.getItem('enrolledPaths');
    if (savedPaths) {
      try {
        const parsed = JSON.parse(savedPaths);
        const enrolledPaths = new Map(Object.entries(parsed).map(([key, value]: [string, any]) => {
          const progress: PathProgress = {
            ...value,
            startedAt: new Date(value.startedAt),
            completedAt: value.completedAt ? new Date(value.completedAt) : undefined,
            milestoneProgress: new Map(Object.entries(value.milestoneProgress || {}).map(([k, v]: [string, any]) => [
              k,
              {
                ...v,
                completedItems: new Set(v.completedItems),
                completedAt: v.completedAt ? new Date(v.completedAt) : undefined,
              },
            ])),
            itemProgress: new Map(Object.entries(value.itemProgress || {}).map(([k, v]: [string, any]) => [
              k,
              {
                ...v,
                completedAt: v.completedAt ? new Date(v.completedAt) : undefined,
              },
            ])),
          };
          return [key, progress];
        }));
        
        setState(prev => ({ ...prev, enrolledPaths }));
      } catch (error) {
        console.error('Failed to load enrolled paths:', error);
      }
    }
  }, []);

  // Save enrolled paths to localStorage
  useEffect(() => {
    const pathsToSave: Record<string, any> = {};
    state.enrolledPaths.forEach((progress, pathId) => {
      pathsToSave[pathId] = {
        ...progress,
        milestoneProgress: Object.fromEntries(
          Array.from(progress.milestoneProgress.entries()).map(([k, v]) => [
            k,
            {
              ...v,
              completedItems: Array.from(v.completedItems),
            },
          ])
        ),
        itemProgress: Object.fromEntries(progress.itemProgress),
      };
    });
    
    localStorage.setItem('enrolledPaths', JSON.stringify(pathsToSave));
  }, [state.enrolledPaths]);

  /**
   * Enroll in a learning path
   */
  const enrollInPath = useCallback((path: LearningPath) => {
    setState(prev => {
      const enrolledPaths = new Map(prev.enrolledPaths);
      
      if (!enrolledPaths.has(path.id)) {
        const progress: PathProgress = {
          pathId: path.id,
          userId: 'current-user', // TODO: Get from auth context
          status: 'in-progress',
          startedAt: new Date(),
          currentMilestoneIndex: 0,
          milestoneProgress: new Map(),
          itemProgress: new Map(),
          totalTimeSpent: 0,
          certificateEarned: false,
        };
        
        // Initialize milestone progress
        path.milestones.forEach(milestone => {
          progress.milestoneProgress.set(milestone.id, {
            milestoneId: milestone.id,
            completedItems: new Set(),
            totalItems: milestone.items.length,
            requiredItems: milestone.requiredCompletions,
            completed: false,
          });
        });
        
        enrolledPaths.set(path.id, progress);
      }
      
      return {
        ...prev,
        enrolledPaths,
        currentPath: path,
        currentProgress: enrolledPaths.get(path.id) || null,
      };
    });
  }, []);

  /**
   * Unenroll from a learning path
   */
  const unenrollFromPath = useCallback((pathId: string) => {
    setState(prev => {
      const enrolledPaths = new Map(prev.enrolledPaths);
      enrolledPaths.delete(pathId);
      
      return {
        ...prev,
        enrolledPaths,
        currentPath: prev.currentPath?.id === pathId ? null : prev.currentPath,
        currentProgress: prev.currentProgress?.pathId === pathId ? null : prev.currentProgress,
      };
    });
  }, []);

  /**
   * Mark a content item as complete
   */
  const markItemComplete = useCallback((pathId: string, itemId: string, score?: number) => {
    setState(prev => {
      const enrolledPaths = new Map(prev.enrolledPaths);
      const progress = enrolledPaths.get(pathId);
      
      if (!progress) return prev;
      
      // Update item progress
      const itemProgress = new Map(progress.itemProgress);
      const existingProgress = itemProgress.get(itemId);
      
      itemProgress.set(itemId, {
        itemId,
        completed: true,
        completedAt: new Date(),
        score,
        timeSpent: existingProgress?.timeSpent || 0,
        attempts: (existingProgress?.attempts || 0) + 1,
      });
      
      // Update milestone progress
      const milestoneProgress = new Map(progress.milestoneProgress);
      const currentPath = prev.currentPath;
      
      if (currentPath) {
        const milestone = currentPath.milestones.find(m =>
          m.items.some(item => item.id === itemId)
        );
        
        if (milestone) {
          const mProgress = milestoneProgress.get(milestone.id);
          if (mProgress) {
            const completedItems = new Set(mProgress.completedItems);
            completedItems.add(itemId);
            
            const completed = completedItems.size >= mProgress.requiredItems;
            
            milestoneProgress.set(milestone.id, {
              ...mProgress,
              completedItems,
              completed,
              completedAt: completed && !mProgress.completed ? new Date() : mProgress.completedAt,
            });
          }
        }
      }
      
      // Check if path is completed
      const allMilestonesCompleted = Array.from(milestoneProgress.values()).every(m => m.completed);
      const status: PathStatus = allMilestonesCompleted ? 'completed' : 'in-progress';
      
      const updatedProgress: PathProgress = {
        ...progress,
        status,
        completedAt: allMilestonesCompleted && !progress.completedAt ? new Date() : progress.completedAt,
        itemProgress,
        milestoneProgress,
        certificateEarned: allMilestonesCompleted && currentPath?.certificateAvailable || false,
      };
      
      enrolledPaths.set(pathId, updatedProgress);
      
      return {
        ...prev,
        enrolledPaths,
        currentProgress: prev.currentProgress?.pathId === pathId ? updatedProgress : prev.currentProgress,
      };
    });
  }, []);

  /**
   * Update item progress (time spent)
   */
  const updateItemProgress = useCallback((pathId: string, itemId: string, timeSpent: number) => {
    setState(prev => {
      const enrolledPaths = new Map(prev.enrolledPaths);
      const progress = enrolledPaths.get(pathId);
      
      if (!progress) return prev;
      
      const itemProgress = new Map(progress.itemProgress);
      const existingProgress = itemProgress.get(itemId);
      
      itemProgress.set(itemId, {
        itemId,
        completed: existingProgress?.completed || false,
        completedAt: existingProgress?.completedAt,
        score: existingProgress?.score,
        timeSpent: (existingProgress?.timeSpent || 0) + timeSpent,
        attempts: existingProgress?.attempts || 0,
      });
      
      const updatedProgress: PathProgress = {
        ...progress,
        itemProgress,
        totalTimeSpent: progress.totalTimeSpent + timeSpent,
      };
      
      enrolledPaths.set(pathId, updatedProgress);
      
      return {
        ...prev,
        enrolledPaths,
        currentProgress: prev.currentProgress?.pathId === pathId ? updatedProgress : prev.currentProgress,
      };
    });
  }, []);

  /**
   * Navigate to next item
   */
  const goToNextItem = useCallback(() => {
    // TODO: Implement navigation logic
    console.log('Go to next item');
  }, []);

  /**
   * Navigate to previous item
   */
  const goToPreviousItem = useCallback(() => {
    // TODO: Implement navigation logic
    console.log('Go to previous item');
  }, []);

  /**
   * Navigate to specific milestone
   */
  const goToMilestone = useCallback((milestoneIndex: number) => {
    setState(prev => {
      if (!prev.currentProgress) return prev;
      
      return {
        ...prev,
        currentProgress: {
          ...prev.currentProgress,
          currentMilestoneIndex: milestoneIndex,
        },
      };
    });
  }, []);

  /**
   * Get path progress
   */
  const getPathProgress = useCallback((pathId: string): PathProgress | null => {
    return state.enrolledPaths.get(pathId) || null;
  }, [state.enrolledPaths]);

  /**
   * Get milestone progress
   */
  const getMilestoneProgress = useCallback((pathId: string, milestoneId: string): MilestoneProgress | null => {
    const progress = state.enrolledPaths.get(pathId);
    return progress?.milestoneProgress.get(milestoneId) || null;
  }, [state.enrolledPaths]);

  /**
   * Get item progress
   */
  const getItemProgress = useCallback((pathId: string, itemId: string): ContentItemProgress | null => {
    const progress = state.enrolledPaths.get(pathId);
    return progress?.itemProgress.get(itemId) || null;
  }, [state.enrolledPaths]);

  /**
   * Check if item is completed
   */
  const isItemCompleted = useCallback((pathId: string, itemId: string): boolean => {
    const itemProgress = getItemProgress(pathId, itemId);
    return itemProgress?.completed || false;
  }, [getItemProgress]);

  /**
   * Check if milestone is completed
   */
  const isMilestoneCompleted = useCallback((pathId: string, milestoneId: string): boolean => {
    const milestoneProgress = getMilestoneProgress(pathId, milestoneId);
    return milestoneProgress?.completed || false;
  }, [getMilestoneProgress]);

  /**
   * Generate certificate
   */
  const generateCertificate = useCallback((pathId: string): Certificate | null => {
    const progress = state.enrolledPaths.get(pathId);
    const path = state.currentPath;
    
    if (!progress || !path || !progress.certificateEarned || !progress.completedAt) {
      return null;
    }
    
    const certificate: Certificate = {
      id: `cert-${pathId}-${Date.now()}`,
      pathId,
      userId: progress.userId,
      userName: 'User Name', // TODO: Get from auth context
      pathTitle: path.title,
      completedAt: progress.completedAt,
      skills: path.skills,
      verificationCode: generateVerificationCode(),
    };
    
    // Save certificate
    const certificates = JSON.parse(localStorage.getItem('certificates') || '[]');
    certificates.push(certificate);
    localStorage.setItem('certificates', JSON.stringify(certificates));
    
    return certificate;
  }, [state.enrolledPaths, state.currentPath]);

  /**
   * Get certificate
   */
  const getCertificate = useCallback((pathId: string): Certificate | null => {
    const certificates = JSON.parse(localStorage.getItem('certificates') || '[]');
    return certificates.find((cert: Certificate) => cert.pathId === pathId) || null;
  }, []);

  /**
   * Generate verification code
   */
  const generateVerificationCode = (): string => {
    return `WB-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  };

  const value: LearningPathContextValue = {
    ...state,
    enrollInPath,
    unenrollFromPath,
    markItemComplete,
    updateItemProgress,
    goToNextItem,
    goToPreviousItem,
    goToMilestone,
    getPathProgress,
    getMilestoneProgress,
    getItemProgress,
    isItemCompleted,
    isMilestoneCompleted,
    generateCertificate,
    getCertificate,
  };

  return <LearningPathContext.Provider value={value}>{children}</LearningPathContext.Provider>;
};

// Made with Bob
