/**
 * Empty State Component
 * 
 * Display when no data is available
 */

import { Box, Typography, Button } from '@mui/material'
import { Inbox as InboxIcon } from '@mui/icons-material'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({
  icon = <InboxIcon sx={{ fontSize: 64, color: 'text.disabled' }} />,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2,
        textAlign: 'center',
      }}
    >
      {icon}
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
          {description}
        </Typography>
      )}
      {action && (
        <Button variant="contained" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Box>
  )
}

// Made with Bob
