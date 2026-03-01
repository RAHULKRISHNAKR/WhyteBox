/**
 * Main App Component
 * 
 * Root component with all providers
 */

import { useMemo } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { store, useAppSelector } from '@/store'
import { router } from '@/router'
import { queryClient } from '@/lib/queryClient'
import { lightTheme, darkTheme } from '@/theme'
import NotificationManager from '@/components/common/NotificationManager'

/**
 * Theme wrapper component
 * Provides theme based on Redux state
 */
function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const themeMode = useAppSelector((state) => state.ui.themeMode)
  const theme = useMemo(() => (themeMode === 'dark' ? darkTheme : lightTheme), [themeMode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

/**
 * Main App component
 */
function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeWrapper>
          <RouterProvider router={router} />
          <NotificationManager />
        </ThemeWrapper>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </Provider>
  )
}

export default App

// Made with Bob
