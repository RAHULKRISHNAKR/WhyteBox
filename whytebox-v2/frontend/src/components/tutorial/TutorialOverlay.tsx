/**
 * Tutorial Overlay Component
 * Provides spotlight effect on highlighted elements and displays tutorial steps
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Portal, Fade } from '@mui/material';
import { useTutorial } from '../../contexts/TutorialContext';
import { TutorialStep } from './TutorialStep';

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const TutorialOverlay: React.FC = () => {
  const {
    isActive,
    showOverlay,
    currentStep,
    currentStepIndex,
    currentTutorial,
    highlightedElement,
  } = useTutorial();

  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [stepPosition, setStepPosition] = useState<{ top: number; left: number }>({
    top: 100,
    left: 100,
  });

  // Calculate highlight rectangle for the target element
  const updateHighlight = useCallback(() => {
    if (!highlightedElement) {
      setHighlightRect(null);
      return;
    }

    const element = document.querySelector(highlightedElement);
    if (!element) {
      setHighlightRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = 8;

    setHighlightRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // Position tutorial step based on highlighted element and step position preference
    const position = currentStep?.position || 'right';
    const stepWidth = 600;
    const stepHeight = 500;
    const margin = 20;

    let top = rect.top;
    let left = rect.right + margin;

    switch (position) {
      case 'top':
        top = rect.top - stepHeight - margin;
        left = rect.left + rect.width / 2 - stepWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + margin;
        left = rect.left + rect.width / 2 - stepWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - stepHeight / 2;
        left = rect.left - stepWidth - margin;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - stepHeight / 2;
        left = rect.right + margin;
        break;
      case 'center':
        top = window.innerHeight / 2 - stepHeight / 2;
        left = window.innerWidth / 2 - stepWidth / 2;
        break;
    }

    // Ensure step stays within viewport
    top = Math.max(20, Math.min(top, window.innerHeight - stepHeight - 20));
    left = Math.max(20, Math.min(left, window.innerWidth - stepWidth - 20));

    setStepPosition({ top, left });
  }, [highlightedElement, currentStep]);

  // Update highlight on mount, step change, and window resize
  useEffect(() => {
    if (isActive && showOverlay) {
      updateHighlight();

      const handleResize = () => updateHighlight();
      const handleScroll = () => updateHighlight();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isActive, showOverlay, updateHighlight]);

  // Scroll highlighted element into view
  useEffect(() => {
    if (highlightedElement && isActive) {
      const element = document.querySelector(highlightedElement);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }
    }
  }, [highlightedElement, isActive]);

  if (!isActive || !showOverlay || !currentStep || !currentTutorial) {
    return null;
  }

  const totalSteps = currentTutorial.steps.length;

  return (
    <Portal>
      <Fade in={showOverlay}>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {/* Dark Overlay with Spotlight */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              pointerEvents: 'auto',
            }}
          >
            {/* Spotlight cutout */}
            {highlightRect && (
              <Box
                sx={{
                  position: 'absolute',
                  top: highlightRect.top,
                  left: highlightRect.left,
                  width: highlightRect.width,
                  height: highlightRect.height,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                  borderRadius: 1,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  pointerEvents: 'none',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': {
                      borderColor: 'primary.main',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px rgba(25, 118, 210, 0.5)',
                    },
                    '50%': {
                      borderColor: 'primary.light',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 30px rgba(25, 118, 210, 0.8)',
                    },
                  },
                }}
              />
            )}
          </Box>

          {/* Tutorial Step Card */}
          <Box
            sx={{
              position: 'absolute',
              top: stepPosition.top,
              left: stepPosition.left,
              pointerEvents: 'auto',
              zIndex: 10000,
            }}
          >
            <TutorialStep
              step={currentStep}
              stepNumber={currentStepIndex + 1}
              totalSteps={totalSteps}
            />
          </Box>
        </Box>
      </Fade>
    </Portal>
  );
};

// Made with Bob
