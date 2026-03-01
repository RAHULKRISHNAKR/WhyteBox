# Frontend Setup Instructions

## Current Status

✅ **Configuration Complete** - All config files created  
✅ **Project Structure** - Directory structure defined  
✅ **Core Files** - Main application files created  
⚠️ **Dependencies** - Need to install npm packages  
⚠️ **Components** - Placeholder components need implementation

## What's Been Created

### Configuration Files (✅ Complete)
1. `package.json` - Dependencies and scripts
2. `tsconfig.json` - TypeScript configuration
3. `tsconfig.node.json` - Node TypeScript config
4. `vite.config.ts` - Vite bundler configuration
5. `tailwind.config.js` - Tailwind CSS configuration
6. `postcss.config.js` - PostCSS configuration
7. `.eslintrc.cjs` - ESLint configuration
8. `.env.example` - Environment variables template

### Core Application Files (✅ Complete)
1. `index.html` - HTML entry point
2. `src/main.tsx` - React entry point with error boundary
3. `src/App.tsx` - Main app component with routing
4. `src/index.css` - Global styles with Tailwind
5. `src/vite-env.d.ts` - Vite environment types

### Type Definitions (✅ Complete)
1. `src/types/index.ts` - Complete type system (192 lines)
   - Model types
   - Visualization types
   - Inference types
   - Explainability types
   - User types
   - API types
   - Tutorial types
   - Dataset types

### Services (✅ Complete)
1. `src/services/api.ts` - Complete API client (197 lines)
   - Health check
   - Model management (CRUD)
   - Inference endpoints
   - Explainability endpoints
   - Visualization endpoints
   - Export endpoints
   - Tutorial endpoints
   - Dataset endpoints

### State Management (✅ Complete)
1. `src/store/useStore.ts` - Zustand store (177 lines)
   - User state
   - Models state
   - Visualization state
   - UI state (sidebar, theme, notifications)
   - Loading states
   - Error handling
   - Persistent storage

### 3D Visualization (✅ Complete)
1. `src/babylon/SceneManager.ts` - BabylonJS scene manager (283 lines)
   - Engine initialization
   - Scene setup
   - Camera controls
   - Layer visualization
   - Connection rendering
   - Interaction handling
   - Screenshot capability

### Layout Components (⚠️ Partial)
1. `src/components/layout/Layout.tsx` - Main layout wrapper
2. ❌ `src/components/layout/Header.tsx` - **NEEDS CREATION**
3. ❌ `src/components/layout/Sidebar.tsx` - **NEEDS CREATION**

### Pages (❌ Need Creation)
1. ❌ `src/pages/HomePage.tsx`
2. ❌ `src/pages/ModelsPage.tsx`
3. ❌ `src/pages/VisualizationPage.tsx`
4. ❌ `src/pages/TutorialsPage.tsx`
5. ❌ `src/pages/AboutPage.tsx`
6. ❌ `src/pages/NotFoundPage.tsx`

## 🚀 Next Steps

### Step 1: Install Node.js and npm

**Check if installed:**
```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

**If not installed:**
- **macOS:** `brew install node` or download from https://nodejs.org/
- **Linux:** `sudo apt install nodejs npm` or use nvm
- **Windows:** Download from https://nodejs.org/

### Step 2: Install Dependencies

```bash
cd whytebox-v2/frontend
npm install
```

This will install all packages defined in `package.json`:
- React & React DOM
- TypeScript
- Vite
- BabylonJS (core, loaders, materials, gui)
- React Router
- Zustand
- Axios
- Tailwind CSS
- Lucide React (icons)
- ESLint & TypeScript ESLint
- And all dev dependencies

**Expected install time:** 2-5 minutes depending on internet speed

### Step 3: Create Environment File

```bash
cp .env.example .env
```

The `.env` file is already configured with sensible defaults for local development.

### Step 4: Create Missing Components

You have two options:

#### Option A: Create Minimal Placeholders (Quick Start)

Create simple placeholder components to get the app running:

**Header.tsx:**
```typescript
export default function Header() {
  return <header className="bg-white shadow-sm p-4">
    <h1 className="text-2xl font-bold">WhyteBox</h1>
  </header>;
}
```

**Sidebar.tsx:**
```typescript
import { Link } from 'react-router-dom';

