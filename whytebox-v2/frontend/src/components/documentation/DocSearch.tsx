/**
 * Documentation Search Component
 * 
 * Full-featured search interface with:
 * - Real-time search with debouncing
 * - Advanced filters (category, difficulty, tags)
 * - Search result highlighting
 * - Sort and filter options
 * - Recent searches
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useDocumentation } from '../../contexts/DocumentationContext';
import { DocCategory, DocDifficulty } from '../../types/documentation';

const CATEGORIES: { value: DocCategory; label: string }[] = [
  { value: 'getting-started', label: 'Getting Started' },
  { value: 'concepts', label: 'Concepts' },
  { value: 'api-reference', label: 'API Reference' },
  { value: 'tutorials', label: 'Tutorials' },
  { value: 'guides', label: 'Guides' },
  { value: 'examples', label: 'Examples' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'faq', label: 'FAQ' },
];

const DIFFICULTIES: { value: DocDifficulty; label: string; color: string }[] = [
  { value: 'beginner', label: 'Beginner', color: '#4caf50' },
  { value: 'intermediate', label: 'Intermediate', color: '#ff9800' },
  { value: 'advanced', label: 'Advanced', color: '#f44336' },
  { value: 'expert', label: 'Expert', color: '#9c27b0' },
];

export const DocSearch: React.FC = () => {
  const {
    searchQuery,
    searchResults,
    filters,
    isSearching,
    setSearchQuery,
    updateFilters,
    performSearch,
    clearSearch,
  } = useDocumentation();

  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('whytebox_recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    if (searchQuery.trim()) {
      const timeout = setTimeout(() => {
        performSearch();
        saveRecentSearch(searchQuery);
      }, 500);
      setSearchDebounce(timeout);
    }

    return () => {
      if (searchDebounce) {
        clearTimeout(searchDebounce);
      }
    };
  }, [searchQuery]);

  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('whytebox_recent_searches', JSON.stringify(updated));
  };

  const handleCategoryToggle = (category: DocCategory) => {
    const updated = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilters({ categories: updated });
  };

  const handleDifficultyToggle = (difficulty: DocDifficulty) => {
    const updated = filters.difficulty.includes(difficulty)
      ? filters.difficulty.filter(d => d !== difficulty)
      : [...filters.difficulty, difficulty];
    updateFilters({ difficulty: updated });
  };

  const handleClearFilters = () => {
    updateFilters({
      categories: [],
      difficulty: [],
      tags: [],
      hasDemo: false,
      hasCode: false,
      minRating: 0,
    });
  };

  const activeFilterCount = 
    filters.categories.length +
    filters.difficulty.length +
    filters.tags.length +
    (filters.hasDemo ? 1 : 0) +
    (filters.hasCode ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0);

  return (
    <Box>
      {/* Search Input */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {isSearching && <CircularProgress size={20} />}
                {searchQuery && (
                  <IconButton size="small" onClick={clearSearch}>
                    <ClearIcon />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => setShowFilters(!showFilters)}
                  color={activeFilterCount > 0 ? 'primary' : 'default'}
                >
                  <FilterIcon />
                  {activeFilterCount > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bgcolor: 'primary.main',
                        color: 'white',
                        borderRadius: '50%',
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                      }}
                    >
                      {activeFilterCount}
                    </Typography>
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Recent Searches */}
        {!searchQuery && recentSearches.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <HistoryIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Recent Searches
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {recentSearches.map((search, index) => (
                <Chip
                  key={index}
                  label={search}
                  size="small"
                  onClick={() => setSearchQuery(search)}
                  onDelete={() => {
                    const updated = recentSearches.filter((_, i) => i !== index);
                    setRecentSearches(updated);
                    localStorage.setItem('whytebox_recent_searches', JSON.stringify(updated));
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Advanced Filters */}
      <Collapse in={showFilters}>
        <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Filters</Typography>
            {activeFilterCount > 0 && (
              <Button size="small" onClick={handleClearFilters}>
                Clear All
              </Button>
            )}
          </Box>

          {/* Categories */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Categories
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {CATEGORIES.map(({ value, label }) => (
                <Chip
                  key={value}
                  label={label}
                  onClick={() => handleCategoryToggle(value)}
                  color={filters.categories.includes(value) ? 'primary' : 'default'}
                  variant={filters.categories.includes(value) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>

          {/* Difficulty */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Difficulty Level
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {DIFFICULTIES.map(({ value, label, color }) => (
                <Chip
                  key={value}
                  label={label}
                  onClick={() => handleDifficultyToggle(value)}
                  sx={{
                    bgcolor: filters.difficulty.includes(value) ? color : 'transparent',
                    color: filters.difficulty.includes(value) ? 'white' : 'text.primary',
                    borderColor: color,
                  }}
                  variant={filters.difficulty.includes(value) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>

          {/* Content Type */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Content Type
            </Typography>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.hasDemo}
                    onChange={(e) => updateFilters({ hasDemo: e.target.checked })}
                  />
                }
                label="Has Interactive Demo"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.hasCode}
                    onChange={(e) => updateFilters({ hasCode: e.target.checked })}
                  />
                }
                label="Has Code Examples"
              />
            </FormGroup>
          </Box>

          {/* Minimum Rating */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Minimum Rating: {filters.minRating.toFixed(1)} ⭐
            </Typography>
            <Slider
              value={filters.minRating}
              onChange={(_, value) => updateFilters({ minRating: value as number })}
              min={0}
              max={5}
              step={0.5}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        </Paper>
      </Collapse>

      {/* Search Results */}
      {searchQuery && (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {isSearching ? 'Searching...' : `${searchResults.length} Results`}
          </Typography>

          {searchResults.length === 0 && !isSearching && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No results found for "{searchQuery}"
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try adjusting your search terms or filters
              </Typography>
            </Box>
          )}

          <List>
            {searchResults.map((result, index) => (
              <React.Fragment key={result.id}>
                {index > 0 && <Divider />}
                <ListItemButton
                  component="a"
                  href={result.url}
                  sx={{ py: 2 }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1">{result.title}</Typography>
                        <Chip
                          label={result.category}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={result.difficulty}
                          size="small"
                          sx={{
                            bgcolor: DIFFICULTIES.find(d => d.value === result.difficulty)?.color,
                            color: 'white',
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {result.excerpt}
                        </Typography>
                        {result.highlights.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {result.highlights.map((highlight, i) => (
                              <Chip
                                key={i}
                                label={highlight}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        )}
                      </>
                    }
                  />
                </ListItemButton>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

// Made with Bob
