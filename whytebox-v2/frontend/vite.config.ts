import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      // Split large chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // React core
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // State management
            'state-vendor': ['@reduxjs/toolkit', 'react-redux', 'zustand'],
            // UI library
            'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            // Data fetching
            'query-vendor': ['@tanstack/react-query', 'axios'],
            // BabylonJS (large — separate chunk)
            'babylon-vendor': ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/materials'],
            // Charts and visualization
            'viz-vendor': ['d3', 'recharts', 'reactflow'],
          },
        },
      },
      // Warn if any chunk exceeds 1MB
      chunkSizeWarningLimit: 1000,
    },

    server: {
      port: 5173,
      host: '0.0.0.0',
      // Proxy API calls to backend in development
      proxy: {
        '/api': {
          target: env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000',
          changeOrigin: true,
          ws: true,
        },
      },
    },

    preview: {
      port: 4173,
      host: '0.0.0.0',
    },

    // Optimise deps for faster dev server startup
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@tanstack/react-query',
        'axios',
        'zustand',
      ],
      exclude: [
        '@babylonjs/core',  // BabylonJS uses ESM — exclude from pre-bundling
      ],
    },

    define: {
      // Make env vars available at build time
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0'),
    },
  }
})

// Made with Bob
