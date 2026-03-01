/**
 * Learning Paths Page
 * Main page for browsing and enrolling in learning paths
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
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLearningPath } from '../../contexts/LearningPathContext';
import { PathCard } from '../../components/learningPath';
import {
  getAllPaths,
  getAllCategories,
  getAllTags,
  filterPaths,
  sortPaths,
  searchPaths,
  calculateOverallProgress,
} from '../../data/learningPaths';
import { PathDifficulty, PathSortBy } from '../../types/learningPath';

export const LearningPaths: React.FC = () => {
  const navigate = useNavigate();
  const { enrollInPath, enrolledPaths } = useLearningPath();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<PathSortBy>('difficulty');
  const [certificateOnly, setCertificateOnly] = useState(false);

  const categories = getAllCategories();
  const tags = getAllTags();
  const progress = calculateOverallProgress();

  // Get and filter paths
  const filteredPaths = useMemo(() => {
    let paths = getAllPaths();

    // Apply search
    if (searchQuery) {
      paths = searchPaths(searchQuery);
    }

    // Apply filters
    const filters: any = {};
    if (selectedCategory !== 'all') {
      filters.category = selectedCategory;
    }
    if (selectedDifficulty !== 'all') {
      filters.difficulty = selectedDifficulty as PathDifficulty;
    }
    if (selectedTags.length > 0) {
      filters.tags = selectedTags;
    }
    if (certificateOnly) {
      filters.certificateAvailable = true;
    }

    if (Object.keys(filters).length > 0) {
      paths = filterPaths(filters);
    }

    // Apply sorting
    return sortPaths(paths, sortBy);
  }, [searchQuery, selectedCategory, selectedDifficulty, selectedTags, sortBy, certificateOnly]);

  // Handle path enrollment
  const handleEnroll = (path: any) => {
    enrollInPath(path);
    navigate(`/learning-paths/${path.id}`);
  };

  // Handle continue learning
  const handleContinue = (path: any) => {
    navigate(`/learning-paths/${path.id}`);
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <SchoolIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h3">
            Learning Paths
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" paragraph>
          Follow structured learning journeys to master AI explainability concepts.
          Complete milestones, earn certificates, and track your progress.
        </Typography>

        {/* Overall Progress */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Your Learning Journey
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progress.enrolled} of {progress.total} paths enrolled
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Enrollment Rate
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress.enrollmentRate}
                sx={{ height: 10, borderRadius: 5, mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {Math.round(progress.enrollmentRate)}%
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Completion Rate
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress.completionRate}
                color="success"
                sx={{ height: 10, borderRadius: 5, mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {Math.round(progress.completionRate)}% ({progress.completed} completed)
              </Typography>
            </Grid>
          </Grid>
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
              placeholder="Search learning paths..."
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
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
                <MenuItem value="expert">Expert</MenuItem>
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
                onChange={(e) => setSortBy(e.target.value as PathSortBy)}
              >
                <MenuItem value="title">Title</MenuItem>
                <MenuItem value="difficulty">Difficulty</MenuItem>
                <MenuItem value="duration">Duration</MenuItem>
                <MenuItem value="newest">Newest</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Certificate Filter */}
          <Grid item xs={12} sm={6} md={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Chip
                label="Certificate Available"
                onClick={() => setCertificateOnly(!certificateOnly)}
                color={certificateOnly ? 'primary' : 'default'}
                variant={certificateOnly ? 'filled' : 'outlined'}
              />
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

      {/* Learning Paths Grid */}
      {filteredPaths.length === 0 ? (
        <Alert severity="info">
          No learning paths found matching your criteria. Try adjusting your filters.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredPaths.map((path) => (
            <Grid item xs={12} sm={6} md={4} key={path.id}>
              <PathCard
                path={path}
                progress={enrolledPaths.get(path.id)}
                onEnroll={handleEnroll}
                onContinue={handleContinue}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Results Count */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredPaths.length} of {getAllPaths().length} learning paths
        </Typography>
      </Box>
    </Container>
  );
};

// Made with Bob
