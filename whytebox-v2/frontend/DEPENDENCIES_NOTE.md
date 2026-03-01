# Required Dependencies for Day 33: Interactive Code Examples

## Monaco Editor

The code editor components require the Monaco Editor package:

```bash
npm install @monaco-editor/react monaco-editor
```

### Package Details

- **@monaco-editor/react**: React wrapper for Monaco Editor
- **monaco-editor**: The core Monaco Editor (VS Code's editor)

### Features Provided

- Syntax highlighting for multiple languages
- IntelliSense and autocomplete
- Code formatting
- Error detection
- Keyboard shortcuts
- Themes (VS Dark, VS Light, High Contrast)

### Usage in Components

The following components use Monaco Editor:
- `src/components/code/CodeEditor.tsx`
- `src/components/code/CodePlayground.tsx`

### Alternative

If Monaco Editor cannot be installed, you can use a simpler code editor like:
- `react-simple-code-editor` with `prismjs` for syntax highlighting
- Plain `<textarea>` with syntax highlighting library

## Installation Command

```bash
cd whytebox-v2/frontend
npm install @monaco-editor/react monaco-editor
```

## TypeScript Types

Types are included with the packages, no additional @types packages needed.