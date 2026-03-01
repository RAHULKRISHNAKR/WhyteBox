/**
 * Web Vitals Tracking Utility
 * Measures and reports Core Web Vitals metrics
 */

import type { Metric } from 'web-vitals';

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

/**
 * Thresholds for Core Web Vitals (in milliseconds)
 * Based on Google's recommendations
 */
const THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },      // First Contentful Paint
  LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint
  FID: { good: 100, poor: 300 },        // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 },      // Time to First Byte
  INP: { good: 200, poor: 500 },        // Interaction to Next Paint
};

/**
 * Get rating for a metric based on its value
 */
function getRating(
  name: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Format metric for reporting
 */
function formatMetric(metric: Metric): WebVitalsMetric {
  return {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  };
}

/**
 * Send metric to analytics
 */
function sendToAnalytics(metric: WebVitalsMetric) {
  // Send to Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.value),
      metric_rating: metric.rating,
      non_interaction: true,
    });
  }

  // Send to custom analytics endpoint
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
      keepalive: true,
    }).catch((error) => {
      console.error('Failed to send web vitals:', error);
    });
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: `${metric.value.toFixed(2)}ms`,
      rating: metric.rating,
      delta: `${metric.delta.toFixed(2)}ms`,
    });
  }
}

/**
 * Report Web Vitals metrics
 * Call this function in your app's entry point
 */
export async function reportWebVitals(onPerfEntry?: (metric: WebVitalsMetric) => void) {
  if (typeof window === 'undefined') return;

  try {
    // Dynamically import web-vitals to reduce initial bundle size
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    const handleMetric = (metric: Metric) => {
      const formattedMetric = formatMetric(metric);
      
      // Send to analytics
      sendToAnalytics(formattedMetric);
      
      // Call custom callback if provided
      if (onPerfEntry && typeof onPerfEntry === 'function') {
        onPerfEntry(formattedMetric);
      }
    };

    // Measure all Core Web Vitals
    onCLS(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric);
  } catch (error) {
    console.error('Failed to load web-vitals:', error);
  }
}

/**
 * Get performance metrics summary
 */
export function getPerformanceMetrics() {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');

  return {
    // Navigation timing
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    ttfb: navigation.responseStart - navigation.requestStart,
    download: navigation.responseEnd - navigation.responseStart,
    domInteractive: navigation.domInteractive - navigation.fetchStart,
    domComplete: navigation.domComplete - navigation.fetchStart,
    loadComplete: navigation.loadEventEnd - navigation.fetchStart,

    // Paint timing
    fcp: paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime || 0,
    
    // Resource timing
    resources: performance.getEntriesByType('resource').length,
    
    // Memory (if available)
    memory: (performance as any).memory
      ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        }
      : null,
  };
}

/**
 * Monitor long tasks (tasks > 50ms)
 */
export function monitorLongTasks(callback: (duration: number) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          callback(entry.duration);
          
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[Long Task] ${entry.duration.toFixed(2)}ms`, entry);
          }
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    
    return () => observer.disconnect();
  } catch (error) {
    console.error('Failed to observe long tasks:', error);
  }
}

/**
 * Monitor layout shifts
 */
export function monitorLayoutShifts(callback: (shift: number) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if ((entry as any).hadRecentInput) continue;
        
        const shift = (entry as any).value;
        if (shift > 0.1) {
          callback(shift);
          
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[Layout Shift] ${shift.toFixed(4)}`, entry);
          }
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    
    return () => observer.disconnect();
  } catch (error) {
    console.error('Failed to observe layout shifts:', error);
  }
}

/**
 * Get resource timing for specific resource types
 */
export function getResourceTiming(type?: string) {
  if (typeof window === 'undefined' || !window.performance) {
    return [];
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  if (type) {
    return resources.filter((resource) => resource.initiatorType === type);
  }
  
  return resources;
}

/**
 * Clear performance marks and measures
 */
export function clearPerformanceData() {
  if (typeof window === 'undefined' || !window.performance) {
    return;
  }

  performance.clearMarks();
  performance.clearMeasures();
  performance.clearResourceTimings();
}

/**
 * Create a performance mark
 */
export function mark(name: string) {
  if (typeof window === 'undefined' || !window.performance) {
    return;
  }

  performance.mark(name);
}

/**
 * Measure performance between two marks
 */
export function measure(name: string, startMark: string, endMark?: string) {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }

  try {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name, 'measure')[0];
    return measure ? measure.duration : null;
  } catch (error) {
    console.error('Failed to measure performance:', error);
    return null;
  }
}

// Made with Bob
