import React from 'react';
import { styled } from '@mui/material/styles';

/**
 * Visually Hidden Component
 * Hides content visually but keeps it accessible to screen readers
 * WCAG 2.1 Success Criterion 1.3.1 (Info and Relationships)
 * 
 * Use cases:
 * - Form labels that are visually redundant but needed for screen readers
 * - Additional context for icon-only buttons
 * - Skip links and other navigation aids
 */

const HiddenSpan = styled('span')({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
});

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: React.ElementType;
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ 
  children, 
  as = 'span' 
}) => {
  return <HiddenSpan as={as}>{children}</HiddenSpan>;
};

/**
 * Focusable Visually Hidden Component
 * Shows content when focused (useful for skip links)
 */
const FocusableHiddenSpan = styled('span')(({ theme }) => ({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
  
  '&:focus': {
    position: 'static',
    width: 'auto',
    height: 'auto',
    padding: theme.spacing(1),
    margin: 0,
    overflow: 'visible',
    clip: 'auto',
    whiteSpace: 'normal',
  },
}));

export const FocusableVisuallyHidden: React.FC<VisuallyHiddenProps> = ({ 
  children, 
  as = 'span' 
}) => {
  return <FocusableHiddenSpan as={as}>{children}</FocusableHiddenSpan>;
};

// Made with Bob
