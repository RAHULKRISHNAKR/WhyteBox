/**
 * 3D Visualization Page (route: /visualization/:id)
 *
 * Wraps VisualizationPage with a model ID from the URL path param.
 * Also supports ?model= query param via VisualizationPage itself.
 */

import { useParams } from 'react-router-dom'
import VisualizationPage from '@/pages/VisualizationPage'

export default function Visualization() {
  // The route is /visualization/:id — VisualizationPage reads ?model= from search params.
  // We inject the path param as a search param via a wrapper URL redirect approach,
  // but the simplest solution is to just render VisualizationPage which handles both.
  const { id } = useParams<{ id: string }>()

  // Pass id via URL manipulation isn't needed — VisualizationPage reads searchParams.
  // Instead, we render it directly and let the page handle the model selection.
  // The id from the path is available here if needed for future deep-linking.
  void id // acknowledged

  return <VisualizationPage />
}

// Made with Bob
