import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Performance-Optimized Vite Configuration
 * Implements code splitting, tree shaking, and bundle optimization
 */
export default defineConfig({
  plugins: [
    react({
      // Babel configuration for optimization
      babel: {
        plugins: [
          // Remove prop-types in production
          ['babel-plugin-transform-react-remove-prop-types', { removeImport: true }],
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@types': path.resolve(__dirname, './src/types'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },

  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // Output directory
    outDir: 'dist',
    
    // Generate sourcemaps for production debugging
    sourcemap: true,
    
    // Chunk size warning limit (500KB)
    chunkSizeWarningLimit: 500,
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.log in production
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        // Remove dead code
        dead_code: true,
        // Optimize conditionals
        conditionals: true,
        // Evaluate constant expressions
        evaluate: true,
        // Optimize booleans
        booleans: true,
        // Optimize loops
        loops: true,
        // Remove unused variables
        unused: true,
        // Hoist function declarations
        hoist_funs: true,
        // Hoist variable declarations
        hoist_vars: false,
        // Optimize if-return and if-continue
        if_return: true,
        // Join consecutive var statements
        join_vars: true,
        // Optimize comparisons
        comparisons: true,
        // Apply optimizations for side-effect-free code
        side_effects: true,
      },
      mangle: {
        // Mangle variable names
        toplevel: true,
        // Preserve class names for debugging
        keep_classnames: false,
        // Preserve function names for debugging
        keep_fnames: false,
      },
      format: {
        // Remove comments
        comments: false,
      },
    },

    // Rollup options for advanced bundling
    rollupOptions: {
      output: {
        // Manual chunk splitting strategy
        manualChunks: (id) => {
          // React core libraries
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') || 
              id.includes('node_modules/react-router-dom')) {
            return 'react-vendor';
          }
          
          // UI library (Material-UI)
          if (id.includes('node_modules/@mui') || 
              id.includes('node_modules/@emotion')) {
            return 'ui-vendor';
          }
          
          // Visualization libraries
          if (id.includes('node_modules/babylonjs') || 
              id.includes('node_modules/d3') ||
              id.includes('node_modules/three')) {
            return 'viz-vendor';
          }
          
          // Chart libraries
          if (id.includes('node_modules/recharts') || 
              id.includes('node_modules/chart.js')) {
            return 'chart-vendor';
          }
          
          // Utility libraries
          if (id.includes('node_modules/lodash') || 
              id.includes('node_modules/date-fns') ||
              id.includes('node_modules/axios')) {
            return 'utils-vendor';
          }
          
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        
        // Naming pattern for chunks
        chunkFileNames: 'assets/js/[name]-[hash].js',
        
        // Naming pattern for entry files
        entryFileNames: 'assets/js/[name]-[hash].js',
        
        // Naming pattern for assets
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || 'asset';
          const info = name.split('.');
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        },
      },
    },

    // CSS code splitting
    cssCodeSplit: true,
    
    // Inline assets smaller than 4KB
    assetsInlineLimit: 4096,
    
    // Report compressed size
    reportCompressedSize: true,
    
    // Emit manifest for SSR
    manifest: true,
  },

  // Optimization options
  optimizeDeps: {
    // Include dependencies for pre-bundling
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
    ],
    
    // Exclude large dependencies from pre-bundling
    exclude: [
      'babylonjs',
      '@babylonjs/core',
      '@babylonjs/loaders',
    ],
  },

  // Server configuration
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: false,
    // CORS
    cors: true,
    // HMR
    hmr: {
      overlay: true,
    },
  },

  // Preview configuration
  preview: {
    port: 4173,
    strictPort: false,
    host: true,
    open: false,
  },

  // Esbuild options for faster builds
  esbuild: {
    // Drop console in production
    drop: ['console', 'debugger'],
    // Minify identifiers
    minifyIdentifiers: true,
    // Minify syntax
    minifySyntax: true,
    // Minify whitespace
    minifyWhitespace: true,
    // Legal comments
    legalComments: 'none',
  },

  // JSON options
  json: {
    // Generate named exports
    namedExports: true,
    // Stringify
    stringify: false,
  },
});

// Made with Bob
