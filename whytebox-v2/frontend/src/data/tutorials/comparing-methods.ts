/**
 * Comparing Explainability Methods Tutorial
 * Advanced tutorial on comparing different explainability techniques
 */

import { Tutorial } from '../../types/tutorial';

export const comparingMethodsTutorial: Tutorial = {
  id: 'comparing-methods',
  title: 'Comparing Explainability Methods',
  description: 'Learn how to compare different explainability methods side-by-side and understand when to use each one.',
  category: 'explainability',
  difficulty: 'advanced',
  estimatedTime: 30,
  prerequisites: ['understanding-gradcam'],
  tags: ['comparison', 'saliency', 'integrated-gradients', 'grad-cam', 'advanced'],
  steps: [
    {
      id: 'intro',
      type: 'info',
      title: 'Why Compare Methods?',
      content: `Different explainability methods reveal different aspects of model behavior:

**Each method has strengths:**
• Grad-CAM: Region-level importance
• Saliency Maps: Pixel-level gradients
• Integrated Gradients: Path-integrated attribution
• Guided Backprop: Enhanced gradients

**Why compare:**
✓ Validate findings across methods
✓ Get complementary insights
✓ Choose the right method for your use case
✓ Build confidence in interpretations

**This tutorial teaches:**
• How each method works
• When to use which method
• How to interpret differences
• Best practices for comparison`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'methods-overview',
      type: 'info',
      title: 'Methods Overview',
      content: `**Grad-CAM (Gradient-weighted Class Activation Mapping)**
• Uses: Region-level visualization
• Pros: Coarse localization, class-discriminative
• Cons: Low resolution
• Best for: Understanding which regions matter

**Saliency Maps**
• Uses: Pixel-level importance
• Pros: High resolution, simple
• Cons: Noisy, can be misleading
• Best for: Fine-grained analysis

**Integrated Gradients**
• Uses: Path-integrated attribution
• Pros: Theoretically grounded, robust
• Cons: Computationally expensive
• Best for: Reliable attributions

**Guided Backpropagation**
• Uses: Enhanced gradient visualization
• Pros: Sharp visualizations
• Cons: Not always faithful
• Best for: Visual quality`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'navigate-comparison',
      type: 'action',
      title: 'Open Comparison View',
      content: `Let's start by opening the method comparison interface.

Navigate to the Explainability section where we can:
• Generate multiple methods at once
• View them side-by-side
• Compare their outputs
• Analyze differences

Click on "Explainability" in the sidebar.`,
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
      id: 'enable-comparison',
      type: 'highlight',
      title: 'Enable Comparison Mode',
      content: `Toggle the "Compare Methods" switch to enable side-by-side comparison.

**Comparison Mode Features:**
• Generate multiple methods simultaneously
• View results in a grid layout
• Synchronized zoom and pan
• Difference visualization
• Export all results

This mode is perfect for thorough analysis!`,
      targetElement: '[data-testid="comparison-toggle"]',
      position: 'bottom',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'select-methods',
      type: 'highlight',
      title: 'Select Methods to Compare',
      content: `Choose which methods you want to compare:

**Recommended Combinations:**

**For General Analysis:**
☑️ Grad-CAM
☑️ Integrated Gradients
☑️ Saliency Maps

**For Research:**
☑️ All methods
☑️ Multiple layers
☑️ Different parameters

**For Quick Checks:**
☑️ Grad-CAM
☑️ Saliency Maps

Select at least 2 methods to continue.`,
      targetElement: '[data-testid="method-selector"]',
      position: 'bottom',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'generate-all',
      type: 'action',
      title: 'Generate All Methods',
      content: `Click "Generate All" to create visualizations for all selected methods.

**What happens:**
1. Image is preprocessed once
2. Each method runs in parallel
3. Results are displayed side-by-side
4. Comparison metrics are calculated

This may take 10-30 seconds depending on:
• Number of methods
• Model complexity
• Image size

The progress bar shows the status.`,
      targetElement: '[data-testid="generate-all-button"]',
      position: 'bottom',
      action: {
        type: 'click',
        target: '[data-testid="generate-all-button"]',
      },
      completionCriteria: {
        type: 'action',
      },
    },
    {
      id: 'gradcam-analysis',
      type: 'info',
      title: 'Analyzing Grad-CAM',
      content: `**Grad-CAM Characteristics:**

**Strengths:**
✓ Shows class-discriminative regions
✓ Coarse but reliable localization
✓ Works well for CNNs
✓ Easy to interpret

**What to look for:**
• Broad regions of importance
• Class-specific activations
• Consistent across similar images

**Common Patterns:**
🔴 Hot spots on main objects
🟡 Warm areas on relevant features
🔵 Cool areas on background

**Interpretation:**
If Grad-CAM highlights the right regions, your model is likely focusing on appropriate features.`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'saliency-analysis',
      type: 'info',
      title: 'Analyzing Saliency Maps',
      content: `**Saliency Map Characteristics:**

**Strengths:**
✓ Pixel-level precision
✓ Fast to compute
✓ Shows fine details
✓ Simple gradient-based

**What to look for:**
• Sharp edges and boundaries
• Texture patterns
• Fine-grained features

**Limitations:**
⚠️ Can be noisy
⚠️ May highlight irrelevant pixels
⚠️ Sensitive to input perturbations

**Interpretation:**
Saliency maps show where small changes would most affect the output. High values indicate sensitive pixels.

**Tip:** Use smoothing or thresholding to reduce noise.`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'integrated-gradients-analysis',
      type: 'info',
      title: 'Analyzing Integrated Gradients',
      content: `**Integrated Gradients Characteristics:**

**Strengths:**
✓ Theoretically grounded (axioms)
✓ More robust than raw gradients
✓ Satisfies sensitivity
✓ Implementation invariant

**What to look for:**
• Smooth, coherent attributions
• Less noise than saliency
• Balanced importance scores

**How it works:**
Integrates gradients along a path from a baseline (usually zeros) to the input, accumulating importance.

**Interpretation:**
Shows cumulative contribution of each pixel to the prediction. More reliable than simple gradients.

**Best for:**
• Research and publications
• High-stakes decisions
• Validating other methods`,
      codeSnippet: {
        language: 'python',
        code: `# Integrated Gradients formula
def integrated_gradients(model, input, baseline, steps=50):
    # Interpolate between baseline and input
    alphas = np.linspace(0, 1, steps)
    interpolated = [baseline + alpha * (input - baseline) 
                   for alpha in alphas]
    
    # Compute gradients at each step
    gradients = [compute_gradient(model, x) 
                for x in interpolated]
    
    # Integrate (average) and scale
    avg_gradients = np.mean(gradients, axis=0)
    integrated = (input - baseline) * avg_gradients
    
    return integrated`,
        editable: false,
      },
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'comparison-grid',
      type: 'highlight',
      title: 'Comparison Grid View',
      content: `The grid shows all methods side-by-side for easy comparison.

**Grid Features:**
• Synchronized zoom/pan
• Individual method labels
• Colormap indicators
• Opacity controls per method

**How to use:**
1. Look for agreement between methods
2. Identify unique insights from each
3. Note any contradictions
4. Consider method characteristics

**Agreement = Confidence:**
When multiple methods highlight the same regions, you can be more confident in the interpretation.`,
      targetElement: '[data-testid="comparison-grid"]',
      position: 'top',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'quiz-1',
      type: 'quiz',
      title: 'Knowledge Check 1',
      content: 'Test your understanding of method characteristics.',
      quiz: {
        question: 'Which method provides the most theoretically grounded attributions?',
        options: [
          'Grad-CAM',
          'Saliency Maps',
          'Integrated Gradients',
          'Guided Backpropagation',
        ],
        correctAnswer: 2,
        explanation: 'Correct! Integrated Gradients is based on axiomatic principles (sensitivity and implementation invariance) and provides more theoretically grounded attributions than gradient-based methods.',
      },
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'interpreting-differences',
      type: 'info',
      title: 'Interpreting Differences',
      content: `**When methods agree:**
✓ High confidence in interpretation
✓ Robust findings
✓ Reliable for decision-making

**When methods disagree:**

**Case 1: Resolution Difference**
• Grad-CAM: Broad regions
• Saliency: Fine details
• Both can be correct at different scales

**Case 2: Method Characteristics**
• Saliency: Noisy but detailed
• Integrated Gradients: Smooth but accurate
• Different trade-offs

**Case 3: Potential Issues**
⚠️ Model instability
⚠️ Adversarial examples
⚠️ Method limitations

**What to do:**
1. Understand each method's strengths
2. Look for consistent patterns
3. Validate with domain knowledge
4. Use multiple methods for important decisions`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'difference-visualization',
      type: 'highlight',
      title: 'Difference Visualization',
      content: `The difference view shows where methods disagree:

**Color Coding:**
🟢 Green = Methods agree (high confidence)
🟡 Yellow = Moderate agreement
🔴 Red = Methods disagree (investigate)

**Use cases:**
• Identify uncertain regions
• Find method-specific artifacts
• Validate interpretations
• Debug model behavior

**Interpretation:**
• Large differences → investigate further
• Small differences → normal variation
• Systematic patterns → method bias

Click "Show Differences" to enable this view.`,
      targetElement: '[data-testid="difference-toggle"]',
      position: 'bottom',
      canSkip: true,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'method-selection-guide',
      type: 'info',
      title: 'Method Selection Guide',
      content: `**Choose Grad-CAM when:**
✓ You need region-level understanding
✓ Working with CNNs
✓ Want class-discriminative visualization
✓ Need fast computation

**Choose Saliency Maps when:**
✓ You need pixel-level detail
✓ Want to see fine features
✓ Speed is critical
✓ Doing quick checks

**Choose Integrated Gradients when:**
✓ You need reliable attributions
✓ Working on research
✓ Making high-stakes decisions
✓ Want theoretical guarantees

**Use Multiple Methods when:**
✓ Validating findings
✓ Publishing results
✓ Debugging models
✓ Building trust

**Avoid:**
✗ Using only one method
✗ Ignoring method limitations
✗ Over-interpreting results
✗ Skipping validation`,
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
      content: 'Test your understanding of method selection.',
      quiz: {
        question: 'When should you use multiple explainability methods?',
        options: [
          'Only when one method fails',
          'Never, it\'s redundant',
          'For validation and building confidence',
          'Only for research papers',
        ],
        correctAnswer: 2,
        explanation: 'Correct! Using multiple methods helps validate findings, provides complementary insights, and builds confidence in interpretations. This is important for any serious analysis, not just research.',
      },
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'export-comparison',
      type: 'highlight',
      title: 'Export Comparison',
      content: `Export your comparison for documentation or sharing:

**Export Options:**
• **Side-by-side image** - All methods in one image
• **Individual images** - Separate file per method
• **Difference map** - Disagreement visualization
• **Report PDF** - Complete analysis report

**Includes:**
• Original image
• All visualizations
• Method parameters
• Comparison metrics
• Interpretation notes

Perfect for:
• Research papers
• Technical reports
• Team discussions
• Model documentation`,
      targetElement: '[data-testid="export-comparison-button"]',
      position: 'bottom',
      canSkip: true,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'case-study',
      type: 'info',
      title: 'Case Study: Medical Imaging',
      content: `**Scenario:** Diagnosing pneumonia from chest X-rays

**Method Comparison:**

**Grad-CAM:**
• Highlighted lung regions
• Showed class-discriminative areas
• Easy for doctors to interpret

**Saliency Maps:**
• Revealed fine texture patterns
• Showed edge details
• Helped identify specific features

**Integrated Gradients:**
• Provided robust attributions
• Validated other methods
• Used for final decision

**Outcome:**
All methods agreed on the affected lung region, building confidence in the model's diagnosis.

**Key Lesson:**
Multiple methods provide complementary insights and increase trust in AI-assisted diagnosis.`,
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
      content: `**For Comparison:**
✓ Use at least 2-3 methods
✓ Understand each method's strengths
✓ Look for agreement patterns
✓ Investigate disagreements
✓ Document your findings

**For Interpretation:**
✓ Consider method characteristics
✓ Validate with domain knowledge
✓ Use appropriate colormaps
✓ Adjust parameters carefully
✓ Don't over-interpret

**For Communication:**
✓ Show multiple methods
✓ Explain differences
✓ Highlight agreements
✓ Provide context
✓ Be transparent about limitations

**Common Pitfalls:**
✗ Relying on single method
✗ Ignoring contradictions
✗ Over-interpreting noise
✗ Skipping validation
✗ Cherry-picking results`,
      position: 'center',
      canSkip: false,
      completionCriteria: {
        type: 'manual',
      },
    },
    {
      id: 'advanced-techniques',
      type: 'info',
      title: 'Advanced Techniques',
      content: `**Ensemble Interpretation:**
Combine multiple methods for robust interpretation:
• Average attributions
• Weighted combination
• Consensus regions

**Quantitative Comparison:**
Measure method agreement:
• Correlation coefficients
• Intersection over Union (IoU)
• Structural similarity (SSIM)

**Sensitivity Analysis:**
Test method stability:
• Add noise to input
• Vary parameters
• Check consistency

**Layer-wise Comparison:**
Compare methods at different layers:
• Early layers: low-level features
• Middle layers: mid-level patterns
• Late layers: high-level concepts

**Cross-Model Validation:**
Compare same method across models:
• Identify model-specific patterns
• Validate architecture choices
• Understand model differences`,
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
      content: `You've mastered explainability method comparison!

**What you learned:**
✓ Characteristics of each method
✓ When to use which method
✓ How to compare methods effectively
✓ Interpreting agreements and differences
✓ Best practices for analysis
✓ Advanced comparison techniques

**You can now:**
• Choose appropriate methods
• Validate interpretations
• Build confidence in findings
• Communicate results effectively
• Conduct thorough analysis

**Earned Rewards:**
🏆 300 points
🎖️ Explainability Master badge
🎖️ Method Comparison Expert badge

**Next Steps:**
• Apply to your own models
• Explore advanced techniques
• Join research discussions
• Share your insights

You're now an explainability expert! Keep pushing the boundaries of interpretable AI!`,
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
    points: 300,
    badges: ['explainability-master', 'method-comparison-expert', 'advanced-analyst'],
  },
};

// Made with Bob
