/**
 * Tutorials Page
 * Main page for browsing and accessing tutorials
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  AlertTitle,
} from '@mui/material';
import { School, TrendingUp, EmojiEvents } from '@mui/icons-material';
import { TutorialList } from '../../components/tutorial/TutorialList';
import { TutorialProgress } from '../../components/tutorial/TutorialProgress';
import { useTutorial } from '../../contexts/TutorialContext';
import { Tutorial } from '../../types/tutorial';
import { allTutorials, getTotalPointsAvailable } from '../../data/tutorials';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const Tutorials: React.FC = () => {
  const { getProgress } = useTutorial();
  const [activeTab, setActiveTab] = useState(0);
  const [tutorials] = useState<Tutorial[]>(allTutorials);
  const [loading] = useState(false);

  // Get tutorials by status
  const inProgressTutorials = tutorials.filter((t) => {
    const progress = getProgress(t.id);
    return progress?.status === 'in_progress';
  });

  const completedTutorials = tutorials.filter((t) => {
    const progress = getProgress(t.id);
    return progress?.status === 'completed';
  });

  // Calculate total points earned
  const totalPoints = completedTutorials.reduce((sum, tutorial) => {
    return sum + (tutorial.rewards?.points || 0);
  }, 0);

  // Calculate total available points
  const totalAvailablePoints = getTotalPointsAvailable();

  // Calculate completion percentage
  const completionPercentage = tutorials.length > 0
    ? Math.round((completedTutorials.length / tutorials.length) * 100)
    : 0;

  return (
    <Container maxWidth="xl">
      <Box py={4}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            <School sx={{ mr: 1, verticalAlign: 'middle' }} />
            Tutorials
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Learn AI explainability through interactive tutorials and hands-on examples
          </Typography>
        </Box>

        {/* Stats */}
        {(inProgressTutorials.length > 0 || completedTutorials.length > 0) && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Your Progress</AlertTitle>
            <Box display="flex" gap={3} flexWrap="wrap">
              <Box>
                <TrendingUp sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                <strong>{inProgressTutorials.length}</strong> in progress
              </Box>
              <Box>
                <School sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                <strong>{completedTutorials.length}</strong> of{' '}
                <strong>{tutorials.length}</strong> completed ({completionPercentage}%)
              </Box>
              <Box>
                <EmojiEvents sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                <strong>{totalPoints}</strong> of{' '}
                <strong>{totalAvailablePoints}</strong> points earned
              </Box>
            </Box>
          </Alert>
        )}

        {/* Welcome message for new users */}
        {completedTutorials.length === 0 && inProgressTutorials.length === 0 && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>Welcome to WhyteBox Tutorials! 🎓</AlertTitle>
            <Typography variant="body2">
              Start with "Getting Started with WhyteBox" to learn the basics, then progress
              through more advanced topics. Each tutorial includes interactive steps, quizzes,
              and hands-on exercises. Earn points and badges as you learn!
            </Typography>
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
          >
            <Tab label={`All Tutorials (${tutorials.length})`} />
            <Tab
              label={`In Progress (${inProgressTutorials.length})`}
              disabled={inProgressTutorials.length === 0}
            />
            <Tab
              label={`Completed (${completedTutorials.length})`}
              disabled={completedTutorials.length === 0}
            />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          {loading ? (
            <Typography>Loading tutorials...</Typography>
          ) : (
            <TutorialList tutorials={tutorials} />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box>
            {inProgressTutorials.map((tutorial) => {
              const progress = getProgress(tutorial.id);
              return (
                <Box key={tutorial.id} mb={3}>
                  <TutorialProgress tutorial={tutorial} progress={progress} />
                </Box>
              );
            })}
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box>
            {completedTutorials.map((tutorial) => {
              const progress = getProgress(tutorial.id);
              return (
                <Box key={tutorial.id} mb={3}>
                  <TutorialProgress tutorial={tutorial} progress={progress} />
                </Box>
              );
            })}
          </Box>
        </TabPanel>
      </Box>
    </Container>
  );
};

// Made with Bob
