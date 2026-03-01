/**
 * Code Playground Component
 * Interactive coding environment with editor, output, and controls
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Stack,
  Tabs,
  Tab,
  Alert,
  AlertTitle,
  Divider,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Save,
  Share,
} from '@mui/icons-material';
import { CodeEditor } from './CodeEditor';
import { CodeOutput } from './CodeOutput';
import { CodeExample, CodeExecution, ProgrammingLanguage } from '../../types/codeExample';

interface CodePlaygroundProps {
  example?: CodeExample;
  initialCode?: string;
  language?: ProgrammingLanguage;
  readOnly?: boolean;
  showDescription?: boolean;
  onSave?: (code: string) => void;
  onShare?: (code: string) => void;
  onExecute?: (code: string) => Promise<CodeExecution>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
};

export const CodePlayground: React.FC<CodePlaygroundProps> = ({
  example,
  initialCode = '',
  language = 'python',
  readOnly = false,
  showDescription = true,
  onSave,
  onShare,
  onExecute,
}) => {
  const [code, setCode] = useState(initialCode || example?.code || '');
  const [execution, setExecution] = useState<CodeExecution | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);

  // Handle code change
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    setHasChanges(newCode !== (initialCode || example?.code || ''));
  }, [initialCode, example]);

  // Handle code execution
  const handleRun = useCallback(async () => {
    if (!onExecute) {
      console.warn('No execution handler provided');
      return;
    }

    setIsRunning(true);
    setActiveTab(1); // Switch to output tab

    try {
      const result = await onExecute(code);
      setExecution(result);
    } catch (error) {
      console.error('Execution failed:', error);
      setExecution({
        id: Date.now().toString(),
        exampleId: example?.id || 'playground',
        userId: 'current-user',
        code,
        language: example?.language || language,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        startedAt: new Date(),
        completedAt: new Date(),
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, example, language, onExecute]);

  // Handle stop execution
  const handleStop = useCallback(() => {
    setIsRunning(false);
    // TODO: Implement actual execution cancellation
  }, []);

  // Handle reset
  const handleReset = useCallback(() => {
    setCode(initialCode || example?.code || '');
    setExecution(null);
    setHasChanges(false);
  }, [initialCode, example]);

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(code);
      setHasChanges(false);
    }
  }, [code, onSave]);

  // Handle share
  const handleShare = useCallback(() => {
    if (onShare) {
      onShare(code);
    }
  }, [code, onShare]);

  return (
    <Box>
      {/* Header */}
      {example && showDescription && (
        <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
          <Typography variant="h5" gutterBottom>
            {example.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {example.description}
          </Typography>

          {example.learningObjectives && example.learningObjectives.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Learning Objectives:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {example.learningObjectives.map((objective, index) => (
                  <li key={index}>
                    <Typography variant="body2">{objective}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}

          {example.explanation && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>Explanation</AlertTitle>
              {example.explanation}
            </Alert>
          )}
        </Paper>
      )}

      {/* Controls */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" spacing={1}>
            {!readOnly && (
              <>
                {isRunning ? (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Stop />}
                    onClick={handleStop}
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PlayArrow />}
                    onClick={handleRun}
                    disabled={!onExecute}
                  >
                    Run Code
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleReset}
                  disabled={!hasChanges}
                >
                  Reset
                </Button>
              </>
            )}
          </Stack>

          <Stack direction="row" spacing={1}>
            {onSave && (
              <Button
                variant="outlined"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={!hasChanges}
              >
                Save
              </Button>
            )}
            {onShare && (
              <Button
                variant="outlined"
                startIcon={<Share />}
                onClick={handleShare}
              >
                Share
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={2}>
        {/* Editor */}
        <Grid item xs={12} md={6}>
          <CodeEditor
            value={code}
            onChange={handleCodeChange}
            language={example?.language || language}
            readOnly={readOnly}
            height="600px"
            onRun={!readOnly ? handleRun : undefined}
            onStop={handleStop}
            isRunning={isRunning}
          />
        </Grid>

        {/* Output / Info */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Output" />
              {example && <Tab label="Info" />}
            </Tabs>

            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
              <TabPanel value={activeTab} index={0}>
                <CodeOutput execution={execution} isRunning={isRunning} />
              </TabPanel>

              {example && (
                <TabPanel value={activeTab} index={1}>
                  <Stack spacing={2}>
                    {/* Test Cases */}
                    {example.testCases && example.testCases.length > 0 && (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Test Cases
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        {example.testCases
                          .filter(test => !test.hidden)
                          .map((test, index) => (
                            <Paper key={test.id} elevation={0} sx={{ p: 2, mb: 1, bgcolor: 'background.default' }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Test {index + 1}: {test.description}
                              </Typography>
                              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                                Input: {JSON.stringify(test.input, null, 2)}
                              </Typography>
                              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                                Expected: {JSON.stringify(test.expectedOutput, null, 2)}
                              </Typography>
                            </Paper>
                          ))}
                      </Box>
                    )}

                    {/* Related Examples */}
                    {example.relatedExamples && example.relatedExamples.length > 0 && (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Related Examples
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={1}>
                          {example.relatedExamples.map((relatedId) => (
                            <Button
                              key={relatedId}
                              variant="outlined"
                              size="small"
                              fullWidth
                              sx={{ justifyContent: 'flex-start' }}
                            >
                              {relatedId}
                            </Button>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Tags */}
                    {example.tags && example.tags.length > 0 && (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Tags
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {example.tags.map((tag) => (
                            <Button key={tag} variant="outlined" size="small">
                              {tag}
                            </Button>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </TabPanel>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Made with Bob
