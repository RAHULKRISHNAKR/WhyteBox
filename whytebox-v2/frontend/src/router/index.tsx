/**
 * React Router Configuration
 *
 * Defines application routes with lazy loading.
 * All model IDs are strings (e.g. "resnet50").
 */

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import LoadingScreen from '@/components/common/LoadingScreen'

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'))

// Models — use our new unified ModelsPage
const ModelsPage = lazy(() => import('@/pages/ModelsPage'))

// Explorer
const ModelExplorer = lazy(() => import('@/pages/explorer/ModelExplorer'))

// Core feature pages
const Inference = lazy(() => import('@/pages/inference/Inference'))
const Explainability = lazy(() => import('@/pages/explainability/Explainability'))

// Visualization — two routes:
//   /visualization          → query-param based (new VisualizationPage)
//   /visualization/:id      → path-param based (wraps VisualizationPage)
const VisualizationPage = lazy(() => import('@/pages/VisualizationPage'))
const Visualization = lazy(() => import('@/pages/visualization/Visualization'))

// Educational — named exports need .then() wrapping for React.lazy
const TutorialsPage = lazy(() => import('@/pages/TutorialsPage'))
const Tutorials = lazy(() =>
  import('@/pages/tutorials/Tutorials').then((m) => ({ default: m.Tutorials }))
)
const LearningPaths = lazy(() =>
  import('@/pages/learningPaths/LearningPaths').then((m) => ({ default: m.LearningPaths }))
)
const Quizzes = lazy(() =>
  import('@/pages/quizzes/Quizzes').then((m) => ({ default: m.Quizzes }))
)
const QuizTaking = lazy(() =>
  import('@/pages/quizzes/QuizTaking').then((m) => ({ default: m.QuizTaking }))
)
const Documentation = lazy(() =>
  import('@/pages/documentation/Documentation').then((m) => ({ default: m.Documentation }))
)

// Settings / misc
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// Wrapper component for lazy loaded routes
const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <LazyRoute><Dashboard /></LazyRoute>,
      },

      // ── Models ──────────────────────────────────────────────────────────────
      {
        path: 'models',
        element: <LazyRoute><ModelsPage /></LazyRoute>,
      },

      // ── Explorer ─────────────────────────────────────────────────────────────
      {
        path: 'explorer',
        element: <LazyRoute><ModelExplorer /></LazyRoute>,
      },
      {
        path: 'explorer/:id',
        element: <LazyRoute><ModelExplorer /></LazyRoute>,
      },

      // ── Inference ─────────────────────────────────────────────────────────────
      {
        path: 'inference',
        element: <LazyRoute><Inference /></LazyRoute>,
      },

      // ── Explainability ────────────────────────────────────────────────────────
      {
        path: 'explainability',
        element: <LazyRoute><Explainability /></LazyRoute>,
      },

      // ── Visualization ─────────────────────────────────────────────────────────
      {
        // /visualization?model=resnet50
        path: 'visualization',
        element: <LazyRoute><VisualizationPage /></LazyRoute>,
      },
      {
        // /visualization/resnet50  (legacy / deep-link)
        path: 'visualization/:id',
        element: <LazyRoute><Visualization /></LazyRoute>,
      },

      // ── Educational ───────────────────────────────────────────────────────────
      {
        path: 'tutorials',
        element: <LazyRoute><TutorialsPage /></LazyRoute>,
      },
      {
        path: 'tutorials/browse',
        element: <LazyRoute><Tutorials /></LazyRoute>,
      },
      {
        path: 'learning-paths',
        element: <LazyRoute><LearningPaths /></LazyRoute>,
      },
      {
        path: 'quizzes',
        element: <LazyRoute><Quizzes /></LazyRoute>,
      },
      {
        path: 'quizzes/:id',
        element: <LazyRoute><QuizTaking /></LazyRoute>,
      },
      {
        path: 'docs',
        element: <LazyRoute><Documentation /></LazyRoute>,
      },

      // ── Settings ──────────────────────────────────────────────────────────────
      {
        path: 'settings',
        element: <LazyRoute><Settings /></LazyRoute>,
      },

      // ── 404 ───────────────────────────────────────────────────────────────────
      {
        path: '*',
        element: <LazyRoute><NotFound /></LazyRoute>,
      },
    ],
  },
])

// Made with Bob
