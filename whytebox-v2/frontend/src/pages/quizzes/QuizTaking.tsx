/**
 * QuizTaking Page
 * Page for taking a quiz with question navigation and progress tracking
 */

import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Send as SubmitIcon,
  ExitToApp as ExitIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuiz } from '../../contexts/QuizContext';
import { QuestionCard, QuizProgress, QuizResults } from '../../components/quiz';
import { getQuizById } from '../../data/quizzes';

export const QuizTaking: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const {
    currentQuiz,
    currentQuestion,
    currentAttempt,
    progress,
    startQuiz,
    submitQuiz,
    exitQuiz,
    getQuestionProgress,
  } = useQuiz();

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load quiz on mount
  useEffect(() => {
    if (!quizId) {
      navigate('/quizzes');
      return;
    }

    const quiz = getQuizById(quizId);
    if (!quiz) {
      navigate('/quizzes');
      return;
    }

    // Start quiz if not already started
    if (!currentQuiz || currentQuiz.id !== quizId) {
      startQuiz(quiz.id).catch(console.error);
    }
  }, [quizId, currentQuiz, startQuiz, navigate]);

  // Handle quiz submission
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitQuiz();
      setShowSubmitDialog(false);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle exit
  const handleExit = () => {
    exitQuiz();
    navigate('/quizzes');
  };

  // Handle back to quizzes
  const handleBackToQuizzes = () => {
    navigate('/quizzes');
  };

  // Show loading state
  if (!currentQuiz || !progress) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading quiz...
        </Typography>
      </Container>
    );
  }

  // Show error state (quiz not found after loading)
  if (!currentQuiz) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Quiz not found or failed to load.
        </Alert>
        <Button
          variant="contained"
          startIcon={<BackIcon />}
          onClick={handleBackToQuizzes}
        >
          Back to Quizzes
        </Button>
      </Container>
    );
  }

  // Show results if quiz is completed
  const results = currentAttempt?.results;
  if (results) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <QuizResults result={results} />
      </Container>
    );
  }

  const { current, total } = getQuestionProgress();
  const allAnswered = progress.answeredQuestions.size === total;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {currentQuiz.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentQuiz.description}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<ExitIcon />}
            onClick={() => setShowExitDialog(true)}
          >
            Exit Quiz
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {currentQuestion ? (
            <QuestionCard question={currentQuestion} />
          ) : (
            <Alert severity="warning">No question available</Alert>
          )}

          {/* Submit Button */}
          {allAnswered && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                You've answered all questions! Ready to submit?
              </Alert>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SubmitIcon />}
                onClick={() => setShowSubmitDialog(true)}
              >
                Submit Quiz
              </Button>
            </Box>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <QuizProgress showNavigation={true} />

          {/* Quiz Info */}
          <Paper elevation={2} sx={{ p: 2, mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Quiz Information
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Passing Score:</strong> {currentQuiz.passingScore}%
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Total Questions:</strong> {total}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Estimated Time:</strong> {currentQuiz.estimatedTime} minutes
              </Typography>
            </Box>
          </Paper>

          {/* Tips */}
          <Paper elevation={2} sx={{ p: 2, mt: 3, bgcolor: 'info.light' }}>
            <Typography variant="subtitle2" gutterBottom>
              💡 Tips
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.875rem' }}>
              <li>Read each question carefully</li>
              <li>Use hints if you're stuck (10% penalty per hint)</li>
              <li>Bookmark questions to review later</li>
              <li>You can navigate between questions freely</li>
            </ul>
          </Paper>
        </Grid>
      </Grid>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onClose={() => setShowExitDialog(false)}>
        <DialogTitle>Exit Quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to exit? Your progress will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExitDialog(false)}>Cancel</Button>
          <Button onClick={handleExit} color="error" variant="contained">
            Exit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)}>
        <DialogTitle>Submit Quiz?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You have answered {progress.answeredQuestions.size} out of {total} questions.
          </Typography>
          {!allAnswered && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You haven't answered all questions. Unanswered questions will be marked as incorrect.
            </Alert>
          )}
          <Typography sx={{ mt: 2 }}>
            Are you ready to submit your quiz?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            color="primary"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <SubmitIcon />}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Made with Bob
