/**
 * Understanding Grad-CAM Tutorial
 * Deep dive into Gradient-weighted Class Activation Mapping
 */

import { Tutorial } from '../../types/tutorial';

export const understandingGradCAMTutorial: Tutorial = {
  id: 'understanding-gradcam',
  title: 'Understanding Grad-CAM',
  description: 'Deep dive into Gradient-weighted Class Activation Mapping (Grad-CAM) and how it helps visualize what your neural network is looking at.',
  category: 'explainability',
  difficulty: 'intermediate',
  estimatedTime: 25,
  tags: ['grad-cam', 'visualization', 'cnn', 'explainability'],
  steps: [
    {
      id: 'intro',
      type: 'info',
      title: 'What is Grad-CAM?',
      content: `Grad-CAM (Gradient-weighted Class Activation Mapping) is a technique for making Convolutional Neural Networks (CNNs) more transparent by visualizing which regions of an image are important for predictions.

**Key Benefits:**
• Understand model decisions
• Debug model behavior
• Build trust in AI systems
• Identify biases and errors

**How it works:**
Grad-CAM uses the gradients flowing into the final convolutional layer to produce a coarse localization map highlighting important regions.`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'technical-overview',
      type: 'info',
      title: 'Technical Overview',
      content: `Grad-CAM works in three main steps:

**1. Forward Pass**
Run the image through the network and get the prediction

**2. Gradient Computation**
Calculate gradients of the target class score with respect to feature maps

**3. Weighted Combination**
Weight the feature maps by their gradients and combine them

The result is a heatmap showing which pixels contributed most to the prediction.`,
      codeSnippet: {
        language: 'python',
        code: `# Simplified Grad-CAM algorithm
def grad_cam(model, image, target_class):
    # 1. Forward pass
    features = model.get_features(image)
    output = model(image)
    
    # 2. Compute gradients
    loss = output[target_class]
    gradients = compute_gradients(loss, features)
    
    # 3. Weight and combine
    weights = global_average_pool(gradients)
    cam = relu(sum(weights * features))
    
    return cam`,
        editable: false,
      },
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'navigate-explainability',
      type: 'action',
      title: 'Let\'s Try It!',
      content: `Now let's generate a Grad-CAM visualization ourselves.

Navigate to the Explainability section where we can:
• Upload an image
• Select a model
• Generate Grad-CAM heatmaps
• Analyze the results

Click on "Explainability" in the sidebar to continue.`,
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
      id: 'upload-image',
      type: 'highlight',
      title: 'Upload an Image',
      content: `First, we need an image to analyze. 

**Tips for good results:**
• Use clear, well-lit images
• Ensure the subject is visible
• Avoid heavily processed images
• Match the model's training data distribution

Upload an image by dragging it here or clicking to browse.`,
      targetElement: '[data-testid="explainability-image-upload"]',
      position: 'bottom',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'select-model',
      type: 'highlight',
      title: 'Select a Model',
      content: `Choose which model to use for generating the Grad-CAM visualization.

**Important:**
• The model must be a CNN (Convolutional Neural Network)
• Grad-CAM works best with models that have convolutional layers
• Different models may highlight different features

Select a model from the dropdown.`,
      targetElement: '[data-testid="model-selector"]',
      position: 'bottom',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'select-layer',
      type: 'highlight',
      title: 'Choose Target Layer',
      content: `Grad-CAM requires selecting which layer to visualize.

**Best Practices:**
• Use the last convolutional layer for best results
• Earlier layers show low-level features (edges, textures)
• Later layers show high-level features (objects, parts)

**Common choices:**
• ResNet: layer4
• VGG: features.28
• MobileNet: features.18

The default selection is usually optimal.`,
      targetElement: '[data-testid="layer-selector"]',
      position: 'bottom',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'generate-gradcam',
      type: 'action',
      title: 'Generate Grad-CAM',
      content: `Now click the "Generate Grad-CAM" button to create the visualization.

**What happens:**
1. Image is preprocessed
2. Forward pass through the model
3. Gradients are computed
4. Heatmap is generated
5. Heatmap is overlaid on the original image

This may take a few seconds depending on model size.`,
      targetElement: '[data-testid="generate-gradcam-button"]',
      position: 'bottom',
      action: {
        type: 'click',
        target: '[data-testid="generate-gradcam-button"]',
      },
      completionCriteria: {
        type: 'action',
      },
    },
    {
      id: 'interpret-heatmap',
      type: 'info',
      title: 'Interpreting the Heatmap',
      content: `The Grad-CAM heatmap uses colors to show importance:

**Color Scale:**
🔴 **Red/Hot** = High importance (model focused here)
🟡 **Yellow/Warm** = Medium importance
🔵 **Blue/Cool** = Low importance (model ignored this)

**What to look for:**
✓ Is the model focusing on the right object?
✓ Are important features highlighted?
✗ Is the model looking at background/irrelevant areas?
✗ Are there unexpected focus areas?

The heatmap helps you understand if your model is making decisions for the right reasons!`,
      imageUrl: '/assets/tutorials/gradcam-interpretation.png',
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'colormap-options',
      type: 'highlight',
      title: 'Colormap Options',
      content: `You can change the colormap to better visualize the heatmap:

**Available Colormaps:**
• **Jet** - Classic rainbow (red = hot, blue = cold)
• **Hot** - Black → Red → Yellow → White
• **Viridis** - Perceptually uniform, colorblind-friendly
• **Plasma** - Similar to Viridis with more purple

**Tip:** Viridis and Plasma are better for accessibility and printing.

Try different colormaps to see which works best for your use case!`,
      targetElement: '[data-testid="colormap-selector"]',
      position: 'left',
      canSkip: true,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'opacity-control',
      type: 'highlight',
      title: 'Adjusting Opacity',
      content: `Use the opacity slider to control how much of the original image shows through.

**Low Opacity (0.3-0.5):**
• See more of the original image
• Better for detailed analysis
• Easier to identify specific features

**High Opacity (0.7-0.9):**
• Heatmap is more prominent
• Better for presentations
• Clearer importance regions

Find the balance that works for your analysis!`,
      targetElement: '[data-testid="opacity-slider"]',
      position: 'left',
      canSkip: true,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'common-patterns',
      type: 'info',
      title: 'Common Patterns & Issues',
      content: `**Good Patterns (Model is working correctly):**
✓ Focus on the main object
✓ Highlighting discriminative features
✓ Ignoring background clutter
✓ Consistent across similar images

**Warning Signs (Potential issues):**
⚠️ Focusing on background
⚠️ Highlighting watermarks or artifacts
⚠️ Ignoring the main subject
⚠️ Inconsistent behavior

**Example Issues:**
• Model trained on watermarked images → focuses on watermark
• Biased training data → focuses on spurious correlations
• Overfitting → focuses on noise patterns`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'quiz-1',
      type: 'quiz',
      title: 'Knowledge Check 1',
      content: 'Test your understanding of Grad-CAM basics.',
      quiz: {
        question: 'What does Grad-CAM use to create the visualization?',
        options: [
          'Only the final prediction scores',
          'Gradients of the target class with respect to feature maps',
          'Random sampling of pixels',
          'The input image pixels directly',
        ],
        correctAnswer: 1,
        explanation: 'Correct! Grad-CAM uses the gradients flowing into the final convolutional layer to weight the feature maps, creating a localization map of important regions.',
      },
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'advanced-usage',
      type: 'info',
      title: 'Advanced Usage',
      content: `**Multi-Class Analysis:**
Generate Grad-CAM for different predicted classes to see what features distinguish them.

**Layer Comparison:**
Compare visualizations from different layers:
• Early layers: edges, textures, colors
• Middle layers: parts, patterns
• Late layers: objects, concepts

**Debugging Workflow:**
1. Generate Grad-CAM for correct predictions
2. Generate for incorrect predictions
3. Compare to find what went wrong
4. Retrain or adjust model accordingly

**Research Applications:**
• Model interpretability papers
• Bias detection studies
• Medical imaging validation
• Autonomous vehicle safety`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'limitations',
      type: 'info',
      title: 'Limitations of Grad-CAM',
      content: `While powerful, Grad-CAM has limitations:

**1. Resolution**
• Coarse localization (not pixel-perfect)
• Limited by convolutional layer resolution
• May miss fine details

**2. Architecture Dependency**
• Requires convolutional layers
• Doesn't work well with attention-based models
• May need adaptation for newer architectures

**3. Interpretation Challenges**
• Heatmap doesn't explain "why"
• Can be misleading if not validated
• Requires domain expertise to interpret

**Alternatives:**
• Saliency Maps (pixel-level)
• Integrated Gradients (more robust)
• LIME (model-agnostic)
• SHAP (game-theoretic)`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'quiz-2',
      type: 'quiz',
      title: 'Knowledge Check 2',
      content: 'Test your understanding of Grad-CAM interpretation.',
      quiz: {
        question: 'If Grad-CAM highlights the background instead of the main object, what might this indicate?',
        options: [
          'The model is working perfectly',
          'The model may have learned spurious correlations',
          'Grad-CAM is broken',
          'The image quality is too high',
        ],
        correctAnswer: 1,
        explanation: 'Correct! When Grad-CAM highlights unexpected regions like the background, it often indicates the model has learned spurious correlations or biases in the training data, rather than focusing on the actual object of interest.',
      },
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
      content: `**For Analysis:**
✓ Test on multiple images
✓ Compare correct vs incorrect predictions
✓ Use appropriate colormaps
✓ Document your findings
✓ Validate with domain experts

**For Presentations:**
✓ Use high-quality images
✓ Choose clear colormaps (Viridis recommended)
✓ Adjust opacity for clarity
✓ Include original image for context
✓ Explain the color scale

**For Debugging:**
✓ Generate for edge cases
✓ Compare across model versions
✓ Check different layers
✓ Look for consistent patterns
✓ Combine with other methods`,
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
      content: `You've mastered Grad-CAM!

**What you learned:**
✓ How Grad-CAM works technically
✓ Generating Grad-CAM visualizations
✓ Interpreting heatmaps correctly
✓ Common patterns and issues
✓ Advanced usage and limitations
✓ Best practices for analysis

**Next Steps:**
• Try the "Comparing Explainability Methods" tutorial
• Experiment with your own models
• Read the Grad-CAM paper (Selvaraju et al., 2017)
• Join our community to share insights

**Earned Rewards:**
🏆 200 points
🎖️ Grad-CAM Expert badge

Keep exploring and building trustworthy AI!`,
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
    points: 200,
    badges: ['gradcam-expert', 'explainability-enthusiast'],
  },
};

// Made with Bob
