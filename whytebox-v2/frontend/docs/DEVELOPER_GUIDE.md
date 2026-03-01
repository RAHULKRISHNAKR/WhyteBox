# WhyteBox Frontend Developer Guide

**Version:** 2.0.0  
**Last Updated:** 2026-02-26

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing Strategy](#testing-strategy)
6. [Security Guidelines](#security-guidelines)
7. [Accessibility Guidelines](#accessibility-guidelines)
8. [Performance Best Practices](#performance-best-practices)

## Getting Started

### Prerequisites

- Node.js ≥ 18.0.0
- npm ≥ 9.0.0
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/whytebox.git
cd whytebox/whytebox-v2/frontend

# Install dependencies
npm install

# Set up git hooks
npx husky install

# Start development server
npm run dev
```

### Environment Setup

Create a `.env.local` file:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_ALLOWED_ORIGINS=http://localhost:8000
```

## Project Structure

```
whytebox-v2/frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── accessibility/   # Accessibility utilities
│   │   ├── common/          # Common components
│   │   └── visualization/   # 3D visualization components
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page components
│   ├── services/            # API services
│   ├── store/               # Redux store
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   └── App.tsx              # Root component
├── public/                  # Static assets
├── tests/                   # Test files
├── e2e/                     # End-to-end tests
├── docs/                    # Documentation
└── scripts/                 # Build and utility scripts
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Write code following our [Code Standards](#code-standards)
- Add tests for new functionality
- Update documentation as needed

### 3. Run Quality Checks

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check

# Run tests
npm test

# Run E2E tests
npm run e2e
```

### 4. Commit Changes

```bash
# Stage changes
git add .

# Commit (pre-commit hooks will run automatically)
git commit -m "feat: add new feature"
```

**Commit Message Format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tooling changes

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

## Code Standards

### TypeScript

- Use TypeScript strict mode
- Define explicit types for all function parameters and return values
- Avoid `any` type - use `unknown` if type is truly unknown
- Use interfaces for object shapes
- Use type aliases for unions and complex types

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // implementation
}

// Bad
function getUser(id: any): any {
  // implementation
}
```

### React Components

- Use functional components with hooks
- Keep components small and focused (< 200 lines)
- Extract complex logic into custom hooks
- Use proper prop types

```typescript
/**
 * UserCard Component
 * 
 * Displays user information in a card format
 * 
 * @component
 * @example
 * ```tsx
 * <UserCard user={user} onEdit={handleEdit} />
 * ```
 */
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  // implementation
};
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `UserCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- Utils: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `PascalCase.ts` (e.g., `User.ts`)
- Tests: `*.test.ts` or `*.spec.ts`

### Import Organization

```typescript
// 1. External dependencies
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

// 2. Internal dependencies (absolute imports)
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types/User';

// 3. Relative imports
import { UserCard } from './UserCard';
import styles from './styles.module.css';
```

## Testing Strategy

### Unit Tests

Test individual functions and components in isolation.

```typescript
import { render, screen } from '@testing-library/react';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  it('renders user information', () => {
    const user = { id: '1', name: 'John Doe', email: 'john@example.com' };
    render(<UserCard user={user} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

### Integration Tests

Test how components work together.

```typescript
import { renderWithProviders } from '@/test-utils';
import { UserProfile } from './UserProfile';

describe('UserProfile Integration', () => {
  it('loads and displays user data', async () => {
    const { store } = renderWithProviders(<UserProfile userId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests

Test complete user workflows.

```typescript
import { test, expect } from '@playwright/test';

test('user can login and view dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

## Security Guidelines

### Input Validation

Always validate and sanitize user input:

```typescript
import { sanitizeHtml, isValidEmail } from '@/utils/security';

// Sanitize HTML content
const cleanHtml = sanitizeHtml(userInput);

// Validate email
if (!isValidEmail(email)) {
  throw new Error('Invalid email format');
}
```

### Authentication

Use the secure authentication hook:

```typescript
import { useSecureAuth } from '@/hooks/useSecureAuth';

function ProtectedComponent() {
  const { user, isAuthenticated, logout } = useSecureAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <div>Welcome, {user.name}</div>;
}
```

### Sensitive Data

- Never store sensitive data in localStorage
- Use sessionStorage for temporary data
- Clear sensitive data on logout
- Use HTTPS in production

## Accessibility Guidelines

### Semantic HTML

Use proper HTML elements:

```tsx
// Good
<button onClick={handleClick}>Click me</button>

// Bad
<div onClick={handleClick}>Click me</div>
```

### ARIA Attributes

Add ARIA attributes when needed:

```tsx
<button
  aria-label="Close dialog"
  aria-pressed={isPressed}
  onClick={handleClose}
>
  <CloseIcon aria-hidden="true" />
</button>
```

### Keyboard Navigation

Ensure all interactive elements are keyboard accessible:

```tsx
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

### Use Accessibility Components

```tsx
import { SkipNavigation, VisuallyHidden } from '@/components/accessibility';

<SkipNavigation />
<VisuallyHidden>Screen reader only text</VisuallyHidden>
```

## Performance Best Practices

### Code Splitting

Use dynamic imports for large components:

```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### Memoization

Use React.memo and useMemo for expensive computations:

```typescript
const MemoizedComponent = React.memo(ExpensiveComponent);

const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

### Image Optimization

- Use appropriate image formats (WebP, AVIF)
- Implement lazy loading
- Provide responsive images

```tsx
<img
  src="/image.webp"
  alt="Description"
  loading="lazy"
  width={800}
  height={600}
/>
```

## Additional Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Material-UI Documentation](https://mui.com)
- [Testing Library](https://testing-library.com)
- [Playwright Documentation](https://playwright.dev)

## Getting Help

- Check existing documentation
- Search closed issues on GitHub
- Ask in team chat
- Create a new issue with detailed information