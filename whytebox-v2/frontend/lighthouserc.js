/**
 * Lighthouse CI Configuration
 * Defines performance budgets and assertions for CI/CD pipeline
 */

module.exports = {
  ci: {
    collect: {
      // Start the preview server
      startServerCommand: 'npm run preview',
      
      // URLs to test
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/tutorials',
        'http://localhost:4173/quizzes',
        'http://localhost:4173/visualization',
      ],
      
      // Number of runs for each URL
      numberOfRuns: 3,
      
      // Lighthouse settings
      settings: {
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
      },
    },
    
    assert: {
      assertions: {
        // Performance assertions
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        
        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 204800 }], // 200KB
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 51200 }], // 50KB
        'resource-summary:image:size': ['error', { maxNumericValue: 512000 }], // 500KB
        'resource-summary:font:size': ['error', { maxNumericValue: 102400 }], // 100KB
        'resource-summary:total:size': ['error', { maxNumericValue: 1048576 }], // 1MB
        
        // Network requests
        'network-requests': ['warn', { maxNumericValue: 50 }],
        'uses-http2': 'error',
        'uses-long-cache-ttl': 'warn',
        'uses-optimized-images': 'warn',
        'uses-text-compression': 'error',
        'uses-responsive-images': 'warn',
        
        // JavaScript
        'bootup-time': ['warn', { maxNumericValue: 3000 }],
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 3000 }],
        'dom-size': ['warn', { maxNumericValue: 1500 }],
        
        // Best practices
        'errors-in-console': 'warn',
        'no-vulnerable-libraries': 'error',
        'uses-passive-event-listeners': 'warn',
        'no-document-write': 'error',
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'button-name': 'error',
        'aria-valid-attr': 'error',
        'aria-required-attr': 'error',
        
        // SEO
        'meta-description': 'warn',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
      },
    },
    
    upload: {
      // Upload results to temporary public storage
      target: 'temporary-public-storage',
      
      // Or upload to Lighthouse CI server
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
      // token: process.env.LHCI_TOKEN,
    },
  },
};

// Made with Bob
