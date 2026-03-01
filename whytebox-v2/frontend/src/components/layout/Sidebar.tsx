/**
 * Sidebar Component
 * 
 * Navigation sidebar with menu items and collapsible functionality
 */

import { useState } from 'react'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  ViewInAr as ModelsIcon,
  Psychology as InferenceIcon,
  Lightbulb as ExplainabilityIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon,
  ViewInAr,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { toggleSidebar } from '@/store/slices/uiSlice'

const DRAWER_WIDTH = 240
const DRAWER_WIDTH_COLLAPSED = 64

interface MenuItem {
  title: string
  path: string
  icon: React.ReactNode
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { title: 'Models', path: '/models', icon: <ModelsIcon /> },
  { title: 'Inference', path: '/inference', icon: <InferenceIcon /> },
  { title: 'Explainability', path: '/explainability', icon: <ExplainabilityIcon /> },
  { title: 'Settings', path: '/settings', icon: <SettingsIcon /> },
]

export default function Sidebar() {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen)
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleNavigate = (path: string) => {
    navigate(path)
    if (isMobile) {
      dispatch(toggleSidebar())
    }
  }

  const handleToggle = () => {
    dispatch(toggleSidebar())
  }

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
          minHeight: 64,
        }}
      >
        {sidebarOpen && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewInAr sx={{ color: 'primary.main', fontSize: 32 }} />
            <Box>
              <Box sx={{ fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.2 }}>
                WhyteBox
              </Box>
              <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                AI Explainability
              </Box>
            </Box>
          </Box>
        )}
        {!isMobile && (
          <IconButton onClick={handleToggle} size="small">
            {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        )}
        {isMobile && sidebarOpen && (
          <IconButton onClick={handleToggle} size="small">
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Navigation Menu */}
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path)
          
          return (
            <Tooltip
              key={item.path}
              title={!sidebarOpen ? item.title : ''}
              placement="right"
            >
              <ListItem disablePadding sx={{ px: 1, mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigate(item.path)}
                  selected={isActive}
                  sx={{
                    borderRadius: 1,
                    minHeight: 48,
                    justifyContent: sidebarOpen ? 'initial' : 'center',
                    px: 2.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: sidebarOpen ? 2 : 'auto',
                      justifyContent: 'center',
                      color: isActive ? 'inherit' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {sidebarOpen && (
                    <ListItemText
                      primary={item.title}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </Tooltip>
          )
        })}
      </List>

      <Divider />

      {/* Footer */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        {sidebarOpen && (
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            v2.0.0
          </Box>
        )}
      </Box>
    </Box>
  )

  return (
    <>
      {/* Desktop Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: sidebarOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: sidebarOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
              boxSizing: 'border-box',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={sidebarOpen}
          onClose={handleToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  )
}

// Made with Bob
