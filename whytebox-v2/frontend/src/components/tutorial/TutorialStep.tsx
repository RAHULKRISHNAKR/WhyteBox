/**
 * Tutorial Step Component
 * Displays a single tutorial step with content, actions, and navigation
 */

import React, { useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  Close,
  PlayArrow,
  Code,
  Quiz,
  Info,
  CheckCircle,
  SkipNext,
} from '@mui/icons-material';
import { TutorialStep as TutorialStepType } from '../../types/tutorial';
import { useTutorial } from '../../contexts/TutorialContext';

interface TutorialStepProps {
  step: TutorialStepType;
  stepNumber: number;
  totalSteps: number;
  onComplete?: () => void;
}

const StepIcon: React.FC<{ type: TutorialStepType['type'] }> = ({ type }) => {
  const iconMap = {
    info: <Info />,
    action: <PlayArrow />,
    highlight: <Info />,
    interactive: <PlayArrow />,
    quiz: <Quiz />,
    code: <Code />,
    video: <PlayArrow />,
  };

  return iconMap[type] || <Info />;
};

export const TutorialStep: React.FC<TutorialStepProps> = ({
  step,
  stepNumber,
  totalSteps,
  onComplete,
}) => {
  const {
    nextStep,
    previousStep,
    skipStep,
    exitTutorial,
    completeStep,
    progress,
  } = useTutorial();

  const contentRef = useRef<HTMLDivElement>(null);
  const isCompleted = progress?.completedSteps.includes(step.id) || false;

  // Auto-scroll to top when step changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [step.id]);

  // Handle step completion
  const handleComplete = () => {
    completeStep(step.id);
    if (onComplete) {
      onComplete();
    }
  };

  // Calculate progress percentage
  const progressPercent = ((stepNumber - 1) / totalSteps) * 100;

  return (
    <Card
      sx={{
        maxWidth: 600,
        width: '100%',
        position: 'relative',
        boxShadow: 3,
      }}
    >
      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={progressPercent}
        sx={{ height: 4 }}
      />

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <StepIcon type={step.type} />
          <Typography variant="h6" component="h2">
            {step.title}
          </Typography>
          {isCompleted && (
            <CheckCircle color="success" fontSize="small" />
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`${stepNumber} / ${totalSteps}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <IconButton size="small" onClick={exitTutorial}>
            <Close />
          </IconButton>
        </Stack>
      </Box>

      {/* Content */}
      <CardContent
        ref={contentRef}
        sx={{
          maxHeight: 400,
          overflowY: 'auto',
          p: 3,
        }}
      >
        {/* Main Content */}
        <Typography variant="body1" paragraph>
          {step.content}
        </Typography>

        {/* Image */}
        {step.imageUrl && (
          <Box
            component="img"
            src={step.imageUrl}
            alt={step.title}
            sx={{
              width: '100%',
              borderRadius: 1,
              mb: 2,
            }}
          />
        )}

        {/* Code Snippet */}
        {step.codeSnippet && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              bgcolor: 'grey.900',
              color: 'grey.100',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflow: 'auto',
            }}
          >
            <pre style={{ margin: 0 }}>
              <code>{step.codeSnippet.code}</code>
            </pre>
          </Paper>
        )}

        {/* Quiz */}
        {step.quiz && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              {step.quiz.question}
            </Typography>
            <Stack spacing={1}>
              {step.quiz.options.map((option, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  fullWidth
                  sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => {
                    if (index === step.quiz!.correctAnswer) {
                      handleComplete();
                    }
                  }}
                >
                  {option}
                </Button>
              ))}
            </Stack>
            {step.quiz.explanation && isCompleted && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}
              >
                {step.quiz.explanation}
              </Typography>
            )}
          </Box>
        )}

        {/* Action Instructions */}
        {step.action && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mt: 2,
              bgcolor: 'info.light',
              borderLeft: 4,
              borderColor: 'info.main',
            }}
          >
            <Typography variant="body2" fontWeight="bold">
              Action Required:
            </Typography>
            <Typography variant="body2">
              {step.action.type === 'click' && 'Click on the highlighted element'}
              {step.action.type === 'input' && 'Enter the required information'}
              {step.action.type === 'navigate' && 'Navigate to the specified page'}
              {step.action.type === 'custom' && 'Complete the specified action'}
            </Typography>
          </Paper>
        )}
      </CardContent>

      {/* Footer Navigation */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Button
          startIcon={<NavigateBefore />}
          onClick={previousStep}
          disabled={stepNumber === 1}
        >
          Previous
        </Button>

        <Stack direction="row" spacing={1}>
          {step.canSkip && (
            <Button
              startIcon={<SkipNext />}
              onClick={skipStep}
              color="secondary"
            >
              Skip
            </Button>
          )}
          
          {!step.action && !step.quiz && (
            <Button
              variant="contained"
              endIcon={<NavigateNext />}
              onClick={() => {
                handleComplete();
                nextStep();
              }}
            >
              {stepNumber === totalSteps ? 'Finish' : 'Next'}
            </Button>
          )}
        </Stack>
      </Box>
    </Card>
  );
};

// Made with Bob
