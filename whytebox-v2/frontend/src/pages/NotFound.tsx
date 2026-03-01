/**
 * 404 Not Found Page
 */

import { Container, Typography, Button, Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          gap: 2,
        }}
      >
        <Typography variant="h1" component="h1" sx={{ fontSize: '6rem', fontWeight: 'bold' }}>
          404
        </Typography>
        <Typography variant="h4" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          The page you are looking for does not exist or has been moved.
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </Box>
    </Container>
  )
}

// Made with Bob
