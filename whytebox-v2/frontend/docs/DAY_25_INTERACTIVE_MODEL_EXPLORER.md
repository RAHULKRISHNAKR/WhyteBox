# Day 25: Interactive Model Explorer

## Overview
Implemented comprehensive interactive model exploration interface with multiple visualization modes, hierarchical layer tree, detailed layer information, and node-based computational graph.

## Components Created

### 1. LayerTree Component
**File:** `src/components/explorer/LayerTree.tsx` (205 lines)

Hierarchical tree view of model layers with:
- **Expand/Collapse:** Nested layer groups with smooth animations
- **Layer Selection:** Click to select and highlight layers
- **Visibility Toggle:** Show/hide individual layers in visualization
- **Layer Information:** Type, parameters, input/output shapes
- **Parameter Formatting:** Automatic K/M suffix for large numbers
- **Total Statistics:** Aggregate parameter count across all layers

**Key Features:**
```typescript
interface LayerNode {
  id: string
  name: string
  type: string
  params: number
  inputShape: string
  outputShape: string
  children?: LayerNode[]
  metadata?: Record<string, any>
}
```

**Interactions:**
- Click layer name → Select layer
- Click expand icon → Toggle children
- Click eye icon → Toggle visibility
- Click info icon → Show details (future)

### 2. LayerDetail Component
**File:** `src/components/explorer/LayerDetail.tsx` (200 lines)

Detailed information panel for selected layer:
- **Basic Information:** ID, type, parameter count
- **Shape Information:** Input/output tensor shapes
- **Configuration:** Layer-specific metadata (filters, kernel size, etc.)
- **Statistics:** Parameter count and estimated memory usage

**Display Sections:**
1. **Header:** Layer name and type chip
2. **Basic Info Table:** ID, type, parameters
3. **Shape Info Table:** Input/output shapes with monospace font
4. **Configuration Table:** Dynamic metadata display
5. **Statistics Cards:** Parameters and memory estimation

**Memory Estimation:**
- Assumes 4 bytes per parameter (float32)
- Formats as B/KB/MB/GB automatically

### 3. NodeGraph Component
**File:** `src/components/explorer/NodeGraph.tsx` (295 lines)

Interactive canvas-based computational graph:
- **Node Rendering:** Rounded rectangles with layer info
- **Edge Rendering:** Dashed lines with arrows
- **Pan & Zoom:** Mouse drag to pan, buttons to zoom
- **Grid Background:** Optional grid for alignment
- **Node Selection:** Click nodes to select
- **Visual Feedback:** Selected nodes highlighted in blue

**Canvas Features:**
```typescript
interface GraphNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  layer: LayerNode
}

interface GraphEdge {
  from: string
  to: string
}
```

**Controls:**
- Left Click + Drag → Pan canvas
- Click Node → Select layer
- Zoom In/Out buttons
- Reset View button
- Toggle Grid button

**Rendering:**
- Canvas 2D context for performance
- Transform matrix for pan/zoom
- Shadow effects for depth
- Rounded rectangles for nodes
- Dashed lines for connections
- Arrow heads on edges

### 4. ModelExplorer Page
**File:** `src/pages/explorer/ModelExplorer.tsx` (265 lines)

Main exploration interface with three-panel layout:
- **Left Panel (25%):** LayerTree for navigation
- **Center Panel (50%):** Tabbed visualization (3D View / Node Graph)
- **Right Panel (25%):** LayerDetail for selected layer

**Layout Features:**
- Responsive grid layout
- Full-height panels
- Tab switching between visualizations
- Synchronized layer selection across all views
- Model metadata display (framework, layer count, parameters)

**Sample Data:**
Currently uses hardcoded sample architecture:
- InputLayer → Conv2D → MaxPooling2D → Conv2D → MaxPooling2D → Flatten → Dense → Dropout → Dense (Output)
- Total: 9 layers, ~206M parameters
- Realistic shapes and configurations

## Technical Implementation

### Layer Tree Hierarchy
```typescript
// Expand/collapse state management
const [expanded, setExpanded] = useState<Set<string>>(new Set())

// Visibility state management
const [visible, setVisible] = useState<Set<string>>(
  new Set(layers.map(l => l.id))
)

// Recursive rendering
const renderLayer = (layer: LayerNode, depth: number = 0) => {
  // Render current layer
  // Recursively render children if expanded
}
```

### Canvas Graph Rendering
```typescript
// Layout algorithm (vertical)
layers.forEach((layer, index) => {
  layoutNodes.push({
    id: layer.id,
    x: 400,
    y: 100 + index * verticalSpacing,
    width: 180,
    height: 80,
    layer,
  })
})

// Render loop
ctx.save()
ctx.translate(pan.x, pan.y)
ctx.scale(zoom, zoom)
// Draw grid, edges, nodes
ctx.restore()
```

### State Synchronization
```typescript
// Selected layer state shared across components
const [selectedLayer, setSelectedLayer] = useState<string>()

// Callbacks propagate selection
<LayerTree onLayerSelect={handleLayerSelect} />
<NodeGraph onLayerSelect={handleLayerSelect} />
<LayerDetail layer={selectedLayerData} />
```

## User Interactions

