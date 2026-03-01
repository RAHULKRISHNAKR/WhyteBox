/**
 * Breadcrumbs Component
 * 
 * Navigation breadcrumbs based on current route
 */

import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material'
import { NavigateNext as NavigateNextIcon, Home as HomeIcon } from '@mui/icons-material'
import { Link as RouterLink, useLocation } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  path?: string
}

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  models: 'Models',
  upload: 'Upload',
  inference: 'Inference',
  explainability: 'Explainability',
  visualization: 'Visualization',
  settings: 'Settings',
}

export default function Breadcrumbs() {
  const location = useLocation()
  const pathnames = location.pathname.split('/').filter((x) => x)

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/dashboard' },
  ]

  let currentPath = ''
  pathnames.forEach((segment) => {
    currentPath += `/${segment}`
    const label = routeLabels[segment] || segment
    breadcrumbs.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      path: currentPath,
    })
  })

  // Don't show breadcrumbs on home/dashboard
  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'dashboard')) {
    return null
  }

  return (
    <MuiBreadcrumbs
      separator={<NavigateNextIcon fontSize="small" />}
      aria-label="breadcrumb"
      sx={{ mb: 2 }}
    >
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1

        if (isLast) {
          return (
            <Typography key={crumb.path} color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
              {index === 0 && <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />}
              {crumb.label}
            </Typography>
          )
        }

        return (
          <Link
            key={crumb.path}
            component={RouterLink}
            to={crumb.path!}
            underline="hover"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            {index === 0 && <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />}
            {crumb.label}
          </Link>
        )
      })}
    </MuiBreadcrumbs>
  )
}

// Made with Bob
