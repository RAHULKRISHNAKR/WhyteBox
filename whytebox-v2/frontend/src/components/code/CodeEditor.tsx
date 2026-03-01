/**
 * Code Editor Component
 * Monaco-based code editor with syntax highlighting and IntelliSense
 */

import React, { useRef, useEffect, useState } from 'react';
import { Box, Paper, IconButton, Tooltip, Stack, Chip } from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  ContentCopy,
  Check,
  Settings,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import Editor, { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { ProgrammingLanguage, EditorSettings } from '../../types/codeExample';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: ProgrammingLanguage;
  readOnly?: boolean;
  height?: string | number;
  theme?: 'vs-dark' | 'vs-light' | 'hc-black';
  showLineNumbers?: boolean;
  showMinimap?: boolean;
  onRun?: (code: string) => void;
  onStop?: () => void;
  isRunning?: boolean;
  settings?: Partial<EditorSettings>;
}

const languageMap: Record<ProgrammingLanguage, string> = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  json: 'json',
  yaml: 'yaml',
  markdown: 'markdown',
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'python',
  readOnly = false,
  height = '400px',
  theme = 'vs-dark',
  showLineNumbers = true,
  showMinimap = true,
  onRun,
  onStop,
  isRunning = false,
  settings,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle editor mount
  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    editorRef.current = editor;

    // Configure Python language features
    if (language === 'python') {
      monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: (_model: unknown, _position: unknown) => {
          const suggestions = [
            {
              label: 'import torch',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'import torch',
              documentation: 'Import PyTorch library',
            },
            {
              label: 'import numpy as np',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'import numpy as np',
              documentation: 'Import NumPy library',
            },
            {
              label: 'def function',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'def ${1:function_name}(${2:params}):\n    ${3:pass}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Define a function',
            },
          ];
          return { suggestions };
        },
      });
    }

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRun && !isRunning) {
        onRun(editor.getValue());
      }
    });
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Handle reset
  const handleReset = () => {
    if (editorRef.current && onChange) {
      onChange('');
      editorRef.current.setValue('');
    }
  };

  // Handle fullscreen toggle
  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Editor options
  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    minimap: { enabled: settings?.minimap ?? showMinimap },
    lineNumbers: settings?.lineNumbers ?? (showLineNumbers ? 'on' : 'off'),
    fontSize: settings?.fontSize ?? 14,
    tabSize: settings?.tabSize ?? 4,
    wordWrap: settings?.wordWrap ?? 'on',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    formatOnPaste: true,
    formatOnType: true,
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    parameterHints: { enabled: true },
    folding: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'always',
    matchBrackets: 'always',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoIndent: 'full',
  };

  return (
    <Paper
      ref={containerRef}
      elevation={3}
      sx={{
        height: isFullscreen ? '100vh' : height,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={language.toUpperCase()}
            size="small"
            color="primary"
            variant="outlined"
          />
          {readOnly && (
            <Chip label="Read Only" size="small" variant="outlined" />
          )}
        </Stack>

        <Stack direction="row" spacing={0.5}>
          {onRun && (
            <>
              {isRunning ? (
                <Tooltip title="Stop Execution">
                  <IconButton size="small" onClick={onStop} color="error">
                    <Stop />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Run Code (Ctrl+Enter)">
                  <IconButton
                    size="small"
                    onClick={() => onRun(value)}
                    color="success"
                  >
                    <PlayArrow />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}

          <Tooltip title={copied ? 'Copied!' : 'Copy Code'}>
            <IconButton size="small" onClick={handleCopy}>
              {copied ? <Check color="success" /> : <ContentCopy />}
            </IconButton>
          </Tooltip>

          {!readOnly && (
            <Tooltip title="Reset Code">
              <IconButton size="small" onClick={handleReset}>
                <Refresh />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton size="small" onClick={handleFullscreenToggle}>
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Editor */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Editor
          height="100%"
          language={languageMap[language]}
          value={value}
          onChange={(value) => onChange?.(value || '')}
          theme={theme}
          options={editorOptions}
          onMount={handleEditorDidMount}
        />
      </Box>
    </Paper>
  );
};

// Made with Bob