### Layer Tree
1. **Navigate Hierarchy:** Expand/collapse layer groups
2. **Select Layers:** Click to view details
3. **Toggle Visibility:** Show/hide in 3D view
4. **View Statistics:** See parameter counts

### Node Graph
1. **Pan Canvas:** Drag to move view
2. **Zoom:** Use buttons to zoom in/out
3. **Select Nodes:** Click to select layer
4. **Toggle Grid:** Show/hide alignment grid
5. **Reset View:** Return to default position

### Layer Detail
1. **View Information:** See all layer properties
2. **Inspect Configuration:** Review layer settings
3. **Check Statistics:** Parameter count and memory

### Visualization Tabs
1. **3D View:** BabylonJS neural network visualization
2. **Node Graph:** 2D computational graph

## Integration Points

### Router
```typescript
// New route added
{
  path: 'explorer/:id',
  element: <LazyRoute><ModelExplorer /></LazyRoute>
}
```

### API Integration
```typescript
// Fetch model details
const { data: model } = useQuery({
  queryKey: ['model', id],
  queryFn: () => modelsApi.getModel(Number(id)),
})
```

### Component Reuse
- Uses `ModelViewer` from Day 24
- Uses `PageContainer` from Day 22
- Uses Material-UI components throughout

## Performance Optimizations

### Canvas Rendering
1. **Transform Matrix:** Single transform for all elements
2. **Conditional Rendering:** Only render visible elements
3. **Event Throttling:** Debounce mouse move events
4. **Efficient Redraws:** Only redraw on state changes

### React Optimization
1. **Lazy Loading:** Route-level code splitting
2. **Memoization:** Prevent unnecessary re-renders
3. **State Localization:** Keep state close to usage
4. **Efficient Updates:** Use Set for O(1) lookups

## Sample Data Structure

```typescript
const sampleLayers: LayerNode[] = [
  {
    id: 'input',
    name: 'Input Layer',
    type: 'InputLayer',
    params: 0,
    inputShape: '(None, 224, 224, 3)',
    outputShape: '(None, 224, 224, 3)',
    metadata: { dtype: 'float32' },
  },
  {
    id: 'conv1',
    name: 'Conv2D_1',
    type: 'Conv2D',
    params: 1792,
    inputShape: '(None, 224, 224, 3)',
    outputShape: '(None, 224, 224, 64)',
    metadata: {
      filters: 64,
      kernel_size: '(3, 3)',
      strides: '(1, 1)',
      padding: 'same',
      activation: 'relu',
    },
  },
  // ... more layers
]
```

## Future Enhancements

### Planned Features
1. **Real Architecture Parsing:**
   - Parse PyTorch/TensorFlow models
   - Extract actual layer information
   - Support custom architectures

2. **Advanced Layouts:**
   - Hierarchical graph layout
   - Force-directed layout
   - Circular layout
   - Custom positioning

3. **Layer Interactions:**
   - Drag to reorder layers
   - Double-click to edit
   - Right-click context menu
   - Keyboard shortcuts

4. **Visualization Enhancements:**
   - Color coding by layer type
   - Size proportional to parameters
   - Activation flow animation
   - Gradient visualization

5. **Export Features:**
   - Export graph as image
   - Export architecture as JSON
   - Generate code from graph
   - Share visualization link

6. **Search & Filter:**
   - Search layers by name/type
   - Filter by parameter count
   - Highlight matching layers
   - Bookmarks for important layers

## Known Issues & Limitations

1. **Sample Data:** Currently uses hardcoded architecture
2. **Layout Algorithm:** Simple vertical layout only
3. **Large Models:** May have performance issues with >100 layers
4. **Mobile Support:** Canvas interactions need touch optimization
5. **Nested Layers:** Limited support for complex hierarchies

## Testing Considerations

### Unit Tests Needed
- [ ] LayerTree expand/collapse logic
- [ ] LayerDetail formatting functions
- [ ] NodeGraph layout algorithm
- [ ] State synchronization

### Integration Tests Needed
- [ ] Layer selection across components
- [ ] Visibility toggle propagation
- [ ] Tab switching behavior
- [ ] API data integration

### E2E Tests Needed
- [ ] Navigate to explorer page
- [ ] Select layers in tree
- [ ] Click nodes in graph
- [ ] Switch between tabs
- [ ] Pan and zoom canvas

## Dependencies

```json
{
  "@mui/material": "^5.14.0",
  "@mui/icons-material": "^5.14.0",
  "react": "^18.2.0",
  "react-router-dom": "^6.15.0",
  "@tanstack/react-query": "^4.32.0"
}
```

## File Structure

```
src/components/explorer/
├── LayerTree.tsx          # Hierarchical layer navigation
├── LayerDetail.tsx        # Detailed layer information
└── NodeGraph.tsx          # Canvas-based graph visualization

src/pages/explorer/
└── ModelExplorer.tsx      # Main exploration interface
```

## Completion Status

✅ LayerTree component with expand/collapse
✅ LayerDetail component with comprehensive info
✅ NodeGraph component with canvas rendering
✅ ModelExplorer page with three-panel layout
✅ Router integration
✅ State synchronization across components
✅ Sample data for testing
✅ Documentation

**Day 25: 100% Complete**

## Next Steps (Day 26)

1. Inference Interface
2. Image upload component
3. Inference configuration
4. Real-time monitoring
5. Result visualization