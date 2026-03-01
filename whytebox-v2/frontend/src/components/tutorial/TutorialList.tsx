/**
 * Tutorial List Component
 * Displays a list of available tutorials with filtering and search
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  PlayArrow,
  Timer,
  CheckCircle,
  Lock,
  EmojiEvents,
} from '@mui/icons-material';
import { Tutorial, TutorialFilter } from '../../types/tutorial';
import { useTutorial } from '../../contexts/TutorialContext';

interface TutorialListProps {
  tutorials: Tutorial[];
  onStartTutorial?: (tutorialId: string) => void;
}

export const TutorialList: React.FC<TutorialListProps> = ({
  tutorials,
  onStartTutorial,
}) => {
  const { startTutorial, getProgress } = useTutorial();
  const [filter, setFilter] = useState<TutorialFilter>({});

  // Filter tutorials
  const filteredTutorials = useMemo(() => {
    return tutorials.filter((tutorial) => {
      // Search query
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matchesTitle = tutorial.title.toLowerCase().includes(query);
        const matchesDescription = tutorial.description.toLowerCase().includes(query);
        const matchesTags = tutorial.tags.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesDescription && !matchesTags) {
          return false;
        }
      }

      // Category filter
      if (filter.category && tutorial.category !== filter.category) {
        return false;
      }

      // Difficulty filter
      if (filter.difficulty && tutorial.difficulty !== filter.difficulty) {
        return false;
      }

      // Status filter
      if (filter.status) {
        const progress = getProgress(tutorial.id);
        const status = progress?.status || 'not_started';
        if (status !== filter.status) {
          return false;
        }
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        const hasAllTags = filter.tags.every((tag) =>
          tutorial.tags.includes(tag)
        );
        if (!hasAllTags) {
          return false;
        }
      }

      return true;
    });
  }, [tutorials, filter, getProgress]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(tutorials.map((t) => t.category));
    return Array.from(cats);
  }, [tutorials]);

  const handleStartTutorial = (tutorialId: string) => {
    if (onStartTutorial) {
      onStartTutorial(tutorialId);
    } else {
      startTutorial(tutorialId);
    }
  };

  return (
    <Box>
      {/* Filters */}
      <Stack spacing={2} mb={3}>
        <TextField
          placeholder="Search tutorials..."
          value={filter.searchQuery || ''}
          onChange={(e) =>
            setFilter({ ...filter, searchQuery: e.target.value })
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          fullWidth
        />

        <Stack direction="row" spacing={2}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={filter.category || ''}
              label="Category"
              onChange={(e) =>
                setFilter({ ...filter, category: e.target.value || undefined })
              }
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Difficulty</InputLabel>
            <Select
              value={filter.difficulty || ''}
              label="Difficulty"
              onChange={(e) =>
                setFilter({
                  ...filter,
                  difficulty: e.target.value as any || undefined,
                })
              }
            >
              <MenuItem value="">All Levels</MenuItem>
              <MenuItem value="beginner">Beginner</MenuItem>
              <MenuItem value="intermediate">Intermediate</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filter.status || ''}
              label="Status"
              onChange={(e) =>
                setFilter({
                  ...filter,
                  status: e.target.value as any || undefined,
                })
              }
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="not_started">Not Started</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {/* Tutorial Grid */}
      <Grid container spacing={3}>
        {filteredTutorials.map((tutorial) => {
          const progress = getProgress(tutorial.id);
          const isCompleted = progress?.status === 'completed';
          const isInProgress = progress?.status === 'in_progress';
          const completedSteps = progress?.completedSteps.length || 0;
          const totalSteps = tutorial.steps.length;
          const progressPercent =
            totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

          // Check if prerequisites are met
          const prerequisitesMet = !tutorial.prerequisites || 
            tutorial.prerequisites.every((prereqId) => {
              const prereqProgress = getProgress(prereqId);
              return prereqProgress?.status === 'completed';
            });

          return (
            <Grid item xs={12} sm={6} md={4} key={tutorial.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  opacity: prerequisitesMet ? 1 : 0.6,
                }}
              >
                {/* Progress indicator */}
                {isInProgress && (
                  <LinearProgress
                    variant="determinate"
                    value={progressPercent}
                    sx={{ height: 4 }}
                  />
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Status Badge */}
                  {isCompleted && (
                    <Chip
                      icon={<CheckCircle />}
                      label="Completed"
                      color="success"
                      size="small"
                      sx={{ position: 'absolute', top: 16, right: 16 }}
                    />
                  )}
                  {!prerequisitesMet && (
                    <Chip
                      icon={<Lock />}
                      label="Locked"
                      size="small"
                      sx={{ position: 'absolute', top: 16, right: 16 }}
                    />
                  )}

                  {/* Title */}
                  <Typography variant="h6" component="h3" gutterBottom>
                    {tutorial.title}
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
                    {tutorial.description}
                  </Typography>

                  {/* Metadata */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
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
                    <Chip
                      icon={<Timer />}
                      label={`${tutorial.estimatedTime}m`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${totalSteps} steps`}
                      size="small"
                      variant="outlined"
                    />
                    {tutorial.rewards && tutorial.rewards.points > 0 && (
                      <Chip
                        icon={<EmojiEvents />}
                        label={`${tutorial.rewards.points} pts`}
                        size="small"
                        color="warning"
                      />
                    )}
                  </Stack>

                  {/* Tags */}
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {tutorial.tags.slice(0, 3).map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                    {tutorial.tags.length > 3 && (
                      <Chip
                        label={`+${tutorial.tags.length - 3}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    )}
                  </Stack>
                </CardContent>

                <CardActions>
                  <Button
                    fullWidth
                    variant={isInProgress ? 'contained' : 'outlined'}
                    startIcon={<PlayArrow />}
                    onClick={() => handleStartTutorial(tutorial.id)}
                    disabled={!prerequisitesMet}
                  >
                    {isCompleted
                      ? 'Review'
                      : isInProgress
                      ? 'Continue'
                      : 'Start Tutorial'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* No results */}
      {filteredTutorials.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tutorials found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters or search query
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Made with Bob
