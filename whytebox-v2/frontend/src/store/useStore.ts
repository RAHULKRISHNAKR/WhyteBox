import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Model,
  VisualizationConfig,
  VisualizationState,
  User,
  Notification,
} from '@/types';

interface AppState {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;

  // Models state
  models: Model[];
  selectedModel: Model | null;
  loadingModels: boolean;
  setModels: (models: Model[]) => void;
  setSelectedModel: (model: Model | null) => void;
  setLoadingModels: (loading: boolean) => void;
  addModel: (model: Model) => void;
  removeModel: (id: string) => void;

  // Visualization state
  visualizationConfig: VisualizationConfig;
  visualizationState: VisualizationState;
  setVisualizationConfig: (config: Partial<VisualizationConfig>) => void;
  setVisualizationState: (state: Partial<VisualizationState>) => void;

  // UI state
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'auto';
  notifications: Notification[];
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;
}

const defaultVisualizationConfig: VisualizationConfig = {
  showLabels: true,
  showConnections: true,
  colorScheme: 'default',
  animationSpeed: 1,
  cameraMode: 'orbit',
  layerSpacing: 2,
  nodeSize: 1,
};

const defaultVisualizationState: VisualizationState = {
  selectedLayer: null,
  hoveredLayer: null,
  highlightedConnections: [],
  isAnimating: false,
  currentStep: 0,
  totalSteps: 0,
};

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // User state
        user: null,
        setUser: (user) => set({ user }),

        // Models state
        models: [],
        selectedModel: null,
        loadingModels: false,
        setModels: (models) => set({ models }),
        setSelectedModel: (model) => set({ selectedModel: model }),
        setLoadingModels: (loading) => set({ loadingModels: loading }),
        addModel: (model) =>
          set((state) => ({
            models: [...state.models, model],
          })),
        removeModel: (id) =>
          set((state) => ({
            models: state.models.filter((m) => m.id !== id),
            selectedModel: state.selectedModel?.id === id ? null : state.selectedModel,
          })),

        // Visualization state
        visualizationConfig: defaultVisualizationConfig,
        visualizationState: defaultVisualizationState,
        setVisualizationConfig: (config) =>
          set((state) => ({
            visualizationConfig: { ...state.visualizationConfig, ...config },
          })),
        setVisualizationState: (visualState) =>
          set((state) => ({
            visualizationState: { ...state.visualizationState, ...visualState },
          })),

        // UI state
        sidebarOpen: true,
        theme: 'light',
        notifications: [],
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setTheme: (theme) => set({ theme }),
        addNotification: (notification) =>
          set((state) => ({
            notifications: [
              ...state.notifications,
              {
                ...notification,
                id: `notif-${Date.now()}-${Math.random()}`,
                timestamp: new Date().toISOString(),
                read: false,
              },
            ],
          })),
        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),
        markNotificationRead: (id) =>
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
          })),
        clearNotifications: () => set({ notifications: [] }),

        // Loading states
        isLoading: false,
        loadingMessage: '',
        setLoading: (loading, message = '') =>
          set({ isLoading: loading, loadingMessage: message }),

        // Error state
        error: null,
        setError: (error) => set({ error }),
      }),
      {
        name: 'whytebox-storage',
        partialize: (state) => ({
          user: state.user,
          theme: state.theme,
          visualizationConfig: state.visualizationConfig,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    { name: 'WhyteBox Store' }
  )
);

// Selectors for better performance
export const useUser = () => useStore((state) => state.user);
export const useModels = () => useStore((state) => state.models);
export const useSelectedModel = () => useStore((state) => state.selectedModel);
export const useVisualizationConfig = () => useStore((state) => state.visualizationConfig);
export const useVisualizationState = () => useStore((state) => state.visualizationState);
export const useNotifications = () => useStore((state) => state.notifications);
export const useTheme = () => useStore((state) => state.theme);
export const useLoading = () => useStore((state) => ({ isLoading: state.isLoading, loadingMessage: state.loadingMessage }));

// Made with Bob
