# Day 26: Inference Interface

## Overview
Implemented comprehensive inference interface for running model predictions on images with configurable parameters, real-time monitoring, and detailed result visualization.

## Components Created

### 1. ImageUpload Component
**File:** `src/components/inference/ImageUpload.tsx` (200 lines)

Drag-and-drop image upload with preview:
- **Drag & Drop:** Intuitive file drop zone with visual feedback
- **File Browser:** Click to browse and select files
- **Preview:** Display uploaded image before inference
- **Validation:** File type and size validation
- **Remove:** Clear uploaded image with one click

**Features:**
```typescript
interface ImageUploadProps {
  onImageSelect: (file: File) => void
  onImageRemove?: () => void
  maxSize?: number // Default: 10MB
  acceptedFormats?: string[] // Default: JPEG, PNG
}
```

**Validation:**
- Accepted formats: image/jpeg, image/png, image/jpg
- Maximum file size: 10MB (configurable)
- Clear error messages for invalid files

**UI States:**
- Empty state: Drag & drop zone with instructions
- Dragging state: Highlighted border and background
- Preview state: Full image display with remove button
- Error state: Red error message below upload area

### 2. InferenceConfig Component
**File:** `src/components/inference/InferenceConfig.tsx` (185 lines)

Comprehensive inference configuration:
- **Basic Settings:**
  - Batch Size (1-32)
  - Top K Predictions (1-10)
  - Temperature slider (0.1-2.0)

- **Preprocessing Options:**
  - Normalize input toggle
  - Resize image toggle
  - Target size input (32-1024)
  - Preprocessing method selector

- **Advanced Options:**
  - Mixed precision toggle
  - Gradient checkpointing toggle
  - Result caching toggle

**Configuration Interface:**
```typescript
interface InferenceConfigData {
  batchSize: number
  topK: number
  temperature: number
  normalize: boolean
  resize: boolean
  targetSize: number
  preprocessingMethod: string
}
```

**Preprocessing Methods:**
- Standard (ImageNet)
- Caffe
- PyTorch
- TensorFlow
- Custom

### 3. InferenceResults Component
**File:** `src/components/inference/InferenceResults.tsx` (210 lines)

Detailed result visualization:
- **Top Prediction:** Highlighted with large display
- **All Predictions:** Sortable table with confidence bars
- **Metadata:** Inference time, memory usage, model name, timestamp
- **Loading State:** Progress indicator during inference
- **Error State:** Clear error messages

**Result Interface:**
```typescript
interface Prediction {
  class: string
  confidence: number
  index: number
}

interface InferenceResult {
  predictions: Prediction[]
  inferenceTime: number
  memoryUsed?: number
  modelName: string
  timestamp: string
}
```

**Display Features:**
- Top prediction in success-colored box
- Confidence bars for all predictions
- Ranked predictions with chips
- Performance metrics (time, memory)
- Configuration summary

### 4. Inference Page
**File:** `src/pages/inference/Inference.tsx` (240 lines)

Main inference interface with two-column layout:
- **Left Column:**
  - Model selection dropdown
  - Image upload area
  - Configuration panel
  - Action buttons (Run/Reset)

- **Right Column:**
  - Results display
  - Configuration summary
  - Performance metrics

**State Management:**
```typescript
const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
const [uploadedFile, setUploadedFile] = useState<File | null>(null)
const [result, setResult] = useState<InferenceResult | null>(null)
const [config, setConfig] = useState<InferenceConfigData>({...})
```

## Technical Implementation

### File to Base64 Conversion
```typescript
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const base64 = reader.result as string
      resolve(base64.split(',')[1]) // Remove data URL prefix
    }
    reader.onerror = error => reject(error)
  })
}
```

### Inference Mutation
```typescript
const inferenceMutation = useMutation({
  mutationFn: async () => {
    const base64 = await fileToBase64(uploadedFile)
    return inferenceApi.runInference({
      model_id: selectedModelId,
      input_data: base64 as any,
    })
  },
  onSuccess: (data) => {
    // Transform and display results
  },
})
```

### Drag & Drop Implementation
```typescript
const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(false)
  const files = Array.from(e.dataTransfer.files)
  if (files.length > 0) {
    handleFile(files[0])
  }
}, [handleFile])
```

## User Interactions

### Upload Flow
1. Select model from dropdown
2. Drag & drop image or click to browse
3. Image preview appears
4. Configure inference parameters (optional)
5. Click "Run Inference"
6. View results in real-time

### Configuration Options
1. **Basic Settings:**
   - Adjust batch size for multiple images
   - Set number of top predictions to return
   - Control temperature for confidence distribution

