/**
 * Loading Screen Component
 * 
 * Full-screen loading indicator
 */

import { Box, CircularProgress, Typography } from '@mui/material'

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  )
}

// Made with Bob