export default function Sidebar() {
  return <aside className="w-64 bg-white shadow-sm h-screen p-4">
    <nav>
      <Link to="/" className="block py-2">Home</Link>
      <Link to="/models" className="block py-2">Models</Link>
      <Link to="/tutorials" className="block py-2">Tutorials</Link>
    </nav>
  </aside>;
}
```

**All Pages (HomePage.tsx, ModelsPage.tsx, etc.):**
```typescript
export default function PageName() {
  return <div>
    <h1 className="text-3xl font-bold mb-4">Page Title</h1>
    <p>Content coming soon...</p>
  </div>;
}
```

#### Option B: Request Full Implementation

Ask the assistant to create fully-featured components with:
- Complete UI/UX
- Proper styling
- Interactive elements
- API integration
- 3D visualization integration

### Step 5: Start Development Server

```bash
npm run dev
```

The app will start at `http://localhost:3000` (or next available port).

### Step 6: Verify Setup

1. Open `http://localhost:3000` in your browser
2. You should see the WhyteBox application
3. Check browser console for any errors
4. Try navigating between pages

## 📊 Current File Statistics

- **Total Files Created:** 18
- **Lines of Code:** ~1,500
- **Configuration Files:** 8
- **Source Files:** 10
- **Documentation:** 2 (README.md, this file)

## 🎯 What Works Now

✅ **TypeScript Configuration** - Full type safety  
✅ **Build System** - Vite configured and ready  
✅ **Styling System** - Tailwind CSS with custom utilities  
✅ **State Management** - Zustand store with persistence  
✅ **API Client** - Complete backend integration  
✅ **3D Engine** - BabylonJS scene manager  
✅ **Routing** - React Router configured  
✅ **Type System** - Comprehensive type definitions  

## ⚠️ What Needs Work

❌ **UI Components** - Need to create actual components  
❌ **Pages** - Need to implement page content  
❌ **Hooks** - Custom hooks directory empty  
❌ **Utils** - Utility functions directory empty  
❌ **Tests** - No tests yet (Phase 1, Day 10)  

## 🔧 Troubleshooting

### TypeScript Errors in IDE

**Problem:** Red squiggly lines everywhere  
**Cause:** npm packages not installed yet  
**Solution:** Run `npm install` first

### "Cannot find module" Errors

**Problem:** Import errors for React, BabylonJS, etc.  
**Cause:** Dependencies not installed  
**Solution:** Run `npm install`

### Port 3000 Already in Use

**Problem:** Another app using port 3000  
**Solution:** Vite will automatically use next available port (3001, 3002, etc.)

### Build Fails

**Problem:** Build errors after npm install  
**Cause:** Missing placeholder components  
**Solution:** Create placeholder components (see Step 4)

## 📝 Notes

1. **TypeScript Errors Are Expected** - Until npm packages are installed, TypeScript will show errors. This is normal.

2. **Placeholder Components Required** - The app references components that don't exist yet. You need to create them (even as placeholders) before the app will run.

3. **Backend Must Be Running** - For full functionality, the backend API must be running on port 8000.

4. **Browser Compatibility** - Requires a modern browser with WebGL support for 3D visualization.

5. **Development Mode** - The current setup is for development. Production build requires `npm run build`.

## 🎓 Learning Resources

- **React:** https://react.dev/learn
- **TypeScript:** https://www.typescriptlang.org/docs/
- **BabylonJS:** https://doc.babylonjs.com/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Vite:** https://vitejs.dev/guide/
- **Zustand:** https://docs.pmnd.rs/zustand

## 🆘 Getting Help

If you encounter issues:

1. Check this file for troubleshooting steps
2. Review the frontend README.md
3. Check the browser console for errors
4. Ask the assistant for help with specific errors

## ✅ Completion Checklist

- [ ] Node.js and npm installed
- [ ] Dependencies installed (`npm install`)
- [ ] Environment file created (`.env`)
- [ ] Placeholder components created
- [ ] Development server starts (`npm run dev`)
- [ ] App loads in browser
- [ ] No console errors
- [ ] Can navigate between pages

Once all items are checked, Day 5 is complete! 🎉