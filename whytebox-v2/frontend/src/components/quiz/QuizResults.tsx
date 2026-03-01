/**
 * QuizResults Component
 * Displays comprehensive quiz results with detailed feedback
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as WrongIcon,
  EmojiEvents as TrophyIcon,
  Refresh as RetakeIcon,
  Home as HomeIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { QuizResult } from '../../types/quiz';
import { useQuiz } from '../../contexts/QuizContext';
import { useNavigate } from 'react-router-dom';

interface QuizResultsProps {
  result: QuizResult;
}

export const QuizResults: React.FC<QuizResultsProps> = ({ result }) => {
  const { currentQuiz, retakeQuiz } = useQuiz();
  const navigate = useNavigate();

  if (!currentQuiz) {
    return null;
  }

  // Calculate statistics
  const accuracy = (result.correctAnswers / result.totalQuestions) * 100;
  const averageTimePerQuestion = result.timeSpent / result.totalQuestions;

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  // Get performance message
  const getPerformanceMessage = () => {
    if (result.score >= 90) {
      return {
        message: 'Outstanding! You have mastered this topic!',
        color: 'success' as const,
        icon: <TrophyIcon sx={{ fontSize: 60, color: 'gold' }} />,
      };
    } else if (result.score >= 70) {
      return {
        message: 'Great job! You have a solid understanding.',
        color: 'success' as const,
        icon: <CheckIcon sx={{ fontSize: 60, color: 'green' }} />,
      };
    } else if (result.score >= 50) {
      return {
        message: 'Good effort! Review the topics and try again.',
        color: 'warning' as const,
        icon: <CheckIcon sx={{ fontSize: 60, color: 'orange' }} />,
      };
    } else {
      return {
        message: 'Keep learning! Review the material and retake the quiz.',
        color: 'error' as const,
        icon: <WrongIcon sx={{ fontSize: 60, color: 'red' }} />,
      };
    }
  };

  const performance = getPerformanceMessage();

  // Handle actions
  const handleRetake = () => {
    retakeQuiz();
  };

  const handleGoHome = () => {
    navigate('/quizzes');
  };

  const handleDownloadCertificate = () => {
    // TODO: Implement certificate generation
    console.log('Download certificate');
  };

  const handleShare = () => {
    // TODO: Implement sharing functionality
    console.log('Share results');
  };

  return (
    <Box>
      {/* Header Card */}
      <Paper elevation={3} sx={{ p: 4, mb: 3, textAlign: 'center' }}>
        {performance.icon}
        <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
          Quiz Complete!
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {currentQuiz.title}
        </Typography>
        
        {/* Pass/Fail Alert */}
        <Alert
          severity={performance.color}
          sx={{ mt: 2, maxWidth: 600, mx: 'auto' }}
        >
          <Typography variant="body1">{performance.message}</Typography>
        </Alert>

        {/* Score Display */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h2" color="primary" gutterBottom>
            {Math.round(result.score)}%
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {result.passed ? 'Passed' : 'Not Passed'} (Passing score: {currentQuiz.passingScore}%)
          </Typography>
        </Box>

        {/* Certificate Badge */}
        {result.certificateEarned && (
          <Chip
            icon={<TrophyIcon />}
            label="Certificate Earned!"
            color="warning"
            sx={{ mt: 2 }}
          />
        )}
      </Paper>

      {/* Statistics Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary" gutterBottom>
                {result.correctAnswers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Correct Answers
              </Typography>
              <Typography variant="caption" color="text.secondary">
                out of {result.totalQuestions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary" gutterBottom>
                {Math.round(accuracy)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Accuracy
              </Typography>
              <LinearProgress
                variant="determinate"
                value={accuracy}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary" gutterBottom>
                {formatTime(result.timeSpent)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Time
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTime(averageTimePerQuestion)} per question
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary" gutterBottom>
                {result.pointsEarned}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Points Earned
              </Typography>
              <Typography variant="caption" color="text.secondary">
                out of {result.pointsPossible}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Question-by-Question Results */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Question-by-Question Results
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Question</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Points</TableCell>
                <TableCell align="center">Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.questionResults.map((qResult, index) => {
                const question = currentQuiz.questions.find(
                  q => q.id === qResult.questionId
                );
                
                return (
                  <TableRow key={qResult.questionId}>
                    <TableCell>
                      <Typography variant="body2">
                        Question {index + 1}
                      </Typography>
                      {question && (
                        <Typography variant="caption" color="text.secondary">
                          {question.question.substring(0, 50)}...
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {qResult.isCorrect ? (
                        <CheckIcon color="success" />
                      ) : (
                        <WrongIcon color="error" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        color={qResult.isCorrect ? 'success.main' : 'error.main'}
                      >
                        {qResult.pointsEarned} / {qResult.pointsPossible}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {formatTime(qResult.timeSpent)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Action Buttons */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<RetakeIcon />}
              onClick={handleRetake}
            >
              Retake Quiz
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
            >
              Back to Quizzes
            </Button>
          </Grid>
          
          {result.certificateEarned && (
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadCertificate}
              >
                Download Certificate
              </Button>
            </Grid>
          )}
          
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={handleShare}
            >
              Share Results
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Recommendations */}
      {!result.passed && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Recommendations for Improvement:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Review the questions you got wrong</li>
            <li>Study the explanations provided</li>
            <li>Practice with related tutorials</li>
            <li>Retake the quiz when you feel ready</li>
          </ul>
        </Alert>
      )}
    </Box>
  );
};

// Made with Bob
