/**
 * Models Page
 *
 * Gallery of available pretrained models with stats and quick-action buttons.
 * Fetches from GET /api/v1/models and GET /api/v1/models/{id}/stats.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  Visibility as ViewIcon,
  PlayArrow as InferIcon,
  Psychology as ExplainIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Memory as MemoryIcon,
  Layers as LayersIcon,
} from '@mui/icons-material'
import PageContainer from '@/components/common/PageContainer'
import { modelsApi } from '@/services/api/models'
import type { ModelMeta } from '@/services/api/models'

// ─── Framework badge colours ──────────────────────────────────────────────────
const FRAMEWORK_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
  pytorch: 'primary',
  tensorflow: 'secondary',
  keras: 'success',
  onnx: 'warning',
}

// ─── Model card ───────────────────────────────────────────────────────────────
function ModelCard({ model, onDelete }: { model: ModelMeta; onDelete?: (id: string) => void }) {
  const navigate = useNavigate()
  const paramsMB = (model.total_params * 4) / 1e6 // rough float32 size

  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 6 },
      }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box flex={1}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {model.name}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label={model.framework}
              size="small"
              color={FRAMEWORK_COLORS[model.framework.toLowerCase()] ?? 'default'}
            />
            <Chip label={model.type} size="small" variant="outlined" />
            {model.source === 'custom' && (
              <Chip label="custom" size="small" color="warning" />
            )}
          </Stack>
        </Box>
        {model.source === 'custom' && onDelete && (
          <Tooltip title="Delete model">
            <IconButton size="small" color="error" onClick={() => onDelete(model.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
        {model.description}
      </Typography>

      <Divider sx={{ mb: 2 }} />

      {/* Stats */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <MemoryIcon fontSize="small" color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Parameters
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {(model.total_params / 1e6).toFixed(1)}M
              </Typography>
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={6}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <LayersIcon fontSize="small" color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Classes
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {model.num_classes.toLocaleString()}
              </Typography>
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary" display="block">
            Input Size
          </Typography>
          <Typography variant="body2">
            {model.input_size.join('×')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary" display="block">
            Est. Size
          </Typography>
          <Typography variant="body2">{paramsMB.toFixed(0)} MB</Typography>
        </Grid>
      </Grid>

      {/* Actions */}
      <Stack spacing={1}>
        <Button
          variant="contained"
          size="small"
          startIcon={<ViewIcon />}
          onClick={() => navigate(`/visualization?model=${model.id}`)}
          fullWidth
        >
          Visualize Architecture
        </Button>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<InferIcon />}
            onClick={() => navigate(`/inference?model=${model.id}`)}
            fullWidth
          >
            Inference
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ExplainIcon />}
            onClick={() => navigate(`/explainability?model=${model.id}`)}
            fullWidth
          >
            Explain
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}

// ─── Upload dialog ────────────────────────────────────────────────────────────
function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('No file selected')
      return modelsApi.uploadModel(file, file.name.replace(/\.[^.]+$/, ''), setProgress)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
      onClose()
      setFile(null)
      setProgress(0)
    },
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Custom Model</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Supported formats: .pt, .pth (PyTorch), .h5 (Keras), .onnx
        </Typography>
        <Box
          sx={{
            mt: 2, p: 3, border: '2px dashed',
            borderColor: 'divider', borderRadius: 2, textAlign: 'center',
            cursor: 'pointer',
            '&:hover': { borderColor: 'primary.main' },
          }}
          onClick={() => document.getElementById('model-file-input')?.click()}
        >
          <input
            id="model-file-input"
            type="file"
            accept=".pt,.pth,.h5,.onnx"
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {file ? file.name : 'Click to select a model file'}
          </Typography>
        </Box>
        {uploadMutation.isPending && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" color="text.secondary">
              Uploading… {progress}%
            </Typography>
          </Box>
        )}
        {uploadMutation.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {(uploadMutation.error as Error).message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => uploadMutation.mutate()}
          disabled={!file || uploadMutation.isPending}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ModelsPage() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: models = [], isLoading, error } = useQuery({
    queryKey: ['models'],
    queryFn: () => modelsApi.getModels(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => modelsApi.deleteModel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['models'] }),
  })

  const pretrained = models.filter((m) => m.source === 'pretrained')
  const custom = models.filter((m) => m.source === 'custom')

  return (
    <PageContainer
      title="Neural Network Models"
      subtitle="Browse pretrained models or upload your own for visualization, inference, and explainability"
    >
      {/* Header actions */}
      <Stack direction="row" justifyContent="flex-end" mb={3}>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setUploadOpen(true)}
        >
          Upload Model
        </Button>
      </Stack>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load models. Is the backend running?
        </Alert>
      )}

      {/* Pretrained models */}
      {pretrained.length > 0 && (
        <>
          <Typography variant="h5" gutterBottom>
            Pretrained Models
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Industry-standard models loaded from torchvision. Ready to use immediately.
          </Typography>
          <Grid container spacing={3} sx={{ mb: 5 }}>
            {pretrained.map((model) => (
              <Grid item xs={12} sm={6} md={4} key={model.id}>
                <ModelCard model={model} />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Custom models */}
      {custom.length > 0 && (
        <>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Custom Models
          </Typography>
          <Grid container spacing={3}>
            {custom.map((model) => (
              <Grid item xs={12} sm={6} md={4} key={model.id}>
                <ModelCard model={model} onDelete={(id) => deleteMutation.mutate(id)} />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {!isLoading && models.length === 0 && !error && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No models found. Make sure the backend is running and PyTorch is installed.
          </Typography>
        </Paper>
      )}

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </PageContainer>
  )
}

// Made with Bob
