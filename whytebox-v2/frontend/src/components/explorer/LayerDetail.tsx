/**
 * Layer Detail Component
 * 
 * Displays detailed information about a selected layer
 */

import {
  Box,
  Paper,
  Typography,
  Divider,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material'
import { LayerNode } from './LayerTree'

interface LayerDetailProps {
  layer: LayerNode | null
}

export default function LayerDetail({ layer }: LayerDetailProps) {
  if (!layer) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Select a layer to view details
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          {layer.name}
        </Typography>
        <Chip label={layer.type} size="small" color="primary" />
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Basic Information */}
        <Typography variant="subtitle2" gutterBottom>
          Basic Information
        </Typography>
        <TableContainer sx={{ mb: 3 }}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 600, width: '40%' }}>
                  Layer ID
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {layer.id}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 600 }}>
                  Type
                </TableCell>
                <TableCell>{layer.type}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 600 }}>
                  Parameters
                </TableCell>
                <TableCell>{layer.params.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />

        {/* Shape Information */}
        <Typography variant="subtitle2" gutterBottom>
          Shape Information
        </Typography>
        <TableContainer sx={{ mb: 3 }}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 600, width: '40%' }}>
                  Input Shape
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {layer.inputShape}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 600 }}>
                  Output Shape
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {layer.outputShape}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Metadata */}
        {layer.metadata && Object.keys(layer.metadata).length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Configuration
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {Object.entries(layer.metadata).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell component="th" sx={{ fontWeight: 600, width: '40%' }}>
                        {formatKey(key)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {formatValue(value)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Statistics */}
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          Statistics
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Parameters
              </Typography>
              <Typography variant="h6">
                {formatNumber(layer.params)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Memory (est.)
              </Typography>
              <Typography variant="h6">
                {estimateMemory(layer.params)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  )
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

function formatValue(value: any): string {
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`
  }
  return num.toString()
}

function estimateMemory(params: number): string {
  // Assume 4 bytes per parameter (float32)
  const bytes = params * 4
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`
  } else if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(2)} MB`
  } else if (bytes >= 1_024) {
    return `${(bytes / 1_024).toFixed(2)} KB`
  }
  return `${bytes} B`
}

// Made with Bob
