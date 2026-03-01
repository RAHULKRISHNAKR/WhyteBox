/**
 * Documentation Page
 * 
 * Main documentation hub with:
 * - Search interface
 * - Category browsing
 * - Popular and recent articles
 * - Bookmarked articles
 * - Documentation statistics
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  MenuBook,
  TrendingUp,
  Schedule,
  Bookmark,
  Category,
  School,
  Code,
  Help,
} from '@mui/icons-material';
import { useDocumentation } from '../../contexts/DocumentationContext';
import { DocSearch } from '../../components/documentation/DocSearch';
import { DocCategory } from '../../types/documentation';

const CATEGORY_INFO: Record<DocCategory, { icon: React.ReactNode; description: string }> = {
  'getting-started': {
    icon: <School />,
    description: 'Start your journey with WhyteBox',
  },
  'concepts': {
    icon: <MenuBook />,
    description: 'Core concepts and theory',
  },
  'api-reference': {
    icon: <Code />,
    description: 'Complete API documentation',
  },
  'tutorials': {
    icon: <School />,
    description: 'Step-by-step tutorials',
  },
  'guides': {
    icon: <MenuBook />,
    description: 'How-to guides and best practices',
  },
  'examples': {
    icon: <Code />,
    description: 'Real-world examples',
  },
  'troubleshooting': {
    icon: <Help />,
    description: 'Common issues and solutions',
  },
  'faq': {
    icon: <Help />,
    description: 'Frequently asked questions',
  },
};

export const Documentation: React.FC = () => {
  const {
    recentArticles,
    popularArticles,
    bookmarks,
    stats,
    loadStats,
    getArticlesByCategory,
  } = useDocumentation();

  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | null>(null);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const bookmarkedArticles = recentArticles.filter(article => bookmarks.has(article.id));

  const renderCategoryGrid = () => (
    <Grid container spacing={3}>
      {(Object.keys(CATEGORY_INFO) as DocCategory[]).map((category) => {
        const info = CATEGORY_INFO[category];
        const count = stats?.categoryCounts[category] || 0;

        return (
          <Grid item xs={12} sm={6} md={3} key={category}>
            <Card>
              <CardActionArea
                onClick={() => setSelectedCategory(category)}
                sx={{ p: 3, height: '100%' }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: 'primary.main', fontSize: 48 }}>
                    {info.icon}
                  </Box>
                  <Typography variant="h6" align="center">
                    {category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    {info.description}
                  </Typography>
                  <Chip label={`${count} articles`} size="small" />
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  const renderArticleList = (articles: typeof recentArticles, title: string, icon: React.ReactNode) => (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {icon}
        <Typography variant="h6">{title}</Typography>
      </Box>
      <List>
        {articles.length === 0 ? (
          <ListItem>
            <ListItemText
              primary="No articles yet"
              secondary="Check back later for new content"
            />
          </ListItem>
        ) : (
          articles.map((article, index) => (
            <React.Fragment key={article.id}>
              {index > 0 && <Divider />}
              <ListItem
                component="a"
                href={`/docs/${article.slug}`}
                sx={{
                  textDecoration: 'none',
                  color: 'inherit',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemText
                  primary={article.title}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={article.category} size="small" />
                      <Chip label={article.difficulty} size="small" color="primary" />
                      <Chip label={`${article.readTime} min`} size="small" variant="outlined" />
                      <Chip
                        label={`${article.rating.average.toFixed(1)} ⭐`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))
        )}
      </List>
    </Paper>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Documentation
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive guides and references for WhyteBox AI Explainability Platform
        </Typography>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 4 }}>
        <DocSearch />
      </Box>

      {/* Statistics */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {stats.totalArticles}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Articles
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {stats.totalViews.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Views
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {stats.averageRating.toFixed(1)} ⭐
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Rating
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {bookmarks.size}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bookmarked
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab icon={<Category />} label="Browse by Category" />
          <Tab icon={<TrendingUp />} label="Popular" />
          <Tab icon={<Schedule />} label="Recent" />
          <Tab icon={<Bookmark />} label="Bookmarked" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {activeTab === 0 && renderCategoryGrid()}
        {activeTab === 1 && renderArticleList(popularArticles, 'Popular Articles', <TrendingUp />)}
        {activeTab === 2 && renderArticleList(recentArticles, 'Recent Articles', <Schedule />)}
        {activeTab === 3 && renderArticleList(bookmarkedArticles, 'Bookmarked Articles', <Bookmark />)}
      </Box>

      {/* Category View */}
      {selectedCategory && (
        <Box sx={{ mt: 4 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {CATEGORY_INFO[selectedCategory].icon}
                <Typography variant="h5">
                  {selectedCategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Typography>
              </Box>
              <Chip
                label="Clear"
                onClick={() => setSelectedCategory(null)}
                onDelete={() => setSelectedCategory(null)}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              {CATEGORY_INFO[selectedCategory].description}
            </Typography>
            <List>
              {getArticlesByCategory(selectedCategory).map((article, index) => (
                <React.Fragment key={article.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    component="a"
                    href={`/docs/${article.slug}`}
                    sx={{
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemText
                      primary={article.title}
                      secondary={article.description}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      )}
    </Container>
  );
};

// Made with Bob
