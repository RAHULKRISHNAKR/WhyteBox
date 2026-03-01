/**
 * Code Example Card Component
 * Displays a code example in a card format with metadata
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Stack,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow,
  Code,
  Timer,
  CheckCircle,
  Lock,
  Bookmark,
  BookmarkBorder,
} from '@mui/icons-material';
import { CodeExample, CodeChallenge } from '../../types/codeExample';

interface CodeExampleCardProps {
  example: CodeExample | CodeChallenge;
  onOpen: (id: string) => void;
  onRun?: (id: string) => void;
  isCompleted?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
  showActions?: boolean;
}

const difficultyColors = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'error',
} as const;

const categoryLabels: Record<string, string> = {
  gradcam: 'Grad-CAM',
  saliency: 'Saliency Maps',
  'integrated-gradients': 'Integrated Gradients',
  'model-loading': 'Model Loading',
  preprocessing: 'Preprocessing',
  inference: 'Inference',
  visualization: 'Visualization',
  general: 'General',
};

export const CodeExampleCard: React.FC<CodeExampleCardProps> = ({
  example,
  onOpen,
  onRun,
  isCompleted = false,
  isBookmarked = false,
  onToggleBookmark,
  showActions = true,
}) => {
  const isChallenge = 'points' in example;
  const challenge = isChallenge ? (example as CodeChallenge) : null;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&:hover': {
          boxShadow: 6,
        },
      }}
    >
      {/* Completion Badge */}
      {isCompleted && (
        <Chip
          icon={<CheckCircle />}
          label="Completed"
          color="success"
          size="small"
          sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}
        />
      )}

      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
          <Chip
            label={example.language.toUpperCase()}
            size="small"
            variant="outlined"
            icon={<Code />}
          />
          <Chip
            label={example.difficulty}
            size="small"
            color={difficultyColors[example.difficulty]}
          />
          {isChallenge && (
            <Chip
              label={`${challenge!.points} pts`}
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          {example.hasTests && (
            <Chip label="Tests" size="small" variant="outlined" />
          )}
        </Stack>

        {/* Title */}
        <Typography variant="h6" component="h3" gutterBottom>
          {example.title}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          paragraph
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {example.description}
        </Typography>

        {/* Metadata */}
        <Stack direction="row" spacing={2} mb={2}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Timer fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {example.estimatedTime} min
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {categoryLabels[example.category] || example.category}
          </Typography>
        </Stack>

        {/* Tags */}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {example.tags.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          ))}
          {example.tags.length > 3 && (
            <Chip
              label={`+${example.tags.length - 3}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          )}
        </Stack>

        {/* Prerequisites */}
        {example.prerequisites && example.prerequisites.length > 0 && (
          <Box mt={2}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Lock fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Requires: {example.prerequisites.length} prerequisite(s)
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Challenge Info */}
        {isChallenge && challenge && (
          <Box
            mt={2}
            p={1}
            bgcolor="warning.light"
            borderRadius={1}
            border={1}
            borderColor="warning.main"
          >
            <Typography variant="caption" fontWeight="bold">
              🏆 Challenge
            </Typography>
            {challenge.hints && challenge.hints.length > 0 && (
              <Typography variant="caption" display="block">
                {challenge.hints.length} hint(s) available
              </Typography>
            )}
            {challenge.maxAttempts && (
              <Typography variant="caption" display="block">
                Max attempts: {challenge.maxAttempts}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>

      {/* Actions */}
      {showActions && (
        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<Code />}
              onClick={() => onOpen(example.id)}
              size="small"
            >
              {isChallenge ? 'Start Challenge' : 'View Code'}
            </Button>
            {example.isExecutable && onRun && (
              <Button
                variant="outlined"
                startIcon={<PlayArrow />}
                onClick={() => onRun(example.id)}
                size="small"
              >
                Run
              </Button>
            )}
          </Stack>

          {onToggleBookmark && (
            <Tooltip title={isBookmarked ? 'Remove Bookmark' : 'Bookmark'}>
              <IconButton
                size="small"
                onClick={() => onToggleBookmark(example.id)}
              >
                {isBookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
              </IconButton>
            </Tooltip>
          )}
        </CardActions>
      )}
    </Card>
  );
};

// Made with Bob
