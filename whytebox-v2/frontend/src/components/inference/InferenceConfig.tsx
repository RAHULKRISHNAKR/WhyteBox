/**
 * Inference Configuration Component
 * 
 * Configure inference parameters and preprocessing options
 */

import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'

export interface InferenceConfigData {
  batchSize: number
  topK: number
  temperature: number
  normalize: boolean
  resize: boolean
  targetSize: number
  preprocessingMethod: string
}

interface InferenceConfigProps {
  config: InferenceConfigData
  onChange: (config: InferenceConfigData) => void
}

export default function InferenceConfig({ config, onChange }: InferenceConfigProps) {
  const handleChange = (field: keyof InferenceConfigData, value: any) => {
    onChange({ ...config, [field]: value })
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Inference Configuration
      </Typography>

      {/* Basic Settings */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Basic Settings
        </Typography>
        
        <TextField
          label="Batch Size"
          type="number"
          value={config.batchSize}
          onChange={(e) => handleChange('batchSize', parseInt(e.target.value))}
          fullWidth
          margin="normal"
          inputProps={{ min: 1, max: 32 }}
          helperText="Number of images to process simultaneously"
        />

        <TextField
          label="Top K Predictions"
          type="number"
          value={config.topK}
          onChange={(e) => handleChange('topK', parseInt(e.target.value))}
          fullWidth
          margin="normal"
          inputProps={{ min: 1, max: 10 }}
          helperText="Number of top predictions to return"
        />

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" gutterBottom>
            Temperature: {config.temperature.toFixed(2)}
          </Typography>
          <Slider
            value={config.temperature}
            onChange={(_, value) => handleChange('temperature', value)}
            min={0.1}
            max={2.0}
            step={0.1}
            marks={[
              { value: 0.1, label: '0.1' },
              { value: 1.0, label: '1.0' },
              { value: 2.0, label: '2.0' },
            ]}
            valueLabelDisplay="auto"
          />
          <Typography variant="caption" color="text.secondary">
            Controls prediction confidence distribution
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Preprocessing Settings */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2">Preprocessing Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={config.normalize}
                  onChange={(e) => handleChange('normalize', e.target.checked)}
                />
              }
              label="Normalize Input"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mb: 2 }}>
              Apply standard normalization (mean=0.5, std=0.5)
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={config.resize}
                  onChange={(e) => handleChange('resize', e.target.checked)}
                />
              }
              label="Resize Image"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mb: 2 }}>
              Resize to model's expected input size
            </Typography>

            {config.resize && (
              <TextField
                label="Target Size"
                type="number"
                value={config.targetSize}
                onChange={(e) => handleChange('targetSize', parseInt(e.target.value))}
                fullWidth
                margin="normal"
                inputProps={{ min: 32, max: 1024, step: 32 }}
                helperText="Target image size (width and height)"
              />
            )}

            <FormControl fullWidth margin="normal">
              <InputLabel>Preprocessing Method</InputLabel>
              <Select
                value={config.preprocessingMethod}
                onChange={(e) => handleChange('preprocessingMethod', e.target.value)}
                label="Preprocessing Method"
              >
                <MenuItem value="standard">Standard (ImageNet)</MenuItem>
                <MenuItem value="caffe">Caffe</MenuItem>
                <MenuItem value="torch">PyTorch</MenuItem>
                <MenuItem value="tensorflow">TensorFlow</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Advanced Settings */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2">Advanced Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <FormControlLabel
              control={<Switch />}
              label="Enable Mixed Precision"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mb: 2 }}>
              Use FP16 for faster inference (requires GPU)
            </Typography>

            <FormControlLabel
              control={<Switch />}
              label="Enable Gradient Checkpointing"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mb: 2 }}>
              Reduce memory usage at the cost of speed
            </Typography>

            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Cache Results"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
              Cache inference results for faster repeated predictions
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  )
}

// Made with Bob
