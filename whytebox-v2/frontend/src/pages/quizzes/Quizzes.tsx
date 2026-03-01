/**
 * Quizzes Page
 * Main page for browsing and starting quizzes
 */

import React, { useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { QuizCard } from '../../components/quiz';
import {
  getAllQuizzes,
  getAllCategories,
  getAllTags,
  filterQuizzes,
  sortQuizzes,
  searchQuizzes,
  getUserBestScore,
  hasUserCompletedQuiz,
  calculateOverallProgress,
} from '../../data/quizzes';
import { QuizSortBy, QuestionDifficulty } from '../../types/quiz';

export const Quizzes: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<QuizSortBy>('title');

  const categories = getAllCategories();
  const tags = getAllTags();
  const progress = calculateOverallProgress();

  // Get and filter quizzes
  const filteredQuizzes = useMemo(() => {
    let quizzes = getAllQuizzes();

    // Apply search
    if (searchQuery) {
      quizzes = searchQuizzes(searchQuery);
    }

    // Apply filters
    const filters: any = {};
    if (selectedCategory !== 'all') {
      filters.category = selectedCategory;
    }
    if (selectedDifficulty !== 'all') {
      filters.difficulty = selectedDifficulty as QuestionDifficulty;
    }
    if (selectedTags.length > 0) {
      filters.tags = selectedTags;
    }

    if (Object.keys(filters).length > 0) {
      quizzes = filterQuizzes(filters);
    }

    // Apply sorting
    return sortQuizzes(quizzes, sortBy);
  }, [searchQuery, selectedCategory, selectedDifficulty, selectedTags, sortBy]);

  // Handle quiz start
  const handleStartQuiz = (quiz: any) => {
    navigate(`/quizzes/${quiz.id}`);
  };

  // Handle tag toggle
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Quizzes
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Test your knowledge with interactive quizzes covering various topics in AI explainability
          and neural networks.
        </Typography>

        {/* Overall Progress */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6">Your Progress</Typography>
            <Typography variant="h6" color="primary">
              {progress.completed} / {progress.total}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress.percentage}
            sx={{ height: 10, borderRadius: 5, mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            {Math.round(progress.percentage)}% of quizzes completed
          </Typography>
        </Paper>
      </Box>

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterIcon />
          <Typography variant="h6">Filters</Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Search */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Category Filter */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Difficulty Filter */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={selectedDifficulty}
                label="Difficulty"
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Sort By */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value as QuizSortBy)}
              >
                <MenuItem value="title">Title</MenuItem>
                <MenuItem value="difficulty">Difficulty</MenuItem>
                <MenuItem value="estimatedTime">Duration</MenuItem>
                <MenuItem value="recentlyAdded">Recently Added</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Clear Filters */}
          <Grid item xs={12} sm={6} md={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Typography
                variant="body2"
                color="primary"
                sx={{ cursor: 'pointer' }}
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                  setSelectedTags([]);
                }}
              >
                Clear All Filters
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Tag Filters */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter by tags:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onClick={() => handleTagToggle(tag)}
                color={selectedTags.includes(tag) ? 'primary' : 'default'}
                variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Quiz Grid */}
      {filteredQuizzes.length === 0 ? (
        <Alert severity="info">
          No quizzes found matching your criteria. Try adjusting your filters.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredQuizzes.map((quiz) => (
            <Grid item xs={12} sm={6} md={4} key={quiz.id}>
              <QuizCard
                quiz={quiz}
                onStart={handleStartQuiz}
                userScore={getUserBestScore(quiz.id)}
                completed={hasUserCompletedQuiz(quiz.id)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Results Count */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredQuizzes.length} of {getAllQuizzes().length} quizzes
        </Typography>
      </Box>
    </Container>
  );
};

// Made with Bob
