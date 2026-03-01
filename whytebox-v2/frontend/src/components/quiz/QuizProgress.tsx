/**
 * QuizProgress Component
 * Displays quiz progress with navigation and statistics
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material';
import { useQuiz } from '../../contexts/QuizContext';

interface QuizProgressProps {
  showNavigation?: boolean;
}

export const QuizProgress: React.FC<QuizProgressProps> = ({
  showNavigation = true,
}) => {
  const {
    currentQuiz,
    progress,
    getQuestionProgress,
    getTimeElapsed,
    goToQuestion,
    nextQuestion,
    previousQuestion,
  } = useQuiz();

  if (!currentQuiz || !progress) {
    return null;
  }

  const { current, total } = getQuestionProgress();
  const progressPercentage = (progress.answeredQuestions.size / total) * 100;
  const timeElapsed = getTimeElapsed();

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get question status
  const getQuestionStatus = (index: number) => {
    const question = currentQuiz.questions[index];
    const isAnswered = progress.answeredQuestions.has(question.id);
    const isBookmarked = progress.bookmarked.has(question.id);
    const isCurrent = index === progress.currentQuestionIndex;

    return { isAnswered, isBookmarked, isCurrent };
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      {/* Header Stats */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon color="success" />
            <Typography variant="body2">
              <strong>{progress.answeredQuestions.size}</strong> / {total} answered
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimerIcon color="primary" />
            <Typography variant="body2">
              <strong>{formatTime(timeElapsed)}</strong>
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BookmarkIcon color="warning" />
            <Typography variant="body2">
              <strong>{progress.bookmarked.size}</strong> bookmarked
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Progress Bar */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Overall Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Math.round(progressPercentage)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {/* Question Navigation */}
      {showNavigation && (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Question {current} of {total}
          </Typography>
          
          {/* Question Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
              gap: 1,
              mb: 2,
            }}
          >
            {currentQuiz.questions.map((question, index) => {
              const { isAnswered, isBookmarked, isCurrent } = getQuestionStatus(index);
              
              return (
                <Tooltip
                  key={question.id}
                  title={`Question ${index + 1}${isAnswered ? ' (Answered)' : ''}${
                    isBookmarked ? ' (Bookmarked)' : ''
                  }`}
                >
                  <Chip
                    label={index + 1}
                    onClick={() => goToQuestion(index)}
                    color={isCurrent ? 'primary' : isAnswered ? 'success' : 'default'}
                    variant={isCurrent ? 'filled' : 'outlined'}
                    size="small"
                    icon={
                      isBookmarked ? (
                        <BookmarkIcon fontSize="small" />
                      ) : isAnswered ? (
                        <CheckIcon fontSize="small" />
                      ) : (
                        <UncheckedIcon fontSize="small" />
                      )
                    }
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'scale(1.1)',
                      },
                      transition: 'transform 0.2s',
                    }}
                  />
                </Tooltip>
              );
            })}
          </Box>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <IconButton
              onClick={previousQuestion}
              disabled={current === 1}
              color="primary"
            >
              <PrevIcon />
            </IconButton>
            
            <Typography variant="body2" sx={{ alignSelf: 'center' }}>
              Navigate between questions
            </Typography>
            
            <IconButton
              onClick={nextQuestion}
              disabled={current === total}
              color="primary"
            >
              <NextIcon />
            </IconButton>
          </Box>
        </>
      )}

      {/* Estimated Time Remaining */}
      {currentQuiz.estimatedTime && (
        <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Estimated time: {currentQuiz.estimatedTime} minutes
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

// Made with Bob
