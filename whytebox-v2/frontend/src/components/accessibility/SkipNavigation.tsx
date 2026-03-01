import React from 'react';
import { styled } from '@mui/material/styles';

/**
 * Skip Navigation Component
 * Provides keyboard users a way to skip repetitive navigation
 * WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks)
 */

const SkipLink = styled('a')(({ theme }) => ({
  position: 'absolute',
  left: '-9999px',
  zIndex: 9999,
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  textDecoration: 'none',
  borderRadius: theme.shape.borderRadius,
  fontWeight: 600,
  
  '&:focus': {
    left: theme.spacing(2),
    top: theme.spacing(2),
    outline: `3px solid ${theme.palette.primary.dark}`,
    outlineOffset: '2px',
  },
}));

interface SkipNavigationProps {
  targetId?: string;
  label?: string;
}

export const SkipNavigation: React.FC<SkipNavigationProps> = ({ 
  targetId = 'main-content',
  label = 'Skip to main content'
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <SkipLink 
      href={`#${targetId}`}
      onClick={handleClick}
    >
      {label}
    </SkipLink>
  );
};

/**
 * Main Content Wrapper
 * Provides the target for skip navigation
 */
interface MainContentProps {
  children: React.ReactNode;
  id?: string;
}

export const MainContent: React.FC<MainContentProps> = ({ 
  children, 
  id = 'main-content' 
}) => {
  return (
    <main 
      id={id} 
      tabIndex={-1}
      style={{ outline: 'none' }}
    >
      {children}
    </main>
  );
};

// Made with Bob
