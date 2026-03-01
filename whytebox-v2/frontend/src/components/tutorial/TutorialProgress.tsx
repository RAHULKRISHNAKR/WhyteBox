/**
 * Tutorial Progress Component
 * Displays progress tracking for tutorials
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Timer,
  EmojiEvents,
} from '@mui/icons-material';
import { TutorialProgress as TutorialProgressType, Tutorial } from '../../types/tutorial';

interface TutorialProgressProps {
  tutorial: Tutorial;
  progress: TutorialProgressType | null;
}

export const TutorialProgress: React.FC<TutorialProgressProps> = ({
  tutorial,
  progress,
}) => {
  const completedSteps = progress?.completedSteps.length || 0;
  const totalSteps = tutorial.steps.length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const isCompleted = progress?.status === 'completed';

  // Format time spent
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="h3">
              {tutorial.title}
            </Typography>
            {isCompleted && (
              <Chip
                icon={<CheckCircle />}
                label="Completed"
                color="success"
                size="small"
              />
            )}
          </Box>

          {/* Progress Bar */}
          <Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {completedSteps} / {totalSteps} steps
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>

          {/* Stats */}
          <Stack direction="row" spacing={2}>
            {/* Time Spent */}
            {progress && progress.timeSpent > 0 && (
              <Chip
                icon={<Timer />}
                label={formatTime(progress.timeSpent)}
                size="small"
                variant="outlined"
              />
            )}

            {/* Estimated Time */}
            <Chip
              icon={<Timer />}
              label={`~${tutorial.estimatedTime}m`}
              size="small"
              variant="outlined"
              color="primary"
            />

            {/* Difficulty */}
            <Chip
              label={tutorial.difficulty}
              size="small"
              color={
                tutorial.difficulty === 'beginner'
                  ? 'success'
                  : tutorial.difficulty === 'intermediate'
                  ? 'warning'
                  : 'error'
              }
            />

            {/* Rewards */}
            {tutorial.rewards && tutorial.rewards.points > 0 && (
              <Chip
                icon={<EmojiEvents />}
                label={`${tutorial.rewards.points} pts`}
                size="small"
                color="warning"
              />
            )}
          </Stack>

          {/* Step Indicators */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Steps
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {tutorial.steps.map((step, index) => {
                const isStepCompleted = progress?.completedSteps.includes(step.id);
                const isCurrent = progress?.currentStepId === step.id;

                return (
                  <Tooltip key={step.id} title={step.title}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        fontSize: '0.875rem',
                        bgcolor: isStepCompleted
                          ? 'success.main'
                          : isCurrent
                          ? 'primary.main'
                          : 'grey.300',
                        color: isStepCompleted || isCurrent ? 'white' : 'text.secondary',
                        border: isCurrent ? 2 : 0,
                        borderColor: 'primary.dark',
                      }}
                    >
                      {isStepCompleted ? (
                        <CheckCircle fontSize="small" />
                      ) : (
                        index + 1
                      )}
                    </Avatar>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>

          {/* Score (if available) */}
          {progress?.score !== undefined && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Score
              </Typography>
              <Typography variant="h4" color="primary">
                {progress.score}%
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

// Made with Bob
