/**
 * MilestoneProgress Component
 * Displays progress for a learning path milestone
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
} from '@mui/material';
import {
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as NotStartedIcon,
  PlayCircle as InProgressIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Quiz as QuizIcon,
  Code as CodeIcon,
  School as TutorialIcon,
  VideoLibrary as VideoIcon,
  Description as ReadingIcon,
  Work as ProjectIcon,
} from '@mui/icons-material';
import { PathMilestone, MilestoneProgress as MilestoneProgressType, ContentItem } from '../../types/learningPath';

interface MilestoneProgressProps {
  milestone: PathMilestone;
  progress: MilestoneProgressType;
  onItemClick: (item: ContentItem) => void;
  expanded?: boolean;
  onToggle?: () => void;
}

export const MilestoneProgress: React.FC<MilestoneProgressProps> = ({
  milestone,
  progress,
  onItemClick,
  expanded = false,
  onToggle,
}) => {
  // Get icon for content type
  const getContentIcon = (type: string) => {
    switch (type) {
      case 'tutorial':
        return <TutorialIcon />;
      case 'quiz':
        return <QuizIcon />;
      case 'code-example':
        return <CodeIcon />;
      case 'video':
        return <VideoIcon />;
      case 'reading':
        return <ReadingIcon />;
      case 'project':
        return <ProjectIcon />;
      default:
        return <NotStartedIcon />;
    }
  };

  // Get item status icon
  const getStatusIcon = (itemId: string) => {
    if (progress.completedItems.has(itemId)) {
      return <CompletedIcon color="success" />;
    }
    return <NotStartedIcon color="action" />;
  };

  const completionPercentage = (progress.completedItems.size / progress.totalItems) * 100;

  return (
    <Paper elevation={2} sx={{ mb: 2 }}>
      {/* Milestone Header */}
      <ListItemButton onClick={onToggle}>
        <ListItemIcon>
          {progress.completed ? (
            <CompletedIcon color="success" fontSize="large" />
          ) : (
            <InProgressIcon color="primary" fontSize="large" />
          )}
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">{milestone.title}</Typography>
              {progress.completed && (
                <Chip label="Completed" size="small" color="success" />
              )}
            </Box>
          }
          secondary={
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {milestone.description}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {progress.completedItems.size} / {progress.totalItems} items completed
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({progress.requiredItems} required)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={completionPercentage}
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </Box>
          }
        />
        {expanded ? <CollapseIcon /> : <ExpandIcon />}
      </ListItemButton>

      {/* Milestone Items */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List sx={{ pl: 2, pr: 2, pb: 2 }}>
          {milestone.items
            .sort((a, b) => a.order - b.order)
            .map((item) => {
              const isCompleted = progress.completedItems.has(item.id);
              
              return (
                <ListItem
                  key={item.id}
                  disablePadding
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: isCompleted ? 'success.light' : 'background.paper',
                    opacity: isCompleted ? 0.8 : 1,
                  }}
                >
                  <ListItemButton onClick={() => onItemClick(item)}>
                    <ListItemIcon>
                      {getContentIcon(item.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{item.title}</Typography>
                          {item.required && (
                            <Chip label="Required" size="small" color="error" variant="outlined" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {item.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            ~{item.estimatedTime} min
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemIcon sx={{ minWidth: 'auto' }}>
                      {getStatusIcon(item.id)}
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
              );
            })}
        </List>
      </Collapse>
    </Paper>
  );
};

// Made with Bob
