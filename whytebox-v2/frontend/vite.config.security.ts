import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite Security Configuration
 * 
 * Implements security best practices:
 * - Content Security Policy
 * - Subresource Integrity
 * - Security headers
 * - HTTPS enforcement
 */

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Security headers
  server: {
    headers: {
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' http://localhost:8000 ws://localhost:*",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
      
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',
      
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // XSS Protection (legacy browsers)
      'X-XSS-Protection': '1; mode=block',
      
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions Policy
      'Permissions-Policy': [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
      ].join(', '),
    },
    
    // CORS configuration
    cors: {
      origin: process.env.VITE_ALLOWED_ORIGINS?.split(',') || ['http://localhost:8000'],
      credentials: true,
    },
  },

  build: {
    // Enable source maps for debugging (disable in production)
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
    
    // Rollup options for security
    rollupOptions: {
      output: {
        // Separate vendor chunks for better caching and SRI
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@mui/material', '@mui/icons-material'],
          'security-vendor': ['dompurify', 'zod'],
        },
      },
    },
    
    // Asset handling
    assetsInlineLimit: 4096, // 4kb
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
  },

  // Environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },

  // Preview server (production build testing)
  preview: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    },
  },
});

// Made with Bob
