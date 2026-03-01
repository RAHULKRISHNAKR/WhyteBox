/**
 * Custom Render Utilities
 * 
 * Provides custom render functions with all necessary providers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../../theme';

// Create a new QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

/**
 * Wrapper component with all providers
 */
export const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

/**
 * Custom render function with all providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

/**
 * Custom render with router at specific route
 */
export const renderWithRouter = (
  ui: ReactElement,
  { route = '/', ...renderOptions }: { route?: string } & Omit<RenderOptions, 'wrapper'> = {}
) => {
  window.history.pushState({}, 'Test page', route);
  return renderWithProviders(ui, renderOptions);
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { renderWithProviders as render };

// Made with Bob
