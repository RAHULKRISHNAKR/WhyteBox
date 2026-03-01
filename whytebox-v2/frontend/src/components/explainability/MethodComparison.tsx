/**
 * Method Comparison Component
 * 
 * Side-by-side comparison of different explainability methods
 */

import { Box, Grid, Paper, Typography, Chip, Divider } from '@mui/material'
import HeatmapOverlay from './HeatmapOverlay'

export interface ExplainabilityMethod {
  name: string
  type: 'gradcam' | 'saliency' | 'integrated_gradients'
  heatmapData: number[][]
  computeTime: number
  description: string
}

interface MethodComparisonProps {
  originalImage: string
  methods: ExplainabilityMethod[]
  selectedClass?: string
}

export default function MethodComparison({
  originalImage,
  methods,
  selectedClass,
}: MethodComparisonProps) {
  if (methods.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No explainability results available
        </Typography>
      </Paper>
    )
  }

  return (
    <Box>
      {selectedClass && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light' }}>
          <Typography variant="subtitle2" color="primary.dark">
            Explaining prediction for class: <strong>{selectedClass}</strong>
          </Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        {methods.map((method) => (
          <Grid item xs={12} md={6} lg={4} key={method.name}>
            <Box>
              <HeatmapOverlay
                originalImage={originalImage}
                heatmapData={method.heatmapData}
                title={method.name}
                colormap={getColormapForMethod(method.type)}
              />
              
              <Paper sx={{ p: 2, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Chip
                    label={method.type.toUpperCase().replace('_', ' ')}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {method.computeTime.toFixed(2)}ms
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Typography variant="body2" color="text.secondary">
                  {method.description}
                </Typography>
              </Paper>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Method Comparison Summary */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Method Comparison
        </Typography>
        
        <Grid container spacing={2}>
          {methods.map((method) => (
            <Grid item xs={12} sm={6} md={4} key={method.name}>
              <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {method.name}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Compute Time:
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {method.computeTime.toFixed(2)}ms
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Resolution:
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {method.heatmapData.length}x{method.heatmapData[0]?.length || 0}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Method Descriptions */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            About These Methods
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            <MethodInfo
              name="Grad-CAM"
              description="Gradient-weighted Class Activation Mapping highlights regions that strongly influence the prediction using gradients flowing into the final convolutional layer."
            />
            <MethodInfo
              name="Saliency Maps"
              description="Shows the magnitude of gradients with respect to input pixels, indicating which pixels have the most influence on the prediction."
            />
            <MethodInfo
              name="Integrated Gradients"
              description="Computes gradients along a path from a baseline to the input, satisfying sensitivity and implementation invariance axioms for more robust attributions."
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}

function MethodInfo({ name, description }: { name: string; description: string }) {
  return (
    <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
      <Typography variant="body2" fontWeight={600} gutterBottom>
        {name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </Box>
  )
}

function getColormapForMethod(type: string): 'jet' | 'hot' | 'viridis' | 'plasma' {
  switch (type) {
    case 'gradcam':
      return 'jet'
    case 'saliency':
      return 'hot'
    case 'integrated_gradients':
      return 'viridis'
    default:
      return 'jet'
  }
}

// Made with Bob
