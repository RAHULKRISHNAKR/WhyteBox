/**
 * PathCard Component
 * Displays learning path information in a card format
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  LinearProgress,
  Tooltip,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  CheckCircle as CompletedIcon,
  School as CertificateIcon,
  AccessTime as TimeIcon,
  TrendingUp as SkillIcon,
} from '@mui/icons-material';
import { LearningPath, PathProgress } from '../../types/learningPath';

interface PathCardProps {
  path: LearningPath;
  progress?: PathProgress;
  onEnroll: (path: LearningPath) => void;
  onContinue?: (path: LearningPath) => void;
}

export const PathCard: React.FC<PathCardProps> = ({
  path,
  progress,
  onEnroll,
  onContinue,
}) => {
  // Calculate completion percentage
  const getCompletionPercentage = (): number => {
    if (!progress) return 0;
    
    const totalItems = Array.from(progress.milestoneProgress.values()).reduce(
      (sum, m) => sum + m.totalItems,
      0
    );
    const completedItems = Array.from(progress.milestoneProgress.values()).reduce(
      (sum, m) => sum + m.completedItems.size,
      0
    );
    
    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  };

  // Get difficulty color
  const getDifficultyColor = () => {
    switch (path.difficulty) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'primary';
      case 'advanced':
        return 'warning';
      case 'expert':
        return 'error';
      default:
        return 'default';
    }
  };

  const completionPercentage = getCompletionPercentage();
  const isEnrolled = !!progress;
  const isCompleted = progress?.status === 'completed';

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Chip
            label={path.difficulty}
            size="small"
            color={getDifficultyColor()}
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {path.certificateAvailable && (
              <Tooltip title="Certificate available">
                <CertificateIcon color="warning" fontSize="small" />
              </Tooltip>
            )}
            {isCompleted && (
              <Tooltip title="Completed">
                <CompletedIcon color="success" fontSize="small" />
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Title */}
        <Typography variant="h6" gutterBottom>
          {path.title}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {path.description}
        </Typography>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TimeIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {path.estimatedHours}h
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {path.milestones.length} milestones
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar (if enrolled) */}
        {isEnrolled && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Math.round(completionPercentage)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={completionPercentage}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* Skills */}
        {path.skills.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <SkillIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Skills you'll learn:
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {path.skills.slice(0, 3).map((skill) => (
                <Chip key={skill} label={skill} size="small" variant="outlined" />
              ))}
              {path.skills.length > 3 && (
                <Chip
                  label={`+${path.skills.length - 3}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}

        {/* Tags */}
        {path.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {path.tags.slice(0, 2).map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        {isEnrolled ? (
          <Button
            fullWidth
            variant={isCompleted ? 'outlined' : 'contained'}
            startIcon={isCompleted ? <CompletedIcon /> : <StartIcon />}
            onClick={() => onContinue?.(path)}
          >
            {isCompleted ? 'Review Path' : 'Continue Learning'}
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            startIcon={<StartIcon />}
            onClick={() => onEnroll(path)}
          >
            Start Learning
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

// Made with Bob
