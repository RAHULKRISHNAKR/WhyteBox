# Frontend Setup Guide

## Prerequisites

- Node.js 18+ and npm 9+
- Backend API running on port 8000

## Quick Start

### 1. Install Dependencies

```bash
cd whytebox-v2/frontend
npm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env if needed (defaults should work for local development)
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

### Development
```bash
npm run dev          # Start development server with HMR
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors automatically
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
```

### Testing
```bash
npm run test         # Run unit tests with Vitest
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
npm run e2e          # Run E2E tests with Playwright
```

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable components
│   │   ├── common/      # Common components (buttons, inputs, etc.)
│   │   └── layout/      # Layout components (sidebar, header, etc.)
│   ├── pages/           # Page components (routes)
│   ├── services/        # API services
│   │   └── api/         # API client and endpoints
│   ├── store/           # Redux store
│   │   └── slices/      # Redux slices
│   ├── types/           # TypeScript type definitions
│   ├── theme/           # Material-UI theme configuration
│   ├── router/          # React Router configuration
│   ├── lib/             # Utility libraries
│   ├── App.tsx          # Root component
│   └── main.tsx         # Entry point
├── public/              # Static assets
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Path Aliases

The following path aliases are configured:

- `@/` → `src/`
- `@components/` → `src/components/`
- `@pages/` → `src/pages/`
- `@services/` → `src/services/`
- `@store/` → `src/store/`
- `@types/` → `src/types/`
- `@utils/` → `src/utils/`

Example usage:
```typescript
import { useAppSelector } from '@/store'
import Button from '@components/common/Button'
import { modelsApi } from '@services/api'
```

## Environment Variables

### Required Variables

- `VITE_API_URL` - Backend API URL (default: `http://localhost:8000/api/v1`)
- `VITE_WS_URL` - WebSocket URL (default: `ws://localhost:8000/ws`)

### Optional Variables

- `VITE_APP_NAME` - Application name (default: `WhyteBox`)
- `VITE_APP_VERSION` - Application version (default: `2.0.0`)
- `VITE_ENABLE_3D_VISUALIZATION` - Enable 3D features (default: `true`)
- `VITE_ENABLE_EXPLAINABILITY` - Enable explainability features (default: `true`)
- `VITE_ENABLE_ANALYTICS` - Enable analytics (default: `true`)

## Development Tips

### Hot Module Replacement (HMR)

Vite provides instant HMR. Changes to your code will be reflected immediately without full page reload.

### React Query DevTools

In development mode, React Query DevTools are available in the bottom-right corner. Click to inspect queries and mutations.

### Redux DevTools

Install the Redux DevTools browser extension to inspect Redux state and actions.

### TypeScript Errors

Some TypeScript errors are expected during development as components are being implemented. The application will still run in development mode.

## Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

The production build will be created in the `dist/` directory.

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, you can change it in `vite.config.ts`:

```typescript
server: {
  port: 3001, // Change to any available port
}
```

### API Connection Issues

Ensure the backend API is running on port 8000. Check the proxy configuration in `vite.config.ts` if you need to connect to a different backend URL.

### Module Not Found Errors

If you encounter module not found errors:

1. Delete `node_modules/` and `package-lock.json`
2. Run `npm install` again
3. Restart the development server

### TypeScript Errors

Run type checking to see all TypeScript errors:

```bash
npm run type-check
```

## Next Steps

After setup, refer to:
- `DAY_21_COMPLETE.md` - Day 21 implementation details
- `PHASE_3_DETAILED_PLAN.md` - Complete Phase 3 roadmap
- Backend API documentation at `http://localhost:8000/docs`

## Support

For issues or questions, refer to the main project documentation or create an issue in the repository.