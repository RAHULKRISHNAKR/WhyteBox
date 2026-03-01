/**
 * Dashboard Page
 *
 * Main dashboard with live model counts and quick-action navigation.
 */

import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Button,
  Stack,
  Skeleton,
  Chip,
} from '@mui/material'
import {
  ViewInAr as ModelsIcon,
  Psychology as InferenceIcon,
  Lightbulb as ExplainabilityIcon,
  School as TutorialsIcon,
  ArrowForward as ArrowIcon,
  Layers as LayersIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material'
import PageContainer from '@/components/common/PageContainer'
import { modelsApi } from '@/services/api/models'

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  loading?: boolean
  onClick?: () => void
}

function StatCard({ title, value, icon, color, loading, onClick }: StatCardProps) {
  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s',
        '&:hover': onClick ? { boxShadow: 6 } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="overline">
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={60} height={48} />
            ) : (
              <Typography variant="h4" component="div" fontWeight="bold">
                {value}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// ─── Quick action card ────────────────────────────────────────────────────────
interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  color: string
  href: string
}

function QuickAction({ title, description, icon, color, href }: QuickActionProps) {
  const navigate = useNavigate()
  return (
    <Paper
      sx={{
        p: 2.5, cursor: 'pointer',
        borderLeft: `4px solid ${color}`,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
      onClick={() => navigate(href)}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ color }}>{icon}</Box>
        <Box flex={1}>
          <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
          <Typography variant="caption" color="text.secondary">{description}</Typography>
        </Box>
        <ArrowIcon fontSize="small" color="action" />
      </Stack>
    </Paper>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()

  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['models'],
    queryFn: () => modelsApi.getModels(),
    staleTime: 60_000,
  })

  const pretrainedCount = models.filter((m) => m.source === 'pretrained').length
  const customCount = models.filter((m) => m.source === 'custom').length

  return (
    <PageContainer
      title="Dashboard"
      subtitle="Welcome to WhyteBox — AI Model Explainability Platform"
      showBreadcrumbs={false}
    >
      <Grid container spacing={3}>
        {/* ── Stats ── */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pretrained Models"
            value={modelsLoading ? '…' : pretrainedCount}
            icon={<ModelsIcon sx={{ fontSize: 32, color: '#1976d2' }} />}
            color="#1976d2"
            loading={modelsLoading}
            onClick={() => navigate('/models')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Custom Models"
            value={modelsLoading ? '…' : customCount}
            icon={<LayersIcon sx={{ fontSize: 32, color: '#2e7d32' }} />}
            color="#2e7d32"
            loading={modelsLoading}
            onClick={() => navigate('/models')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Explainability Methods"
            value="3"
            icon={<ExplainabilityIcon sx={{ fontSize: 32, color: '#ed6c02' }} />}
            color="#ed6c02"
            onClick={() => navigate('/explainability')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tutorials Available"
            value="5"
            icon={<TutorialsIcon sx={{ fontSize: 32, color: '#9c27b0' }} />}
            color="#9c27b0"
            onClick={() => navigate('/tutorials')}
          />
        </Grid>

        {/* ── Quick Actions ── */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <Stack spacing={1.5} mt={1}>
              <QuickAction
                title="Visualize a Model"
                description="Explore neural network architecture in 3D"
                icon={<ModelsIcon />}
                color="#1976d2"
                href="/visualization"
              />
              <QuickAction
                title="Run Inference"
                description="Classify an image with a pretrained model"
                icon={<InferenceIcon />}
                color="#2e7d32"
                href="/inference"
              />
              <QuickAction
                title="Explain a Prediction"
                description="Generate Grad-CAM, Saliency, or IG heatmaps"
                icon={<ExplainabilityIcon />}
                color="#ed6c02"
                href="/explainability"
              />
              <QuickAction
                title="Take a Quiz"
                description="Test your AI explainability knowledge"
                icon={<QuizIcon />}
                color="#9c27b0"
                href="/quizzes"
              />
            </Stack>
          </Paper>
        </Grid>

        {/* ── Available Models ── */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Available Models</Typography>
              <Button
                size="small"
                endIcon={<ArrowIcon />}
                onClick={() => navigate('/models')}
              >
                View All
              </Button>
            </Stack>

            {modelsLoading ? (
              <Stack spacing={1}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
                ))}
              </Stack>
            ) : models.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No models found. Make sure the backend is running.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/models')}
                >
                  Go to Models
                </Button>
              </Box>
            ) : (
              <Stack spacing={1}>
                {models.slice(0, 5).map((model) => (
                  <Paper
                    key={model.id}
                    variant="outlined"
                    sx={{
                      p: 1.5, cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                    onClick={() => navigate(`/visualization?model=${model.id}`)}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight="medium">{model.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(model.total_params / 1e6).toFixed(1)}M params · {model.num_classes} classes
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Chip label={model.framework} size="small" color="primary" />
                        {model.source === 'custom' && (
                          <Chip label="custom" size="small" color="warning" />
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
                {models.length > 5 && (
                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    +{models.length - 5} more models
                  </Typography>
                )}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  )
}

// Made with Bob
