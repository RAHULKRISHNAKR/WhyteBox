# Quiz System Dependencies

## Required NPM Packages

The Quiz System requires the following additional dependencies:

```bash
npm install react-syntax-highlighter
npm install --save-dev @types/react-syntax-highlighter
```

## Purpose

- **react-syntax-highlighter**: Provides syntax highlighting for code snippets in code-completion questions
- **@types/react-syntax-highlighter**: TypeScript type definitions

## Installation

Run the following command in the `whytebox-v2/frontend` directory:

```bash
cd whytebox-v2/frontend
npm install react-syntax-highlighter
npm install --save-dev @types/react-syntax-highlighter
```

## Usage

The package is used in:
- `src/components/quiz/QuestionCard.tsx` - For displaying code templates in code-completion questions

## Alternative

If you prefer not to add this dependency, you can replace the SyntaxHighlighter component with a simple `<pre><code>` block in the QuestionCard component.