/**
 * Example Project Context
 * 
 * Manages example project state including:
 * - Project browsing and filtering
 * - Progress tracking
 * - Code editing and saving
 * - Step completion
 * - Resource downloads
 * - Submission handling
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  ExampleProject,
  ProjectProgress,
  ProjectFilters,
  ProjectSearchResult,
  ProjectStats,
  ProjectCategory,
  ProjectDifficulty,
  ProjectStatus,
  ProjectNote,
  ProjectSubmission,
} from '../types/exampleProject';

interface ExampleProjectContextType {
  // Projects
  projects: ExampleProject[];
  currentProject: ExampleProject | null;
  popularProjects: ExampleProject[];
  recentProjects: ExampleProject[];
  loadProject: (id: string) => Promise<void>;
  getProjectsByCategory: (category: ProjectCategory) => ExampleProject[];

  // Search & Filter
  searchQuery: string;
  searchResults: ProjectSearchResult[];
  filters: ProjectFilters;
  isSearching: boolean;
  setSearchQuery: (query: string) => void;
  updateFilters: (filters: Partial<ProjectFilters>) => void;
  performSearch: () => Promise<void>;
  clearSearch: () => void;

  // Progress
  userProgress: Map<string, ProjectProgress>; // projectId -> progress
  getCurrentProgress: (projectId: string) => ProjectProgress | null;
  startProject: (projectId: string) => void;
  completeStep: (projectId: string, stepId: string) => void;
  completeCheckpoint: (projectId: string, checkpointId: string) => void;
  updateProjectCode: (projectId: string, filename: string, content: string) => void;
  addNote: (projectId: string, stepId: string, content: string) => void;
  updateNote: (projectId: string, noteId: string, content: string) => void;
  deleteNote: (projectId: string, noteId: string) => void;

  // Submissions
  submissions: Map<string, ProjectSubmission>; // projectId -> submission
  submitProject: (projectId: string, submission: Omit<ProjectSubmission, 'id' | 'submittedAt'>) => Promise<void>;
  getSubmission: (projectId: string) => ProjectSubmission | null;

  // Downloads
  downloadStarterCode: (projectId: string) => Promise<void>;
  downloadSolutionCode: (projectId: string) => Promise<void>;
  downloadDataset: (projectId: string, datasetId: string) => Promise<void>;

  // Statistics
  stats: ProjectStats | null;
  loadStats: () => Promise<void>;

  // Utility
  loading: boolean;
  error: string | null;
}

const ExampleProjectContext = createContext<ExampleProjectContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROGRESS: 'whytebox_project_progress',
  SUBMISSIONS: 'whytebox_project_submissions',
  CODE: 'whytebox_project_code',
};

const DEFAULT_FILTERS: ProjectFilters = {
  categories: [],
  difficulty: [],
  frameworks: [],
  languages: [],
  tags: [],
  minRating: 0,
  maxTime: 0,
  hasDataset: false,
  hasSolution: false,
};

export const ExampleProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Project state
  const [projects, setProjects] = useState<ExampleProject[]>([]);
  const [currentProject, setCurrentProject] = useState<ExampleProject | null>(null);
  const [popularProjects, setPopularProjects] = useState<ExampleProject[]>([]);
  const [recentProjects, setRecentProjects] = useState<ExampleProject[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProjectSearchResult[]>([]);
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS);
  const [isSearching, setIsSearching] = useState(false);

  // Progress state
  const [userProgress, setUserProgress] = useState<Map<string, ProjectProgress>>(new Map());
  const [submissions, setSubmissions] = useState<Map<string, ProjectSubmission>>(new Map());

  // Statistics
  const [stats, setStats] = useState<ProjectStats | null>(null);

  // Utility state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    loadPersistedData();
    loadInitialProjects();
  }, []);

  // Persist data when it changes
  useEffect(() => {
    persistData();
  }, [userProgress, submissions]);

  const loadPersistedData = () => {
    try {
      // Load progress
      const progressData = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (progressData) {
        const parsed = JSON.parse(progressData);
        const progressMap = new Map<string, ProjectProgress>(
          parsed.map(([key, value]: [string, any]) => [
            key,
            {
              ...value,
              completedSteps: new Set<string>(value.completedSteps),
              completedCheckpoints: new Set<string>(value.completedCheckpoints),
              startedAt: new Date(value.startedAt),
              lastAccessedAt: new Date(value.lastAccessedAt),
              completedAt: value.completedAt ? new Date(value.completedAt) : undefined,
              code: new Map<string, string>(value.code),
            },
          ])
        );
        setUserProgress(progressMap);
      }

      // Load submissions
      const submissionsData = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      if (submissionsData) {
        const parsed = JSON.parse(submissionsData);
        const submissionsMap = new Map<string, ProjectSubmission>(
          parsed.map(([key, value]: [string, any]) => [
            key,
            {
              ...value,
              submittedAt: new Date(value.submittedAt),
              feedback: value.feedback ? {
                ...value.feedback,
                createdAt: new Date(value.feedback.createdAt),
              } : undefined,
            },
          ])
        );
        setSubmissions(submissionsMap);
      }
    } catch (err) {
      console.error('Failed to load persisted project data:', err);
    }
  };

  const persistData = () => {
    try {
      // Persist progress
      const progressArray = Array.from(userProgress.entries()).map(([key, value]) => [
        key,
        {
          ...value,
          completedSteps: Array.from(value.completedSteps),
          completedCheckpoints: Array.from(value.completedCheckpoints),
          code: Array.from(value.code.entries()),
        },
      ]);
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressArray));

      // Persist submissions
      const submissionsArray = Array.from(submissions.entries());
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissionsArray));
    } catch (err) {
      console.error('Failed to persist project data:', err);
    }
  };

  const loadInitialProjects = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/v1/projects');
      // const projectsData = await response.json();
      
      const mockProjects: ExampleProject[] = [];
      setProjects(mockProjects);
      setPopularProjects(mockProjects.slice(0, 6));
      setRecentProjects(mockProjects.slice(0, 6));
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProject = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/v1/projects/${id}`);
      // const project = await response.json();

      const project = projects.find(p => p.id === id) || null;
      setCurrentProject(project);

      // Update last accessed time
      if (project) {
        const progress = userProgress.get(id);
        if (progress) {
          setUserProgress(prev => {
            const updated = new Map(prev);
            updated.set(id, {
              ...progress,
              lastAccessedAt: new Date(),
            });
            return updated;
          });
        }
      }
    } catch (err) {
      setError('Failed to load project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projects, userProgress]);

  const getProjectsByCategory = useCallback((category: ProjectCategory) => {
    return projects.filter(project => project.category === category);
  }, [projects]);

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      const results: ProjectSearchResult[] = projects
        .filter(project => {
          const matchesQuery = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             project.description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesCategory = filters.categories.length === 0 || 
                                filters.categories.includes(project.category);
          const matchesDifficulty = filters.difficulty.length === 0 ||
                                  filters.difficulty.includes(project.difficulty);
          const matchesFramework = filters.frameworks.length === 0 ||
                                 filters.frameworks.includes(project.framework);
          const matchesLanguage = filters.languages.length === 0 ||
                                filters.languages.includes(project.language);
          const matchesRating = project.stats.rating.average >= filters.minRating;
          const matchesTime = filters.maxTime === 0 || project.estimatedTime <= filters.maxTime;
          const matchesDataset = !filters.hasDataset || project.datasets.length > 0;
          const matchesSolution = !filters.hasSolution || project.solutionCode !== undefined;

          return matchesQuery && matchesCategory && matchesDifficulty && 
                 matchesFramework && matchesLanguage && matchesRating &&
                 matchesTime && matchesDataset && matchesSolution;
        })
        .map(project => ({
          id: project.id,
          title: project.title,
          description: project.description,
          category: project.category,
          difficulty: project.difficulty,
          framework: project.framework,
          estimatedTime: project.estimatedTime,
          thumbnail: project.thumbnail,
          rating: project.stats.rating.average,
          completions: project.stats.completions,
          relevanceScore: 1.0,
        }));

      setSearchResults(results);
    } catch (err) {
      setError('Search failed');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, filters, projects]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setFilters(DEFAULT_FILTERS);
  }, []);

  const updateFilters = useCallback((newFilters: Partial<ProjectFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const getCurrentProgress = useCallback((projectId: string) => {
    return userProgress.get(projectId) || null;
  }, [userProgress]);

  const startProject = useCallback((projectId: string) => {
    const existing = userProgress.get(projectId);
    if (existing) return;

    const newProgress: ProjectProgress = {
      projectId,
      userId: 'current-user', // TODO: Get from auth context
      status: 'in-progress',
      currentStep: 0,
      completedSteps: new Set(),
      completedCheckpoints: new Set(),
      startedAt: new Date(),
      lastAccessedAt: new Date(),
      timeSpent: 0,
      notes: [],
      code: new Map(),
    };

    setUserProgress(prev => {
      const updated = new Map(prev);
      updated.set(projectId, newProgress);
      return updated;
    });
  }, [userProgress]);

  const completeStep = useCallback((projectId: string, stepId: string) => {
    setUserProgress(prev => {
      const progress = prev.get(projectId);
      if (!progress) return prev;

      const updated = new Map(prev);
      const completedSteps = new Set(progress.completedSteps);
      completedSteps.add(stepId);

      updated.set(projectId, {
        ...progress,
        completedSteps,
        lastAccessedAt: new Date(),
      });

      return updated;
    });
  }, []);

  const completeCheckpoint = useCallback((projectId: string, checkpointId: string) => {
    setUserProgress(prev => {
      const progress = prev.get(projectId);
      if (!progress) return prev;

      const updated = new Map(prev);
      const completedCheckpoints = new Set(progress.completedCheckpoints);
      completedCheckpoints.add(checkpointId);

      updated.set(projectId, {
        ...progress,
        completedCheckpoints,
        lastAccessedAt: new Date(),
      });

      return updated;
    });
  }, []);

  const updateProjectCode = useCallback((projectId: string, filename: string, content: string) => {
    setUserProgress(prev => {
      const progress = prev.get(projectId);
      if (!progress) return prev;

      const updated = new Map(prev);
      const code = new Map(progress.code);
      code.set(filename, content);

      updated.set(projectId, {
        ...progress,
        code,
        lastAccessedAt: new Date(),
      });

      return updated;
    });
  }, []);

  const addNote = useCallback((projectId: string, stepId: string, content: string) => {
    setUserProgress(prev => {
      const progress = prev.get(projectId);
      if (!progress) return prev;

      const newNote: ProjectNote = {
        id: `note_${Date.now()}`,
        stepId,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updated = new Map(prev);
      updated.set(projectId, {
        ...progress,
        notes: [...progress.notes, newNote],
        lastAccessedAt: new Date(),
      });

      return updated;
    });
  }, []);

  const updateNote = useCallback((projectId: string, noteId: string, content: string) => {
    setUserProgress(prev => {
      const progress = prev.get(projectId);
      if (!progress) return prev;

      const updated = new Map(prev);
      updated.set(projectId, {
        ...progress,
        notes: progress.notes.map(note =>
          note.id === noteId
            ? { ...note, content, updatedAt: new Date() }
            : note
        ),
        lastAccessedAt: new Date(),
      });

      return updated;
    });
  }, []);

  const deleteNote = useCallback((projectId: string, noteId: string) => {
    setUserProgress(prev => {
      const progress = prev.get(projectId);
      if (!progress) return prev;

      const updated = new Map(prev);
      updated.set(projectId, {
        ...progress,
        notes: progress.notes.filter(note => note.id !== noteId),
        lastAccessedAt: new Date(),
      });

      return updated;
    });
  }, []);

  const submitProject = useCallback(async (
    projectId: string,
    submission: Omit<ProjectSubmission, 'id' | 'submittedAt'>
  ) => {
    try {
      // TODO: Replace with actual API call
      const newSubmission: ProjectSubmission = {
        ...submission,
        id: `submission_${Date.now()}`,
        submittedAt: new Date(),
      };

      setSubmissions(prev => {
        const updated = new Map(prev);
        updated.set(projectId, newSubmission);
        return updated;
      });

      // Mark project as completed
      setUserProgress(prev => {
        const progress = prev.get(projectId);
        if (!progress) return prev;

        const updated = new Map(prev);
        updated.set(projectId, {
          ...progress,
          status: 'completed',
          completedAt: new Date(),
          lastAccessedAt: new Date(),
        });

        return updated;
      });
    } catch (err) {
      setError('Failed to submit project');
      console.error(err);
      throw err;
    }
  }, []);

  const getSubmission = useCallback((projectId: string) => {
    return submissions.get(projectId) || null;
  }, [submissions]);

  const downloadStarterCode = useCallback(async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      // TODO: Implement actual download
      console.log('Downloading starter code:', project.starterCode.downloadUrl);
    } catch (err) {
      setError('Failed to download starter code');
      console.error(err);
      throw err;
    }
  }, [projects]);

  const downloadSolutionCode = useCallback(async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project || !project.solutionCode) throw new Error('Solution not available');

      if (project.solutionCode.isLocked) {
        const progress = userProgress.get(projectId);
        if (!progress || progress.status !== 'completed') {
          throw new Error('Complete the project to unlock solution');
        }
      }

      // TODO: Implement actual download
      console.log('Downloading solution code:', project.solutionCode.downloadUrl);
    } catch (err) {
      setError('Failed to download solution code');
      console.error(err);
      throw err;
    }
  }, [projects, userProgress]);

  const downloadDataset = useCallback(async (projectId: string, datasetId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const dataset = project.datasets.find(d => d.id === datasetId);
      if (!dataset) throw new Error('Dataset not found');

      // TODO: Implement actual download
      console.log('Downloading dataset:', dataset.downloadUrl);
    } catch (err) {
      setError('Failed to download dataset');
      console.error(err);
      throw err;
    }
  }, [projects]);

  const loadStats = useCallback(async () => {
    try {
      // TODO: Replace with actual API call
      const statsData: ProjectStats = {
        totalProjects: projects.length,
        totalCompletions: 0,
        averageRating: 0,
        categoryCounts: {} as Record<ProjectCategory, number>,
        popularProjects: [],
        recentProjects: [],
      };

      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [projects]);

  const value: ExampleProjectContextType = {
    projects,
    currentProject,
    popularProjects,
    recentProjects,
    loadProject,
    getProjectsByCategory,
    searchQuery,
    searchResults,
    filters,
    isSearching,
    setSearchQuery,
    updateFilters,
    performSearch,
    clearSearch,
    userProgress,
    getCurrentProgress,
    startProject,
    completeStep,
    completeCheckpoint,
    updateProjectCode,
    addNote,
    updateNote,
    deleteNote,
    submissions,
    submitProject,
    getSubmission,
    downloadStarterCode,
    downloadSolutionCode,
    downloadDataset,
    stats,
    loadStats,
    loading,
    error,
  };

  return (
    <ExampleProjectContext.Provider value={value}>
      {children}
    </ExampleProjectContext.Provider>
  );
};

export const useExampleProjects = () => {
  const context = useContext(ExampleProjectContext);
  if (!context) {
    throw new Error('useExampleProjects must be used within ExampleProjectProvider');
  }
  return context;
};

// Made with Bob
