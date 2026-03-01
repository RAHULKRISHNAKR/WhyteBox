/**
 * Exploring Model Architecture Tutorial
 * Learn to use 3D visualization for understanding neural networks
 */

import { Tutorial } from '../../types/tutorial';

export const modelArchitectureTutorial: Tutorial = {
  id: 'model-architecture',
  title: 'Exploring Model Architecture',
  description: 'Learn how to use the 3D visualization to understand neural network architectures, layer connections, and data flow.',
  category: 'visualization',
  difficulty: 'beginner',
  estimatedTime: 20,
  tags: ['3d', 'architecture', 'layers', 'visualization'],
  steps: [
    {
      id: 'intro',
      type: 'info',
      title: 'Why Visualize Architecture?',
      content: `Understanding neural network architecture is crucial for:

**Model Development:**
• Designing new architectures
• Debugging layer connections
• Optimizing model size

**Model Analysis:**
• Understanding information flow
• Identifying bottlenecks
• Comparing different models

**Communication:**
• Explaining models to stakeholders
• Teaching neural networks
• Publishing research

WhyteBox's 3D Explorer makes this easy and interactive!`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'navigate-explorer',
      type: 'action',
      title: 'Open the Explorer',
      content: `Let's start by opening the Model Explorer.

The Explorer provides:
• 3D visualization of all layers
• Interactive layer selection
• Detailed layer information
• Connection visualization
• Camera controls

Click on "Explorer" in the sidebar to begin.`,
      targetElement: '[href="/explorer"]',
      position: 'right',
      action: {
        type: 'navigate',
        target: '/explorer',
      },
      completionCriteria: {
        type: 'action',
      },
    },
    {
      id: 'select-model',
      type: 'highlight',
      title: 'Select a Model',
      content: `First, choose which model you want to explore.

**Tips:**
• Start with simpler models (VGG, ResNet)
• Complex models (Transformers) may take longer to render
• You can switch models anytime

Select a model from the dropdown to load its architecture.`,
      targetElement: '[data-testid="explorer-model-selector"]',
      position: 'bottom',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: '3d-view',
      type: 'highlight',
      title: 'The 3D View',
      content: `This is the main 3D visualization area where you'll see your model's architecture.

**What you see:**
• Each box represents a layer
• Connections show data flow
• Colors indicate layer types
• Size represents layer dimensions

**Layer Colors:**
🟦 Blue = Convolutional layers
🟩 Green = Pooling layers
🟨 Yellow = Fully connected layers
🟥 Red = Activation layers
⬜ Gray = Other layers

Try rotating the view by dragging with your mouse!`,
      targetElement: '[data-testid="babylon-scene"]',
      position: 'left',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'camera-controls',
      type: 'highlight',
      title: 'Camera Controls',
      content: `Use these controls to navigate the 3D space:

**Mouse Controls:**
• **Left Drag** - Rotate view
• **Right Drag** - Pan view
• **Scroll** - Zoom in/out

**Camera Presets:**
• **Top View** - Bird's eye view
• **Side View** - Profile view
• **Front View** - Face-on view
• **Isometric** - 3D perspective

**Reset Button:**
Returns to default view

Try the different camera presets to see the model from various angles!`,
      targetElement: '[data-testid="camera-controls"]',
      position: 'left',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'layer-tree',
      type: 'highlight',
      title: 'Layer Tree Panel',
      content: `The Layer Tree shows all layers in a hierarchical structure.

**Features:**
• Expandable/collapsible groups
• Layer names and types
• Click to highlight in 3D
• Search functionality
• Layer count

**Layer Information:**
Each entry shows:
• Layer name
• Layer type (Conv2d, Linear, etc.)
• Icon indicating layer category

Click on any layer to highlight it in the 3D view!`,
      targetElement: '[data-testid="layer-tree"]',
      position: 'right',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'select-layer',
      type: 'action',
      title: 'Select a Layer',
      content: `Click on any layer in the tree to select it.

**What happens:**
• Layer highlights in 3D (glowing effect)
• Camera focuses on the layer
• Layer details appear in the panel
• Connections become visible

Try clicking on a convolutional layer to see its details!`,
      targetElement: '[data-testid="layer-tree-item"]',
      position: 'right',
      action: {
        type: 'click',
        target: '[data-testid="layer-tree-item"]',
      },
      completionCriteria: {
        type: 'action',
      },
    },
    {
      id: 'layer-details',
      type: 'highlight',
      title: 'Layer Details Panel',
      content: `When you select a layer, detailed information appears here:

**Basic Info:**
• Layer name and type
• Position in network
• Input/output shapes

**Parameters:**
• Number of parameters
• Trainable parameters
• Layer-specific settings

**For Convolutional Layers:**
• Kernel size
• Stride and padding
• Number of filters

**For Linear Layers:**
• Input features
• Output features
• Bias usage

This helps you understand exactly what each layer does!`,
      targetElement: '[data-testid="layer-details"]',
      position: 'left',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'material-controls',
      type: 'highlight',
      title: 'Material Controls',
      content: `Customize how layers are displayed:

**Opacity:**
• Adjust transparency of layers
• See through to inner layers
• Useful for complex models

**Wireframe Mode:**
• Toggle wireframe view
• See layer structure
• Better for presentations

**Color Scheme:**
• Change layer colors
• Highlight specific types
• Improve visibility

**Lighting:**
• Adjust scene lighting
• Better depth perception
• Professional appearance

Experiment with these settings to find what works best!`,
      targetElement: '[data-testid="material-controls"]',
      position: 'left',
      canSkip: true,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'understanding-flow',
      type: 'info',
      title: 'Understanding Data Flow',
      content: `The 3D visualization shows how data flows through the network:

**Input → Output:**
• Data enters at the bottom/left
• Flows through layers sequentially
• Exits at the top/right

**Layer Connections:**
• Lines show data flow
• Thickness indicates tensor size
• Color matches layer type

**Common Patterns:**
📊 **Sequential**: Straight line of layers
🔀 **Residual**: Skip connections (ResNet)
🌳 **Branching**: Multiple paths (Inception)
➕ **Concatenation**: Paths merge (DenseNet)

Understanding these patterns helps you design better architectures!`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'quiz-1',
      type: 'quiz',
      title: 'Knowledge Check',
      content: 'Test your understanding of the 3D visualization.',
      quiz: {
        question: 'What do the connections between layers represent?',
        options: [
          'The training time for each layer',
          'The data flow between layers',
          'The number of parameters',
          'The layer activation functions',
        ],
        correctAnswer: 1,
        explanation: 'Correct! The connections (lines) between layers show how data flows through the network, from input to output.',
      },
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'common-architectures',
      type: 'info',
      title: 'Common Architecture Patterns',
      content: `**VGG (Visual Geometry Group):**
• Simple sequential design
• Repeated Conv → Conv → Pool blocks
• Deep but straightforward
• Easy to understand

**ResNet (Residual Network):**
• Skip connections (residual blocks)
• Solves vanishing gradient problem
• Very deep networks (50-152 layers)
• Look for the bypass connections!

**Inception:**
• Multiple parallel paths
• Different kernel sizes
• Concatenation of features
• Complex but efficient

**MobileNet:**
• Depthwise separable convolutions
• Lightweight and fast
• Optimized for mobile devices
• Fewer parameters

Try loading different models to see these patterns!`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'analyzing-bottlenecks',
      type: 'info',
      title: 'Identifying Bottlenecks',
      content: `Use the 3D view to find potential bottlenecks:

**What to look for:**

🔍 **Dimension Reduction:**
• Large input → Small output
• May lose information
• Check if intentional

🔍 **Parameter Concentration:**
• Layers with many parameters
• Potential training bottleneck
• May need optimization

🔍 **Computational Hotspots:**
• Large feature maps
• Many channels
• High memory usage

**Solutions:**
• Add skip connections
• Use pooling strategically
• Reduce channel count
• Apply pruning techniques`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'export-view',
      type: 'highlight',
      title: 'Export and Share',
      content: `You can export the 3D visualization for:

**Screenshots:**
• Capture current view
• High-resolution export
• Perfect for presentations

**3D Models:**
• Export as OBJ/GLTF
• Use in other 3D software
• Create animations

**Architecture Diagrams:**
• Generate 2D diagrams
• Include in papers
• Share with team

**Use Cases:**
• Research papers
• Technical presentations
• Documentation
• Teaching materials`,
      targetElement: '[data-testid="export-button"]',
      position: 'bottom',
      canSkip: true,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'comparison-mode',
      type: 'info',
      title: 'Comparing Architectures',
      content: `**Side-by-Side Comparison:**
Load two models to compare:
• Architecture differences
• Layer count and types
• Parameter efficiency
• Computational complexity

**What to compare:**
✓ Depth (number of layers)
✓ Width (channels per layer)
✓ Skip connections
✓ Pooling strategies
✓ Activation functions

**Example Comparisons:**
• VGG16 vs ResNet50
• MobileNetV2 vs EfficientNet
• Your model vs baseline

This helps you understand trade-offs and make informed design decisions!`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'best-practices',
      type: 'info',
      title: 'Best Practices',
      content: `**For Learning:**
✓ Start with simple models (VGG)
✓ Progress to complex ones (ResNet, Inception)
✓ Compare similar architectures
✓ Focus on one pattern at a time

**For Analysis:**
✓ Check layer dimensions carefully
✓ Verify connections are correct
✓ Look for unexpected patterns
✓ Compare with paper diagrams

**For Presentations:**
✓ Use camera presets for consistency
✓ Adjust lighting for clarity
✓ Hide unnecessary details
✓ Export high-quality images

**For Debugging:**
✓ Verify input/output shapes
✓ Check for dimension mismatches
✓ Ensure all layers are connected
✓ Look for missing activations`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'completion',
      type: 'info',
      title: 'Congratulations! 🎉',
      content: `You've mastered the Model Explorer!

**What you learned:**
✓ Navigating the 3D visualization
✓ Understanding layer types and connections
✓ Using camera controls effectively
✓ Analyzing architecture patterns
✓ Identifying bottlenecks
✓ Comparing different models

**Next Steps:**
• Explore your own models
• Try the "Comparing Methods" tutorial
• Compare different architectures
• Export visualizations for your work

**Earned Rewards:**
🏆 150 points
🎖️ Architecture Explorer badge

Keep visualizing and understanding neural networks!`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'auto',
      },
    },
  ],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  version: '1.0.0',
  rewards: {
    points: 150,
    badges: ['architecture-explorer', 'visualization-pro'],
  },
};

// Made with Bob
