/**
 * Documentation Article Viewer
 * 
 * Renders documentation articles with:
 * - Markdown rendering with syntax highlighting
 * - Table of contents navigation
 * - Interactive code examples
 * - Embedded demos
 * - Reading progress tracking
 * - Feedback and rating system
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  Chip,
  IconButton,
  Button,
  Divider,
  LinearProgress,
  Tooltip,
  Rating,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Drawer,
  Alert,
} from '@mui/material';
import {
  Bookmark,
  BookmarkBorder,
  Share,
  Print,
  ThumbUp,
  ThumbDown,
  Edit,
  NavigateBefore,
  NavigateNext,
  Menu as MenuIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { useDocumentation } from '../../contexts/DocumentationContext';
import { DocArticle, DocTOC, FeedbackIssueType } from '../../types/documentation';

interface DocArticleViewerProps {
  article: DocArticle;
}

export const DocArticleViewer: React.FC<DocArticleViewerProps> = ({ article }) => {
  const {
    isBookmarked,
    toggleBookmark,
    updateReadingProgress,
    submitFeedback,
    getUserFeedback,
  } = useDocumentation();

  const [showTOC, setShowTOC] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackHelpful, setFeedbackHelpful] = useState<boolean | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<FeedbackIssueType[]>([]);

  const contentRef = useRef<HTMLDivElement>(null);
  const existingFeedback = getUserFeedback(article.id);

  // Generate table of contents from markdown
  const generateTOC = (): DocTOC => {
    const headings = article.content.match(/^#{1,6}\s+.+$/gm) || [];
    const items = headings.map((heading, index) => {
      const level = heading.match(/^#+/)?.[0].length || 1;
      const title = heading.replace(/^#+\s+/, '');
      const anchor = title.toLowerCase().replace(/[^\w]+/g, '-');
      
      return {
        id: `heading-${index}`,
        title,
        level,
        anchor,
        children: [],
      };
    });

    return { items };
  };

  const toc = generateTOC();

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const element = contentRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = (scrollTop / scrollHeight) * 100;

      setReadingProgress(Math.min(100, Math.max(0, progress)));
      updateReadingProgress(article.id, progress);

      // Update active section
      const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let currentSection = '';
      
      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 100) {
          currentSection = heading.id;
        }
      });

      setActiveSection(currentSection);
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [article.id, updateReadingProgress]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitFeedback = async () => {
    if (feedbackRating === 0) return;

    try {
      await submitFeedback({
        articleId: article.id,
        userId: 'current-user', // TODO: Get from auth context
        rating: feedbackRating,
        helpful: feedbackHelpful || false,
        comment: feedbackComment,
        issues: selectedIssues.map(type => ({
          type,
          description: feedbackComment,
        })),
      });

      setShowFeedbackDialog(false);
      setFeedbackRating(0);
      setFeedbackComment('');
      setFeedbackHelpful(null);
      setSelectedIssues([]);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const issueTypes: { value: FeedbackIssueType; label: string }[] = [
    { value: 'outdated', label: 'Outdated Information' },
    { value: 'incorrect', label: 'Incorrect Information' },
    { value: 'unclear', label: 'Unclear Explanation' },
    { value: 'missing-info', label: 'Missing Information' },
    { value: 'broken-link', label: 'Broken Link' },
    { value: 'typo', label: 'Typo/Grammar' },
  ];

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Table of Contents Drawer */}
      <Drawer
        variant="temporary"
        open={showTOC}
        onClose={() => setShowTOC(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            p: 2,
          },
        }}
      >
        <Typography variant="h6" gutterBottom>
          Table of Contents
        </Typography>
        <List>
          {toc.items.map((item) => (
            <ListItemButton
              key={item.id}
              selected={activeSection === item.anchor}
              onClick={() => {
                document.getElementById(item.anchor)?.scrollIntoView({ behavior: 'smooth' });
                setShowTOC(false);
              }}
              sx={{ pl: item.level * 2 }}
            >
              <ListItemText
                primary={item.title}
                primaryTypographyProps={{
                  variant: item.level === 1 ? 'subtitle1' : 'body2',
                  fontWeight: item.level === 1 ? 600 : 400,
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Reading Progress */}
        <LinearProgress
          variant="determinate"
          value={readingProgress}
          sx={{ height: 3 }}
        />

        {/* Header */}
        <Paper elevation={2} sx={{ p: 2, borderRadius: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Breadcrumbs sx={{ mb: 1 }}>
                <Link href="/docs" underline="hover">
                  Documentation
                </Link>
                <Link href={`/docs/${article.category}`} underline="hover">
                  {article.category}
                </Link>
                <Typography color="text.primary">{article.title}</Typography>
              </Breadcrumbs>

              <Typography variant="h4" gutterBottom>
                {article.title}
              </Typography>

              <Typography variant="body1" color="text.secondary" paragraph>
                {article.description}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Chip label={article.category} size="small" />
                <Chip label={article.difficulty} size="small" color="primary" />
                <Chip label={`${article.readTime} min read`} size="small" variant="outlined" />
                <Chip
                  label={`${article.rating.average.toFixed(1)} ⭐ (${article.rating.count})`}
                  size="small"
                  variant="outlined"
                />
                {article.tags.map(tag => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Table of Contents">
                <IconButton onClick={() => setShowTOC(true)}>
                  <MenuIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={isBookmarked(article.id) ? 'Remove Bookmark' : 'Bookmark'}>
                <IconButton onClick={() => toggleBookmark(article.id)}>
                  {isBookmarked(article.id) ? <Bookmark /> : <BookmarkBorder />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Share">
                <IconButton onClick={handleShare}>
                  <Share />
                </IconButton>
              </Tooltip>
              <Tooltip title="Print">
                <IconButton onClick={handlePrint}>
                  <Print />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* Article Content */}
        <Box
          ref={contentRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 4,
            '& img': { maxWidth: '100%', height: 'auto' },
            '& pre': { borderRadius: 1, overflow: 'auto' },
            '& code': { fontSize: '0.9em' },
            '& table': { borderCollapse: 'collapse', width: '100%' },
            '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1 },
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node: _node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                // Block code has a language-* className; inline code does not
                return match ? (
                  <SyntaxHighlighter
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style={vscDarkPlus as any}
                    language={match[1]}
                    PreTag="div"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              h1: ({ children }) => (
                <Typography
                  variant="h3"
                  id={String(children).toLowerCase().replace(/[^\w]+/g, '-')}
                  sx={{ mt: 4, mb: 2 }}
                >
                  {children}
                </Typography>
              ),
              h2: ({ children }) => (
                <Typography
                  variant="h4"
                  id={String(children).toLowerCase().replace(/[^\w]+/g, '-')}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {children}
                </Typography>
              ),
              h3: ({ children }) => (
                <Typography
                  variant="h5"
                  id={String(children).toLowerCase().replace(/[^\w]+/g, '-')}
                  sx={{ mt: 2, mb: 1 }}
                >
                  {children}
                </Typography>
              ),
            }}
          >
            {article.content}
          </ReactMarkdown>

          {/* Interactive Demo */}
          {article.demo && (
            <Paper elevation={3} sx={{ p: 3, my: 4 }}>
              <Typography variant="h5" gutterBottom>
                Interactive Demo: {article.demo.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {article.demo.description}
              </Typography>
              {/* Demo component would be rendered here */}
              <Alert severity="info">
                Interactive demo component placeholder
              </Alert>
            </Paper>
          )}
        </Box>

        {/* Footer */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 0 }}>
          <Divider sx={{ mb: 3 }} />

          {/* Feedback Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Was this article helpful?
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant={feedbackHelpful === true ? 'contained' : 'outlined'}
                startIcon={<ThumbUp />}
                onClick={() => {
                  setFeedbackHelpful(true);
                  setShowFeedbackDialog(true);
                }}
                disabled={!!existingFeedback}
              >
                Yes
              </Button>
              <Button
                variant={feedbackHelpful === false ? 'contained' : 'outlined'}
                startIcon={<ThumbDown />}
                onClick={() => {
                  setFeedbackHelpful(false);
                  setShowFeedbackDialog(true);
                }}
                disabled={!!existingFeedback}
              >
                No
              </Button>
              {existingFeedback && (
                <Typography variant="body2" color="text.secondary">
                  Thank you for your feedback!
                </Typography>
              )}
            </Box>
          </Box>

          {/* Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button startIcon={<NavigateBefore />}>
              Previous Article
            </Button>
            <Button endIcon={<NavigateNext />}>
              Next Article
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Feedback Dialog */}
      <Dialog
        open={showFeedbackDialog}
        onClose={() => setShowFeedbackDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Provide Feedback</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Rate this article
            </Typography>
            <Rating
              value={feedbackRating}
              onChange={(_, value) => setFeedbackRating(value || 0)}
              size="large"
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              What issues did you find? (optional)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {issueTypes.map(({ value, label }) => (
                <Chip
                  key={value}
                  label={label}
                  onClick={() => {
                    setSelectedIssues(prev =>
                      prev.includes(value)
                        ? prev.filter(i => i !== value)
                        : [...prev, value]
                    );
                  }}
                  color={selectedIssues.includes(value) ? 'primary' : 'default'}
                  variant={selectedIssues.includes(value) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Additional Comments (optional)"
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="Tell us more about your experience..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFeedbackDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitFeedback}
            variant="contained"
            disabled={feedbackRating === 0}
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Made with Bob
