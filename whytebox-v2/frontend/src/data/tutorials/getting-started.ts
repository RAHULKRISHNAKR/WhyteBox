/**
 * Getting Started with WhyteBox Tutorial
 * Introduces users to the platform and basic features
 */

import { Tutorial } from '../../types/tutorial';

export const gettingStartedTutorial: Tutorial = {
  id: 'getting-started',
  title: 'Getting Started with WhyteBox',
  description: 'Learn the basics of WhyteBox and how to navigate the platform. This tutorial covers uploading models, running inference, and understanding the interface.',
  category: 'getting-started',
  difficulty: 'beginner',
  estimatedTime: 15,
  tags: ['basics', 'introduction', 'navigation'],
  steps: [
    {
      id: 'welcome',
      type: 'info',
      title: 'Welcome to WhyteBox!',
      content: `WhyteBox is an AI explainability platform that helps you understand how your neural networks make decisions. 

This tutorial will guide you through the main features:
• Uploading and managing models
• Running inference on images
• Visualizing model architecture in 3D
• Understanding explainability methods like Grad-CAM

Let's get started!`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'sidebar-navigation',
      type: 'highlight',
      title: 'Navigation Sidebar',
      content: `The sidebar on the left is your main navigation tool. It contains links to all major sections:

• Dashboard - Overview of your activity
• Models - Manage your neural network models
• Inference - Run predictions on images
• Explainability - Visualize model decisions
• Explorer - Explore model architecture in 3D
• Tutorials - Access learning resources

Click on any section to navigate there.`,
      targetElement: '[data-testid="sidebar"]',
      position: 'right',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'models-section',
      type: 'action',
      title: 'Models Section',
      content: `Let's start by exploring the Models section. This is where you can:

• Upload new models (PyTorch .pt or .pth files)
• View all your uploaded models
• See model details and metadata
• Delete models you no longer need

Click on "Models" in the sidebar to continue.`,
      targetElement: '[href="/models"]',
      position: 'right',
      action: {
        type: 'navigate',
        target: '/models',
      },
      completionCriteria: {
        type: 'action',
      },
    },
    {
      id: 'upload-model',
      type: 'highlight',
      title: 'Uploading Models',
      content: `To upload a model, click the "Upload Model" button. 

WhyteBox supports:
• PyTorch models (.pt, .pth)
• TensorFlow models (coming soon)
• ONNX models (coming soon)

You can also provide metadata like:
• Model name and description
• Framework and version
• Input shape
• Number of classes

For this tutorial, we'll use a pre-loaded example model.`,
      targetElement: '[data-testid="upload-model-button"]',
      position: 'bottom',
      canSkip: true,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'model-card',
      type: 'highlight',
      title: 'Model Cards',
      content: `Each model is displayed as a card showing:

• Model name and framework
• Upload date
• Input/output shapes
• Number of parameters
• Quick actions (View, Inference, Delete)

Click on a model card to see more details.`,
      targetElement: '[data-testid="model-card"]',
      position: 'top',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'inference-intro',
      type: 'action',
      title: 'Running Inference',
      content: `Now let's try running inference! The Inference section allows you to:

• Upload images for prediction
• Select which model to use
• Configure inference parameters
• View prediction results with confidence scores

Click on "Inference" in the sidebar to continue.`,
      targetElement: '[href="/inference"]',
      position: 'right',
      action: {
        type: 'navigate',
        target: '/inference',
      },
      completionCriteria: {
        type: 'action',
      },
    },
    {
      id: 'image-upload',
      type: 'highlight',
      title: 'Image Upload',
      content: `You can upload images in two ways:

1. **Drag & Drop**: Drag an image file directly onto the upload area
2. **Click to Browse**: Click the upload area to select a file

Supported formats: JPG, PNG, WebP

The image will be automatically preprocessed to match your model's input requirements.`,
      targetElement: '[data-testid="image-upload"]',
      position: 'bottom',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'inference-results',
      type: 'info',
      title: 'Understanding Results',
      content: `After running inference, you'll see:

• **Top Predictions**: The most likely classes with confidence scores
• **Confidence Bar**: Visual representation of prediction confidence
• **Processing Time**: How long the inference took
• **Model Info**: Which model was used

You can also export results or run explainability methods from here.`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'explainability-intro',
      type: 'action',
      title: 'Explainability Methods',
      content: `The Explainability section is where WhyteBox really shines! Here you can:

• Generate Grad-CAM heatmaps
• Create saliency maps
• Use Integrated Gradients
• Compare different methods side-by-side

These visualizations show which parts of the image influenced the model's decision.

Click on "Explainability" to explore.`,
      targetElement: '[href="/explainability"]',
      position: 'right',
      action: {
        type: 'navigate',
        target: '/explainability',
      },
      completionCriteria: {
        type: 'action',
      },
    },
    {
      id: 'gradcam-preview',
      type: 'info',
      title: 'Grad-CAM Visualization',
      content: `Grad-CAM (Gradient-weighted Class Activation Mapping) highlights the regions of an image that were most important for the model's prediction.

**How to read it:**
• Red/Hot colors = High importance
• Blue/Cool colors = Low importance
• Overlay shows which pixels influenced the decision

This helps you understand if your model is looking at the right features!`,
      imageUrl: '/assets/tutorials/gradcam-example.png',
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'explorer-intro',
      type: 'action',
      title: '3D Model Explorer',
      content: `The Explorer section provides a 3D visualization of your neural network architecture.

You can:
• See all layers in 3D space
• Understand layer connections
• View layer details and parameters
• Rotate and zoom the visualization
• Highlight specific layers

This is perfect for understanding complex architectures!

Click on "Explorer" to see it in action.`,
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
      id: 'explorer-controls',
      type: 'highlight',
      title: 'Explorer Controls',
      content: `Use these controls to interact with the 3D visualization:

• **Mouse Drag**: Rotate the view
• **Mouse Wheel**: Zoom in/out
• **Camera Presets**: Quick views (Top, Side, Front)
• **Layer Tree**: Click layers to highlight them
• **Material Controls**: Adjust colors and transparency

Try exploring the architecture of a model!`,
      targetElement: '[data-testid="explorer-controls"]',
      position: 'left',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'quiz',
      type: 'quiz',
      title: 'Quick Knowledge Check',
      content: 'Let\'s test what you\'ve learned!',
      quiz: {
        question: 'What does Grad-CAM help you understand?',
        options: [
          'The training speed of the model',
          'Which parts of the image influenced the prediction',
          'The model\'s accuracy on test data',
          'How many parameters the model has',
        ],
        correctAnswer: 1,
        explanation: 'Correct! Grad-CAM creates heatmaps showing which regions of the input image were most important for the model\'s prediction, helping you understand what the model is "looking at".',
      },
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
      content: `You've completed the "Getting Started" tutorial!

**What you learned:**
✓ How to navigate WhyteBox
✓ Uploading and managing models
✓ Running inference on images
✓ Understanding explainability methods
✓ Exploring model architecture in 3D

**Next Steps:**
• Try the "Understanding Grad-CAM" tutorial for a deep dive
• Upload your own model and experiment
• Explore the "Model Architecture" tutorial
• Join our community forum for tips and tricks

Keep learning and happy exploring!`,
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
    points: 100,
    badges: ['first-steps', 'quick-learner'],
  },
};

// Made with Bob
