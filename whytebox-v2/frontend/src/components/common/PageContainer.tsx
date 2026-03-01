/**
 * Page Container Component
 * 
 * Wrapper for page content with optional breadcrumbs and title
 */

import { Box, Container, Typography } from '@mui/material'
import Breadcrumbs from './Breadcrumbs'

interface PageContainerProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  showBreadcrumbs?: boolean
  actions?: React.ReactNode
}

export default function PageContainer({
  children,
  title,
  subtitle,
  maxWidth = 'xl',
  showBreadcrumbs = true,
  actions,
}: PageContainerProps) {
  return (
    <Container maxWidth={maxWidth} sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      {showBreadcrumbs && <Breadcrumbs />}

      {/* Page Header */}
      {(title || actions) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 3,
          }}
        >
          <Box>
            {title && (
              <Typography variant="h4" component="h1" gutterBottom>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body1" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions && <Box>{actions}</Box>}
        </Box>
      )}

      {/* Page Content */}
      {children}
    </Container>
  )
}

// Made with Bob
