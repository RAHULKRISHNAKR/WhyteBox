/**
 * Image Upload Component
 * 
 * Drag-and-drop image upload with preview
 */

import { useState, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  LinearProgress,
} from '@mui/material'
import {
  CloudUpload,
  Close,
  Image as ImageIcon,
} from '@mui/icons-material'

interface ImageUploadProps {
  onImageSelect: (file: File) => void
  onImageRemove?: () => void
  maxSize?: number // in MB
  acceptedFormats?: string[]
}

export default function ImageUpload({
  onImageSelect,
  onImageRemove,
  maxSize = 10,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/jpg'],
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      return `Invalid file type. Accepted formats: ${acceptedFormats.join(', ')}`
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSize) {
      return `File too large. Maximum size: ${maxSize}MB`
    }

    return null
  }

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Notify parent
    onImageSelect(file)
  }, [onImageSelect, maxSize, acceptedFormats])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    onImageRemove?.()
  }

  if (preview) {
    return (
      <Paper
        sx={{
          p: 2,
          position: 'relative',
          border: 2,
          borderColor: 'primary.main',
          borderStyle: 'solid',
        }}
      >
        <IconButton
          onClick={handleRemove}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'error.main', color: 'white' },
          }}
        >
          <Close />
        </IconButton>
        <Box
          component="img"
          src={preview}
          alt="Upload preview"
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: 400,
            objectFit: 'contain',
            borderRadius: 1,
          }}
        />
      </Paper>
    )
  }

  return (
    <Paper
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      sx={{
        p: 4,
        textAlign: 'center',
        border: 2,
        borderColor: isDragging ? 'primary.main' : 'divider',
        borderStyle: 'dashed',
        bgcolor: isDragging ? 'action.hover' : 'background.paper',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
        },
      }}
    >
      <input
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileInput}
        style={{ display: 'none' }}
        id="image-upload-input"
      />
      <label htmlFor="image-upload-input" style={{ cursor: 'pointer' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <ImageIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
          <Typography variant="h6" color="text.secondary">
            Drag & drop an image here
          </Typography>
          <Typography variant="body2" color="text.secondary">
            or
          </Typography>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            component="span"
          >
            Browse Files
          </Button>
          <Typography variant="caption" color="text.secondary">
            Supported formats: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}
            <br />
            Maximum size: {maxSize}MB
          </Typography>
        </Box>
      </label>
      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
    </Paper>
  )
}

// Made with Bob
