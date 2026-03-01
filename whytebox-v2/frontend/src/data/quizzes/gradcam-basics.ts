/**
 * Grad-CAM Basics Quiz
 * Tests fundamental understanding of Grad-CAM explainability method
 */

import { Quiz } from '../../types/quiz';

export const gradcamBasicsQuiz: Quiz = {
  id: 'gradcam-basics',
  title: 'Grad-CAM Fundamentals',
  description: 'Test your understanding of Gradient-weighted Class Activation Mapping (Grad-CAM) and how it helps visualize CNN decisions.',
  category: 'Explainability',
  difficulty: 'medium',
  estimatedTime: 15,
  passingScore: 70,
  tags: ['grad-cam', 'explainability', 'cnn', 'visualization'],
  questions: [
    {
      id: 'q1',
      type: 'multiple-choice',
      difficulty: 'easy',
      question: 'What does Grad-CAM stand for?',
      explanation: 'Grad-CAM stands for Gradient-weighted Class Activation Mapping. It uses gradients flowing into the final convolutional layer to produce a coarse localization map highlighting important regions.',
      points: 10,
      options: [
        { id: 'a', text: 'Gradient-weighted Class Activation Mapping', isCorrect: true },
        { id: 'b', text: 'Gradient Camera Activation Method', isCorrect: false },
        { id: 'c', text: 'Graph-based Class Activation Model', isCorrect: false },
        { id: 'd', text: 'Gradient Convolutional Activation Map', isCorrect: false },
      ],
      tags: ['terminology', 'basics'],
    },
    {
      id: 'q2',
      type: 'true-false',
      difficulty: 'easy',
      question: 'Grad-CAM can only be applied to image classification tasks.',
      explanation: 'False. While Grad-CAM is commonly used for image classification, it can be applied to any CNN-based task including object detection, image captioning, and visual question answering.',
      points: 10,
      correctAnswer: false,
      tags: ['applications', 'basics'],
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      difficulty: 'medium',
      question: 'Which layer does Grad-CAM typically use to generate visualizations?',
      explanation: 'Grad-CAM uses the last convolutional layer because it has the best compromise between high-level semantics and detailed spatial information.',
      points: 15,
      options: [
        { id: 'a', text: 'First convolutional layer', isCorrect: false },
        { id: 'b', text: 'Last convolutional layer', isCorrect: true },
        { id: 'c', text: 'Fully connected layer', isCorrect: false },
        { id: 'd', text: 'Pooling layer', isCorrect: false },
      ],
      hints: [
        'Think about which layer has both semantic and spatial information',
        'The layer should be before the fully connected layers',
      ],
      tags: ['architecture', 'technical'],
    },
    {
      id: 'q4',
      type: 'fill-in-blank',
      difficulty: 'medium',
      question: 'Grad-CAM computes the ___ of the target class score with respect to feature maps.',
      explanation: 'Grad-CAM computes the gradients of the target class score with respect to the feature maps of the last convolutional layer.',
      points: 15,
      template: 'Grad-CAM computes the ___ of the target class score with respect to feature maps.',
      correctAnswers: ['gradients', 'gradient', 'derivatives', 'derivative'],
      caseSensitive: false,
      tags: ['technical', 'computation'],
    },
    {
      id: 'q5',
      type: 'multiple-choice',
      difficulty: 'medium',
      question: 'What is the main advantage of Grad-CAM over CAM (Class Activation Mapping)?',
      explanation: 'Grad-CAM can be applied to any CNN architecture without requiring architectural changes or retraining, unlike CAM which requires a specific architecture with global average pooling.',
      points: 15,
      options: [
        { id: 'a', text: 'It produces higher resolution heatmaps', isCorrect: false },
        { id: 'b', text: 'It works with any CNN architecture without modification', isCorrect: true },
        { id: 'c', text: 'It is faster to compute', isCorrect: false },
        { id: 'd', text: 'It requires less memory', isCorrect: false },
      ],
      hints: [
        'Think about architectural requirements',
        'CAM requires specific architecture changes',
      ],
      tags: ['comparison', 'advantages'],
    },
    {
      id: 'q6',
      type: 'true-false',
      difficulty: 'hard',
      question: 'Grad-CAM heatmaps are class-discriminative, meaning they highlight different regions for different classes.',
      explanation: 'True. Grad-CAM is class-discriminative because it uses gradients specific to the target class, allowing it to highlight different regions for different predicted classes.',
      points: 15,
      correctAnswer: true,
      tags: ['properties', 'advanced'],
    },
    {
      id: 'q7',
      type: 'multiple-choice',
      difficulty: 'hard',
      question: 'In the Grad-CAM formula, what operation is applied to the gradients before weighting the feature maps?',
      explanation: 'Global average pooling is applied to the gradients to obtain the importance weights (alpha) for each feature map. This gives us a single weight per channel.',
      points: 20,
      options: [
        { id: 'a', text: 'Global average pooling', isCorrect: true },
        { id: 'b', text: 'Max pooling', isCorrect: false },
        { id: 'c', text: 'Softmax', isCorrect: false },
        { id: 'd', text: 'Batch normalization', isCorrect: false },
      ],
      allowMultiple: false,
      hints: [
        'We need to reduce spatial dimensions to get channel-wise weights',
        'The operation should give us one value per feature map',
        'Think about averaging operations',
      ],
      tags: ['computation', 'formula', 'advanced'],
    },
    {
      id: 'q8',
      type: 'code-completion',
      difficulty: 'hard',
      question: 'Complete the code to compute Grad-CAM weights (alpha) from gradients:',
      explanation: 'We use global average pooling (mean over spatial dimensions) to compute the importance weight for each channel. The gradients shape is (batch, channels, height, width), and we average over the spatial dimensions (height and width).',
      points: 20,
      codeTemplate: `import torch

def compute_gradcam_weights(gradients):
    """
    Compute Grad-CAM weights from gradients
    gradients shape: (batch, channels, height, width)
    """
    # Global average pooling over spatial dimensions
    weights = ___
    return weights`,
      correctCode: `import torch

def compute_gradcam_weights(gradients):
    """
    Compute Grad-CAM weights from gradients
    gradients shape: (batch, channels, height, width)
    """
    # Global average pooling over spatial dimensions
    weights = torch.mean(gradients, dim=(2, 3))
    return weights`,
      language: 'python',
      tags: ['coding', 'implementation'],
    },
  ],
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
};

// Made with Bob
