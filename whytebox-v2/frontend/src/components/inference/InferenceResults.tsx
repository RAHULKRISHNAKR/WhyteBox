/**
 * Inference Results Component
 * 
 * Display prediction results with confidence scores and visualizations
 */

import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
} from '@mui/material'
import {
  CheckCircle,
  Timer,
  Memory,
} from '@mui/icons-material'

export interface Prediction {
  class: string
  confidence: number
  index: number
}

export interface InferenceResult {
  predictions: Prediction[]
  inferenceTime: number
  memoryUsed?: number
  modelName: string
  timestamp: string
}

interface InferenceResultsProps {
  result: InferenceResult | null
  isLoading?: boolean
  error?: string | null
}

export default function InferenceResults({ result, isLoading, error }: InferenceResultsProps) {
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    )
  }

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Running Inference...
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Processing your image. This may take a few seconds.
        </Typography>
      </Paper>
    )
  }

  if (!result) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Upload an image and run inference to see results
        </Typography>
      </Paper>
    )
  }

  const topPrediction = result.predictions[0]

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CheckCircle color="success" />
        <Typography variant="h6">Inference Complete</Typography>
      </Box>

      {/* Top Prediction */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
        <Typography variant="subtitle2" color="success.dark" gutterBottom>
          Top Prediction
        </Typography>
        <Typography variant="h4" color="success.dark" gutterBottom>
          {topPrediction.class}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={topPrediction.confidence * 100}
            sx={{ flexGrow: 1, height: 8, borderRadius: 1 }}
          />
          <Typography variant="h6" color="success.dark">
            {(topPrediction.confidence * 100).toFixed(2)}%
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* All Predictions */}
      <Typography variant="subtitle2" gutterBottom>
        All Predictions
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell align="right">Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.predictions.map((pred, index) => (
              <TableRow
                key={pred.index}
                sx={{
                  bgcolor: index === 0 ? 'action.selected' : 'transparent',
                }}
              >
                <TableCell>
                  <Chip
                    label={index + 1}
                    size="small"
                    color={index === 0 ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={index === 0 ? 600 : 400}>
                    {pred.class}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pred.confidence * 100}
                      sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
                      color={index === 0 ? 'primary' : 'inherit'}
                    />
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={index === 0 ? 600 : 400}>
                    {(pred.confidence * 100).toFixed(2)}%
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 2 }} />

      {/* Metadata */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Timer fontSize="small" color="action" />
          <Box>
            <Typography variant="caption" color="text.secondary">
              Inference Time
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {result.inferenceTime.toFixed(2)}ms
            </Typography>
          </Box>
        </Box>

        {result.memoryUsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Memory fontSize="small" color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Memory Used
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {(result.memoryUsed / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Box>
          </Box>
        )}

        <Box>
          <Typography variant="caption" color="text.secondary">
            Model
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {result.modelName}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Timestamp
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {new Date(result.timestamp).toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}

// Made with Bob
