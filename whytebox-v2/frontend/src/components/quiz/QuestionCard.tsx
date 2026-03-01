/**
 * QuestionCard Component
 * Displays different types of quiz questions with interactive UI
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  Box,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  FormControl,
  FormGroup,
  Paper,
  Divider,
} from '@mui/material';
import {
  Lightbulb as HintIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Code as CodeIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { Question, QuestionAnswer } from '../../types/quiz';
import { useQuiz } from '../../contexts/QuizContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface QuestionCardProps {
  question: Question;
  showResult?: boolean;
  disabled?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  showResult = false,
  disabled = false,
}) => {
  const {
    currentAttempt,
    progress,
    answerQuestion,
    useHint,
    bookmarkQuestion,
    getQuestionResult,
  } = useQuiz();

  const [answer, setAnswer] = useState<any>(null);
  const [showHint, setShowHint] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);

  const isBookmarked = progress?.bookmarked.has(question.id) || false;
  const hintsUsed = progress?.hintsUsed.get(question.id) || 0;
  const result = showResult ? getQuestionResult(question.id) : null;

  // Load existing answer
  useEffect(() => {
    if (currentAttempt) {
      const existingAnswer = currentAttempt.answers.find(
        a => a.questionId === question.id
      );
      if (existingAnswer) {
        setAnswer(existingAnswer.answer);
      }
    }
  }, [currentAttempt, question.id]);

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (answer !== null && answer !== '') {
      answerQuestion(question.id, answer);
    }
  };

  // Handle hint request
  const handleShowHint = () => {
    if (question.hints && currentHintIndex < question.hints.length) {
      setShowHint(true);
      useHint(question.id);
      setCurrentHintIndex(prev => prev + 1);
    }
  };

  // Handle bookmark toggle
  const handleBookmark = () => {
    bookmarkQuestion(question.id);
  };

  // Render question based on type
  const renderQuestionContent = () => {
    switch (question.type) {
      case 'multiple-choice':
        return renderMultipleChoice();
      case 'true-false':
        return renderTrueFalse();
      case 'fill-in-blank':
        return renderFillInBlank();
      case 'code-completion':
        return renderCodeCompletion();
      case 'matching':
        return renderMatching();
      default:
        return null;
    }
  };

  // Render multiple choice question
  const renderMultipleChoice = () => {
    const mcq = question as any;
    const isMultiple = mcq.allowMultiple;

    const handleChange = (optionId: string) => {
      if (isMultiple) {
        const currentAnswers = Array.isArray(answer) ? answer : [];
        if (currentAnswers.includes(optionId)) {
          setAnswer(currentAnswers.filter((id: string) => id !== optionId));
        } else {
          setAnswer([...currentAnswers, optionId]);
        }
      } else {
        setAnswer(optionId);
      }
    };

    return (
      <FormControl component="fieldset" fullWidth>
        {isMultiple ? (
          <FormGroup>
            {mcq.options.map((option: any) => (
              <FormControlLabel
                key={option.id}
                control={
                  <Checkbox
                    checked={Array.isArray(answer) && answer.includes(option.id)}
                    onChange={() => handleChange(option.id)}
                    disabled={disabled}
                  />
                }
                label={option.text}
              />
            ))}
          </FormGroup>
        ) : (
          <RadioGroup value={answer || ''} onChange={(e) => setAnswer(e.target.value)}>
            {mcq.options.map((option: any) => (
              <FormControlLabel
                key={option.id}
                value={option.id}
                control={<Radio disabled={disabled} />}
                label={option.text}
              />
            ))}
          </RadioGroup>
        )}
      </FormControl>
    );
  };

  // Render true/false question
  const renderTrueFalse = () => {
    return (
      <RadioGroup
        value={answer === null ? '' : String(answer)}
        onChange={(e) => setAnswer(e.target.value === 'true')}
      >
        <FormControlLabel
          value="true"
          control={<Radio disabled={disabled} />}
          label="True"
        />
        <FormControlLabel
          value="false"
          control={<Radio disabled={disabled} />}
          label="False"
        />
      </RadioGroup>
    );
  };

  // Render fill in the blank question
  const renderFillInBlank = () => {
    const fibq = question as any;
    const parts = fibq.template.split('___');

    return (
      <Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {parts[0]}
          <TextField
            value={answer || ''}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={disabled}
            variant="outlined"
            size="small"
            sx={{ mx: 1, minWidth: 200 }}
            placeholder="Your answer"
          />
          {parts[1]}
        </Typography>
      </Box>
    );
  };

  // Render code completion question
  const renderCodeCompletion = () => {
    const ccq = question as any;

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Complete the code:
        </Typography>
        <Paper elevation={0} sx={{ bgcolor: '#1e1e1e', p: 2, mb: 2 }}>
          <SyntaxHighlighter
            language={ccq.language}
            style={vscDarkPlus}
            customStyle={{ margin: 0, background: 'transparent' }}
          >
            {ccq.codeTemplate}
          </SyntaxHighlighter>
        </Paper>
        <TextField
          fullWidth
          multiline
          rows={6}
          value={answer || ''}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={disabled}
          placeholder="Write your code here..."
          variant="outlined"
          sx={{
            fontFamily: 'monospace',
            '& textarea': {
              fontFamily: 'monospace',
            },
          }}
        />
      </Box>
    );
  };

  // Render matching question
  const renderMatching = () => {
    const mq = question as any;
    const matches = answer || {};

    const handleMatch = (left: string, right: string) => {
      setAnswer({
        ...matches,
        [left]: right,
      });
    };

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Match the items:
        </Typography>
        {mq.pairs.map((pair: any) => (
          <Box key={pair.id} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ flex: 1 }}>{pair.left}</Typography>
            <Typography sx={{ mx: 2 }}>→</Typography>
            <TextField
              value={matches[pair.left] || ''}
              onChange={(e) => handleMatch(pair.left, e.target.value)}
              disabled={disabled}
              variant="outlined"
              size="small"
              sx={{ flex: 1 }}
              placeholder="Match with..."
            />
          </Box>
        ))}
      </Box>
    );
  };

  // Render result feedback
  const renderResult = () => {
    if (!result) return null;

    return (
      <Alert
        severity={result.isCorrect ? 'success' : 'error'}
        sx={{ mt: 2 }}
      >
        <Typography variant="subtitle2" gutterBottom>
          {result.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
        </Typography>
        <Typography variant="body2">{result.feedback}</Typography>
        {!result.isCorrect && result.correctAnswer && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Correct answer:</strong> {String(result.correctAnswer)}
          </Typography>
        )}
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Points earned: {result.pointsEarned} / {result.pointsPossible}
        </Typography>
      </Alert>
    );
  };

  return (
    <Card elevation={3}>
      <CardContent>
        {/* Question Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={question.difficulty}
              size="small"
              color={
                question.difficulty === 'easy'
                  ? 'success'
                  : question.difficulty === 'medium'
                  ? 'warning'
                  : 'error'
              }
            />
            <Chip
              label={`${question.points} points`}
              size="small"
              variant="outlined"
            />
            {question.timeLimit && (
              <Chip
                icon={<TimerIcon />}
                label={`${question.timeLimit}s`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
          <Tooltip title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}>
            <IconButton onClick={handleBookmark} size="small">
              {isBookmarked ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Question Text */}
        <Typography variant="h6" gutterBottom>
          {question.question}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Question Content */}
        {renderQuestionContent()}

        {/* Hints */}
        {question.hints && question.hints.length > 0 && !showResult && (
          <Box sx={{ mt: 2 }}>
            {showHint && currentHintIndex > 0 && (
              <Alert severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  <strong>Hint {currentHintIndex}:</strong>{' '}
                  {question.hints[currentHintIndex - 1]}
                </Typography>
              </Alert>
            )}
            {currentHintIndex < question.hints.length && (
              <Button
                startIcon={<HintIcon />}
                onClick={handleShowHint}
                disabled={disabled}
                size="small"
              >
                Show Hint ({hintsUsed} used, -10% per hint)
              </Button>
            )}
          </Box>
        )}

        {/* Submit Button */}
        {!showResult && !disabled && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleSubmitAnswer}
              disabled={answer === null || answer === ''}
              fullWidth
            >
              Submit Answer
            </Button>
          </Box>
        )}

        {/* Result */}
        {showResult && renderResult()}

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {question.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Made with Bob