2. **Preprocessing:**
   - Toggle normalization
   - Enable/disable resizing
   - Select preprocessing method

3. **Advanced:**
   - Enable mixed precision (GPU)
   - Use gradient checkpointing
   - Cache results for faster repeated predictions

### Result Interpretation
1. **Top Prediction:** Most confident class with large display
2. **Confidence Bars:** Visual representation of certainty
3. **Ranked List:** All predictions sorted by confidence
4. **Metrics:** Performance data (time, memory)

## Integration Points

### API Integration
```typescript
// Fetch models
const { data: modelsResponse } = useQuery({
  queryKey: ['models'],
  queryFn: () => modelsApi.getModels({ limit: 100 }),
})

// Run inference
const inferenceMutation = useMutation({
  mutationFn: () => inferenceApi.runInference({...}),
  onSuccess: (data) => setResult(transformResult(data)),
})
```

### State Synchronization
- Model selection updates available options
- Image upload enables inference button
- Configuration changes preserved across runs
- Results persist until reset

## Performance Optimizations

### File Handling
1. **Validation:** Check file type and size before processing
2. **Preview:** Use FileReader for instant preview
3. **Base64 Conversion:** Efficient async conversion
4. **Memory Management:** Clear preview on remove

### UI Responsiveness
1. **Loading States:** Show progress during inference
2. **Error Handling:** Clear error messages
3. **Debouncing:** Prevent rapid configuration changes
4. **Lazy Loading:** Load models on demand

## Validation & Error Handling

### File Validation
```typescript
const validateFile = (file: File): string | null => {
  // Check file type
  if (!acceptedFormats.includes(file.type)) {
    return 'Invalid file type'
  }
  
  // Check file size
  const sizeMB = file.size / (1024 * 1024)
  if (sizeMB > maxSize) {
    return `File too large. Maximum: ${maxSize}MB`
  }
  
  return null
}
```

### Error States
- File validation errors
- API request errors
- Network errors
- Model loading errors

## Future Enhancements

### Planned Features
1. **Batch Inference:**
   - Upload multiple images
   - Process in parallel
   - Aggregate results

2. **Real-time Preview:**
   - Show preprocessing steps
   - Display intermediate activations
   - Visualize attention maps

3. **Result Export:**
   - Download results as JSON
   - Export predictions as CSV
   - Save annotated images

4. **Advanced Visualization:**
   - Confidence distribution charts
   - Class probability heatmaps
   - Confusion matrix for batch

5. **Model Comparison:**
   - Run multiple models simultaneously
   - Compare predictions side-by-side
   - Benchmark performance

6. **History & Caching:**
   - Save inference history
   - Quick re-run previous inferences
   - Cache common predictions

## Known Issues & Limitations

1. **Single Image:** Currently supports one image at a time
2. **File Size:** 10MB limit may be restrictive for high-res images
3. **Format Support:** Limited to JPEG and PNG
4. **Type Definitions:** API types need updates for base64 input
5. **Memory Display:** Memory usage not yet implemented in backend

## Testing Considerations

### Unit Tests Needed
- [ ] File validation logic
- [ ] Base64 conversion
- [ ] Configuration state management
- [ ] Result transformation

### Integration Tests Needed
- [ ] Image upload flow
- [ ] Inference API integration
- [ ] Model selection
- [ ] Configuration persistence

### E2E Tests Needed
- [ ] Complete inference workflow
- [ ] Drag & drop functionality
- [ ] Error handling
- [ ] Result display

## Dependencies

```json
{
  "@mui/material": "^5.14.0",
  "@mui/icons-material": "^5.14.0",
  "@tanstack/react-query": "^4.32.0",
  "react": "^18.2.0"
}
```

## File Structure

```
src/components/inference/
├── ImageUpload.tsx          # Drag & drop image upload
├── InferenceConfig.tsx      # Configuration panel
└── InferenceResults.tsx     # Results display

src/pages/inference/
└── Inference.tsx            # Main inference interface
```

## Completion Status

✅ ImageUpload component with drag & drop
✅ InferenceConfig component with all options
✅ InferenceResults component with visualization
✅ Inference page with two-column layout
✅ File validation and error handling
✅ Base64 conversion utility
✅ API integration with React Query
✅ Loading and error states
✅ Documentation

**Day 26: 100% Complete**

## Next Steps (Day 27)

1. Explainability Visualization
2. Grad-CAM heatmap overlay
3. Saliency map display
4. Integrated Gradients visualization
5. Method comparison view