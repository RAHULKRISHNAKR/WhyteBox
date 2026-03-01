# Local Setup Bug Fixes

## Issue: Frontend-Backend Integration Errors

### Problem 1: 404 Not Found on `/models` Endpoint

**Symptom:**
```
GET http://localhost:8000/models?limit=100 404 (Not Found)
```

**Root Cause:**
The API client was using an incorrect base URL configuration. The environment variable name mismatch caused the client to use a relative path `/api/v1` instead of the full URL `http://localhost:8000/api/v1`.

**Files Modified:**
- `whytebox-v2/frontend/src/services/api/client.ts`

**Changes:**
```typescript
// Before
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  // ...
})

// After
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  // ...
})
```

**Resolution:**
1. Added `API_BASE_URL` constant that reads from `VITE_API_BASE_URL` (matching `.env` file)
2. Constructed full base URL by appending `/api/v1` to the base URL
3. Ensured consistent URL construction for all API calls

---

### Problem 2: TypeError - `models.filter is not a function`

**Symptom:**
```
TypeError: models.filter is not a function
    at ModelList (http://localhost:3000/src/pages/models/ModelList.tsx:63:33)
```

**Root Cause:**
Data format mismatch between backend response and frontend expectations.

**Backend Response:**
```json
{
  "models": [
    { "id": "vgg16", "name": "VGG16", ... },
    { "id": "resnet50", "name": "ResNet-50", ... },
    { "id": "mobilenet_v2", "name": "MobileNetV2", ... }
  ],
  "count": 3,
  "message": "Available pretrained models"
}
```

**Frontend Expected:** Direct array `[...]`

**Files Modified:**
- `whytebox-v2/frontend/src/services/api/models.ts`

**Changes:**
```typescript
// Before
getModels: async (params?: {...}) => {
  const response = await apiClient.get<Model[]>('/models', { params })
  return response.data  // Returns entire object
},

// After
getModels: async (params?: {...}) => {
  const response = await apiClient.get<{ models: Model[]; count: number; message: string }>('/models', { params })
  return response.data.models  // Extracts models array
},
```

**Resolution:**
1. Updated TypeScript type to match backend response structure
2. Changed return statement to extract `models` array from response object
3. Frontend now correctly receives an array for `.filter()` operations

---

## Verification Steps

After applying these fixes:

1. **Stop and restart frontend server:**
   ```bash
   cd whytebox-v2/frontend
   npm run dev
   ```

2. **Verify backend is running:**
   ```bash
   # Should see: INFO: Uvicorn running on http://0.0.0.0:8000
   ```

3. **Open browser to `http://localhost:5173`**

4. **Expected Results:**
   - ✅ No 404 errors in console
   - ✅ API calls show: `GET http://localhost:8000/api/v1/models 200 (OK)`
   - ✅ Models page displays 3 pretrained models:
     - VGG16 (138M parameters)
     - ResNet-50 (25.6M parameters)
     - MobileNetV2 (3.5M parameters)

---

## Environment Configuration

Ensure your `.env` files are correctly configured:

### Backend `.env`
```env
DATABASE_URL=postgresql://whytebox:whytebox@localhost:5432/whytebox
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
VITE_ENABLE_3D_VISUALIZATION=true
VITE_ENABLE_DEBUG_MODE=true
```

---

## Lessons Learned

1. **Environment Variable Naming:** Always ensure environment variable names match between configuration files and code
2. **API Response Contracts:** Document and validate API response structures to prevent type mismatches
3. **Base URL Construction:** Use explicit full URLs in development to avoid relative path issues
4. **Type Safety:** Leverage TypeScript types to catch data structure mismatches early

---

## Status

✅ **RESOLVED** - Local development environment fully functional
- Frontend successfully connects to backend API
- Models load and display correctly
- Ready to proceed with Phase 6: Production Deployment

---

*Fixed on: 2026-02-26*
*Tested on: macOS with Node.js 18+, Python 3.9+*