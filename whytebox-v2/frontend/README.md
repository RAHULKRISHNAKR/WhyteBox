# WhyteBox Frontend

Modern React + TypeScript + BabylonJS frontend for neural network visualization.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── babylon/              # BabylonJS 3D visualization
│   └── SceneManager.ts   # Main scene management
├── components/           # React components
│   ├── layout/          # Layout components (Header, Sidebar, etc.)
│   ├── models/          # Model-related components
│   ├── visualization/   # Visualization components
│   └── common/          # Shared components
├── pages/               # Page components
│   ├── HomePage.tsx
│   ├── ModelsPage.tsx
│   ├── VisualizationPage.tsx
│   ├── TutorialsPage.tsx
│   └── AboutPage.tsx
├── services/            # API services
│   └── api.ts          # API client
├── store/              # State management (Zustand)
│   └── useStore.ts     # Global store
├── types/              # TypeScript types
│   └── index.ts        # Type definitions
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── App.tsx             # Main app component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Build
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript compiler check
```

## 🎨 Tech Stack

### Core
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server

### 3D Visualization
- **BabylonJS 6** - 3D graphics engine
  - @babylonjs/core - Core engine
  - @babylonjs/loaders - Model loaders
  - @babylonjs/materials - Advanced materials
  - @babylonjs/gui - 3D GUI

### State Management
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing

### Styling
- **Tailwind CSS** - Utility-first CSS
- **PostCSS** - CSS processing
- **Lucide React** - Icon library

### HTTP Client
- **Axios** - Promise-based HTTP client

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_ENABLE_3D_VISUALIZATION=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=true

# BabylonJS Configuration
VITE_BABYLON_ANTIALIAS=true
VITE_BABYLON_ADAPTIVE_DEVICE_RATIO=true

# Application
VITE_APP_NAME=WhyteBox
VITE_APP_VERSION=2.0.0
```

### Path Aliases

The following path aliases are configured:

- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@pages/*` → `src/pages/*`
- `@hooks/*` → `src/hooks/*`
- `@store/*` → `src/store/*`
- `@utils/*` → `src/utils/*`
- `@types/*` → `src/types/*`
- `@services/*` → `src/services/*`
- `@babylon/*` → `src/babylon/*`

## 📦 Key Features

### 1. 3D Neural Network Visualization
- Interactive 3D rendering of neural network architectures
- Layer-by-layer exploration
- Real-time activation visualization
- Multiple camera modes (orbit, free, follow)

### 2. Model Management
- Upload custom models (PyTorch, TensorFlow, Keras)
- Browse pre-trained models
- Model metadata and statistics
- Export models in various formats

### 3. Inference & Explainability
- Run inference on uploaded data
- Grad-CAM visualizations
- Saliency maps
- Integrated gradients
- Side-by-side method comparison

### 4. Educational Features
- Interactive tutorials
- Step-by-step guides
- Code examples
- Concept explanations

### 5. Responsive Design
- Mobile-friendly interface
- Adaptive layouts
- Touch-optimized 3D controls

## 🎯 Component Guidelines

### Creating New Components

```typescript
// src/components/example/ExampleComponent.tsx
import { FC } from 'react';

interface ExampleComponentProps {
  title: string;
  onAction?: () => void;
}

export const ExampleComponent: FC<ExampleComponentProps> = ({ 
  title, 
  onAction 
}) => {
  return (
    <div className="card">
      <h2>{title}</h2>
      {onAction && (
        <button onClick={onAction} className="btn btn-primary">
          Action
        </button>
      )}
    </div>
  );
};

export default ExampleComponent;
```

### Using the Store

```typescript
import { useStore } from '@/store/useStore';

function MyComponent() {
  const { models, setModels } = useStore();
  
  // Or use selectors for better performance
  const models = useStore(state => state.models);
  
  return <div>{/* ... */}</div>;
}
```

### API Calls

```typescript
import { api } from '@/services/api';

async function loadModels() {
  try {
    const response = await api.getModels();
    console.log(response.items);
  } catch (error) {
    console.error('Failed to load models:', error);
  }
}
```

## 🎨 Styling Guidelines

### Using Tailwind Classes

```tsx
<div className="card card-hover">
  <h2 className="text-2xl font-bold mb-4">Title</h2>
  <button className="btn btn-primary">
    Click Me
  </button>
</div>
```

### Custom CSS Classes

Pre-defined utility classes in `index.css`:
- `.card` - Card container
- `.card-hover` - Card with hover effect
- `.btn` - Base button
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.input` - Form input
- `.badge` - Badge/tag
- `.glass` - Glass morphism effect
- `.gradient-text` - Gradient text

## 🔍 TypeScript

### Type Safety

All components, functions, and API calls are fully typed:

```typescript
import type { Model, InferenceRequest } from '@/types';

const model: Model = {
  id: '1',
  name: 'VGG16',
  type: 'cnn',
  // ... fully typed
};
```

### Strict Mode

TypeScript strict mode is enabled for maximum type safety.

## 🧪 Testing (Coming Soon)

```bash
npm run test              # Run tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🤝 Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Add proper type definitions
4. Test your changes
5. Update documentation

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Port Already in Use

If port 3000 is already in use, Vite will automatically try the next available port.

### TypeScript Errors

Run type checking:
```bash
npm run type-check
```

### Build Errors

Clear cache and reinstall:
```bash
rm -rf node_modules dist
npm install
npm run build
```

## 📚 Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [BabylonJS Documentation](https://doc.babylonjs.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)