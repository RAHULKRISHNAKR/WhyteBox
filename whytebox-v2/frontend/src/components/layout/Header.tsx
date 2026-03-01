/**
 * Header Component
 * 
 * Top app bar with title, theme toggle, and user menu
 */

import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { toggleTheme } from '@/store/slices/uiSlice'
import { toggleSidebar } from '@/store/slices/uiSlice'
import { logout } from '@/store/slices/authSlice'

interface HeaderProps {
  title?: string
}

export default function Header({ title = 'WhyteBox' }: HeaderProps) {
  const theme = useTheme()
  const dispatch = useAppDispatch()
  const themeMode = useAppSelector((state) => state.ui.themeMode)
  const user = useAppSelector((state) => state.auth.user)
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleThemeToggle = () => {
    dispatch(toggleTheme())
  }

  const handleLogout = () => {
    dispatch(logout())
    handleMenuClose()
  }

  const handleSidebarToggle = () => {
    dispatch(toggleSidebar())
  }

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Toolbar>
        {/* Mobile Menu Button */}
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleSidebarToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Title */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>

        {/* Theme Toggle */}
        <Tooltip title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}>
          <IconButton onClick={handleThemeToggle} color="inherit">
            {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Tooltip>

        {/* User Menu */}
        <Tooltip title="Account">
          <IconButton
            onClick={handleMenuOpen}
            color="inherit"
            sx={{ ml: 1 }}
          >
            <AccountIcon />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {user && (
            <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2">{user.username}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          )}
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}

// Made with Bob
