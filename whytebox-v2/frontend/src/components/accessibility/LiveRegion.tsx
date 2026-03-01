import React, { useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';

/**
 * Live Region Component
 * Announces dynamic content changes to screen readers
 * WCAG 2.1 Success Criterion 4.1.3 (Status Messages)
 * 
 * Use cases:
 * - Form validation messages
 * - Loading states
 * - Success/error notifications
 * - Dynamic content updates
 */

type AriaLive = 'off' | 'polite' | 'assertive';
type AriaAtomic = boolean;
type AriaRelevant = 'additions' | 'removals' | 'text' | 'all' | 'additions text' | 'additions removals' | 'removals additions' | 'removals text' | 'text additions' | 'text removals';

interface LiveRegionProps {
  children: React.ReactNode;
  'aria-live'?: AriaLive;
  'aria-atomic'?: AriaAtomic;
  'aria-relevant'?: AriaRelevant;
  role?: string;
  className?: string;
}

const StyledLiveRegion = styled('div')({
  position: 'absolute',
  left: '-10000px',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
});

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  'aria-live': ariaLive = 'polite',
  'aria-atomic': ariaAtomic = true,
  'aria-relevant': ariaRelevant = 'additions text',
  role,
  className,
}) => {
  return (
    <StyledLiveRegion
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      aria-relevant={ariaRelevant}
      role={role}
      className={className}
    >
      {children}
    </StyledLiveRegion>
  );
};

/**
 * Status Message Component
 * For non-critical status updates (polite)
 */
export const StatusMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <LiveRegion aria-live="polite" role="status">
      {children}
    </LiveRegion>
  );
};

/**
 * Alert Message Component
 * For important, time-sensitive messages (assertive)
 */
export const AlertMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <LiveRegion aria-live="assertive" role="alert">
      {children}
    </LiveRegion>
  );
};

/**
 * Hook for announcing messages to screen readers
 */
interface UseAnnouncerOptions {
  politeness?: AriaLive;
  clearDelay?: number;
}

export const useAnnouncer = (options: UseAnnouncerOptions = {}) => {
  const { politeness = 'polite', clearDelay = 5000 } = options;
  const [message, setMessage] = React.useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = (text: string) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set the message
    setMessage(text);

    // Clear the message after delay
    if (clearDelay > 0) {
      timeoutRef.current = setTimeout(() => {
        setMessage('');
      }, clearDelay);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const AnnouncerComponent = () => (
    <LiveRegion aria-live={politeness}>
      {message}
    </LiveRegion>
  );

  return { announce, Announcer: AnnouncerComponent };
};

/**
 * Loading Announcer Component
 * Announces loading states to screen readers
 */
interface LoadingAnnouncerProps {
  isLoading: boolean;
  loadingMessage?: string;
  completeMessage?: string;
}

export const LoadingAnnouncer: React.FC<LoadingAnnouncerProps> = ({
  isLoading,
  loadingMessage = 'Loading...',
  completeMessage = 'Content loaded',
}) => {
  const [message, setMessage] = React.useState('');

  useEffect(() => {
    if (isLoading) {
      setMessage(loadingMessage);
    } else if (message === loadingMessage) {
      setMessage(completeMessage);
      // Clear the complete message after a delay
      const timeout = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, loadingMessage, completeMessage, message]);

  if (!message) return null;

  return (
    <LiveRegion aria-live="polite" role="status">
      {message}
    </LiveRegion>
  );
};

/**
 * Form Error Announcer Component
 * Announces form validation errors
 */
interface FormErrorAnnouncerProps {
  errors: string[];
  errorCount?: number;
}

export const FormErrorAnnouncer: React.FC<FormErrorAnnouncerProps> = ({
  errors,
  errorCount,
}) => {
  const message = React.useMemo(() => {
    if (errors.length === 0) return '';
    
    const count = errorCount || errors.length;
    const plural = count === 1 ? 'error' : 'errors';
    return `Form has ${count} ${plural}. ${errors.join('. ')}`;
  }, [errors, errorCount]);

  if (!message) return null;

  return (
    <LiveRegion aria-live="assertive" role="alert">
      {message}
    </LiveRegion>
  );
};

// Made with Bob
