/**
 * Code Output Component
 * Displays execution results, errors, and test results
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  AlertTitle,
  Chip,
  Stack,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  ExpandMore,
  Timer,
} from '@mui/icons-material';
import { CodeExecution } from '../../types/codeExample';

interface CodeOutputProps {
  execution: CodeExecution | null;
  isRunning?: boolean;
}

export const CodeOutput: React.FC<CodeOutputProps> = ({
  execution,
  isRunning = false,
}) => {
  if (!execution && !isRunning) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Run the code to see output here
        </Typography>
      </Paper>
    );
  }

  if (isRunning) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Running...</Typography>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary">
            Executing your code...
          </Typography>
        </Stack>
      </Paper>
    );
  }

  if (!execution) return null;

  const { status, output, error, executionTime, testResults } = execution;

  return (
    <Paper elevation={2} sx={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor:
            status === 'success'
              ? 'success.light'
              : status === 'error'
              ? 'error.light'
              : 'warning.light',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          {status === 'success' && <CheckCircle color="success" />}
          {status === 'error' && <ErrorIcon color="error" />}
          {status === 'timeout' && <Warning color="warning" />}

          <Typography variant="h6">
            {status === 'success' && 'Execution Successful'}
            {status === 'error' && 'Execution Failed'}
            {status === 'timeout' && 'Execution Timeout'}
          </Typography>

          {executionTime !== undefined && (
            <Chip
              icon={<Timer />}
              label={`${executionTime}ms`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
      </Box>

      {/* Output */}
      {output && (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Output:
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: 'grey.900',
              color: 'grey.100',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflow: 'auto',
              maxHeight: 300,
            }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{output}</pre>
          </Paper>
        </Box>
      )}

      {/* Error */}
      {error && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            <Typography
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                m: 0,
              }}
            >
              {error}
            </Typography>
          </Alert>
        </Box>
      )}

      {/* Test Results */}
      {testResults && (
        <Box sx={{ p: 2 }}>
          <Accordion defaultExpanded={testResults.failed > 0}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="subtitle2">Test Results</Typography>
                <Chip
                  label={`${testResults.passed}/${testResults.total} Passed`}
                  size="small"
                  color={testResults.failed === 0 ? 'success' : 'error'}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Test</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {testResults.details.map((test, index) => (
                      <TableRow key={test.testId}>
                        <TableCell>Test {index + 1}</TableCell>
                        <TableCell>
                          {test.passed ? (
                            <Chip
                              icon={<CheckCircle />}
                              label="Passed"
                              size="small"
                              color="success"
                            />
                          ) : (
                            <Chip
                              icon={<ErrorIcon />}
                              label="Failed"
                              size="small"
                              color="error"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {test.error ? (
                            <Typography
                              variant="body2"
                              color="error"
                              sx={{ fontFamily: 'monospace' }}
                            >
                              {test.error}
                            </Typography>
                          ) : test.actualOutput !== undefined ? (
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'monospace' }}
                            >
                              Output: {JSON.stringify(test.actualOutput)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="success.main">
                              ✓ Correct
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      {/* Summary */}
      {testResults && (
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              {testResults.passed === testResults.total
                ? '🎉 All tests passed!'
                : `${testResults.failed} test(s) failed`}
            </Typography>
            {executionTime !== undefined && (
              <Typography variant="body2" color="text.secondary">
                Completed in {executionTime}ms
              </Typography>
            )}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

// Made with Bob
