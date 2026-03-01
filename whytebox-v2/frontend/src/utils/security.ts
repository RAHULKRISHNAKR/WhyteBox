/**
 * Security Utilities
 * 
 * OWASP Top 10 2021 compliance utilities
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * OWASP A03:2021 - Injection
 *
 * @param dirty - Untrusted HTML content
 * @param config - DOMPurify configuration
 * @returns Sanitized HTML
 */
export function sanitizeHtml(
  dirty: string,
  config?: any
): string {
  const result = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    ...config,
  });
  return String(result);
}

/**
 * Sanitize user input for display
 * 
 * @param input - User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validate email format
 * 
 * @param email - Email address to validate
 * @returns Whether email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL format and protocol
 * OWASP A10:2021 - SSRF
 * 
 * @param url - URL to validate
 * @param allowedProtocols - Allowed URL protocols
 * @returns Whether URL is valid and safe
 */
export function isValidUrl(
  url: string,
  allowedProtocols: string[] = ['http:', 'https:']
): boolean {
  try {
    const parsed = new URL(url);
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate file upload
 * 
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Generate secure random string
 * 
 * @param length - Length of random string
 * @returns Random string
 */
export function generateSecureRandom(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash string using SHA-256
 * 
 * @param input - String to hash
 * @returns Hashed string
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate password strength
 * OWASP A07:2021 - Identification and Authentication Failures
 * 
 * @param password - Password to validate
 * @returns Validation result with strength score
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number; // 0-4
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Minimum length
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score++;
  }

  // Contains lowercase
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain lowercase letters');
  } else {
    score++;
  }

  // Contains uppercase
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain uppercase letters');
  } else {
    score++;
  }

  // Contains numbers
  if (!/\d/.test(password)) {
    feedback.push('Password must contain numbers');
  } else {
    score++;
  }

  // Contains special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('Password must contain special characters');
  } else {
    score++;
  }

  // Check for common patterns
  const commonPatterns = [
    /^123456/,
    /^password/i,
    /^qwerty/i,
    /^abc123/i,
  ];

  if (commonPatterns.some((pattern) => pattern.test(password))) {
    feedback.push('Password contains common patterns');
    score = Math.max(0, score - 2);
  }

  return {
    valid: score >= 4 && password.length >= 8,
    score: Math.min(4, score),
    feedback,
  };
}

/**
 * Secure token storage in sessionStorage
 * OWASP A02:2021 - Cryptographic Failures
 * 
 * @param key - Storage key
 * @param value - Value to store
 */
export function secureStore(key: string, value: string): void {
  try {
    // Use sessionStorage instead of localStorage for sensitive data
    sessionStorage.setItem(key, value);
  } catch (error) {
    console.error('Failed to store data securely:', error);
  }
}

/**
 * Retrieve securely stored token
 * 
 * @param key - Storage key
 * @returns Stored value or null
 */
export function secureRetrieve(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error('Failed to retrieve data securely:', error);
    return null;
  }
}

/**
 * Clear secure storage
 * 
 * @param key - Storage key (optional, clears all if not provided)
 */
export function secureClear(key?: string): void {
  try {
    if (key) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.clear();
    }
  } catch (error) {
    console.error('Failed to clear secure storage:', error);
  }
}

/**
 * Rate limiting tracker
 * OWASP A05:2021 - Security Misconfiguration
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  /**
   * Check if action is rate limited
   * 
   * @param key - Unique identifier for the action
   * @param maxAttempts - Maximum attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns Whether action is allowed
   */
  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter((time) => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return false;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }

  /**
   * Reset rate limit for a key
   * 
   * @param key - Unique identifier
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.attempts.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Escape HTML entities
 * 
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Check if running in secure context (HTTPS)
 * 
 * @returns Whether context is secure
 */
export function isSecureContext(): boolean {
  return window.isSecureContext;
}

/**
 * Validate JWT token format (basic check)
 * 
 * @param token - JWT token
 * @returns Whether token format is valid
 */
export function isValidJwtFormat(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Content Security Policy violation reporter
 * 
 * @param violation - CSP violation event
 */
export function reportCspViolation(violation: SecurityPolicyViolationEvent): void {
  console.error('CSP Violation:', {
    blockedURI: violation.blockedURI,
    violatedDirective: violation.violatedDirective,
    originalPolicy: violation.originalPolicy,
    sourceFile: violation.sourceFile,
    lineNumber: violation.lineNumber,
  });

  // Send to monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to monitoring service
  }
}

/**
 * Initialize CSP violation reporting
 */
export function initCspReporting(): void {
  document.addEventListener('securitypolicyviolation', reportCspViolation);
}

// Made with Bob
