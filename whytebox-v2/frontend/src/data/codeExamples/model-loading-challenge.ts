/**
 * Model Loading Challenge
 * Challenge users to implement model loading with proper error handling
 */

import { CodeChallenge } from '../../types/codeExample';

export const modelLoadingChallenge: CodeChallenge = {
  id: 'model-loading-challenge',
  title: 'Model Loading Challenge',
  description: 'Implement a robust model loading function with error handling, device management, and validation. This challenge tests your understanding of PyTorch model loading best practices.',
  category: 'model-loading',
  difficulty: 'beginner',
  language: 'python',
  
  starterCode: `import torch
import torch.nn as nn
from pathlib import Path

def load_model(model_path, model_class, device='cpu'):
    """
    Load a PyTorch model with proper error handling
    
    Args:
        model_path: Path to the model file (.pt or .pth)
        model_class: The model class to instantiate
        device: Device to load the model on ('cpu' or 'cuda')
    
    Returns:
        model: Loaded model in eval mode
    
    Raises:
        FileNotFoundError: If model file doesn't exist
        RuntimeError: If model loading fails
    """
    # TODO: Implement this function
    # Requirements:
    # 1. Check if file exists
    # 2. Validate device availability
    # 3. Load model state dict
    # 4. Handle loading errors
    # 5. Set model to eval mode
    # 6. Move model to correct device
    
    pass

# Test your implementation
if __name__ == '__main__':
    # Example usage
    class SimpleModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.fc = nn.Linear(10, 2)
        
        def forward(self, x):
            return self.fc(x)
    
    model = load_model('model.pth', SimpleModel, device='cpu')
    print("Model loaded successfully!")
`,

  solution: `import torch
import torch.nn as nn
from pathlib import Path

def load_model(model_path, model_class, device='cpu'):
    """
    Load a PyTorch model with proper error handling
    
    Args:
        model_path: Path to the model file (.pt or .pth)
        model_class: The model class to instantiate
        device: Device to load the model on ('cpu' or 'cuda')
    
    Returns:
        model: Loaded model in eval mode
    
    Raises:
        FileNotFoundError: If model file doesn't exist
        RuntimeError: If model loading fails
    """
    # 1. Check if file exists
    model_path = Path(model_path)
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")
    
    # 2. Validate device availability
    if device == 'cuda' and not torch.cuda.is_available():
        print("CUDA not available, falling back to CPU")
        device = 'cpu'
    
    try:
        # 3. Load model state dict
        checkpoint = torch.load(
            model_path,
            map_location=device,
            weights_only=True  # Security best practice
        )
        
        # 4. Instantiate model
        model = model_class()
        
        # Handle both direct state dict and checkpoint dict
        if isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
            model.load_state_dict(checkpoint['state_dict'])
        else:
            model.load_state_dict(checkpoint)
        
        # 5. Set model to eval mode
        model.eval()
        
        # 6. Move model to correct device
        model = model.to(device)
        
        return model
        
    except Exception as e:
        raise RuntimeError(f"Failed to load model: {str(e)}")

# Test implementation
if __name__ == '__main__':
    class SimpleModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.fc = nn.Linear(10, 2)
        
        def forward(self, x):
            return self.fc(x)
    
    model = load_model('model.pth', SimpleModel, device='cpu')
    print("Model loaded successfully!")
`,

  code: `import torch
import torch.nn as nn
from pathlib import Path

def load_model(model_path, model_class, device='cpu'):
    """
    Load a PyTorch model with proper error handling
    
    Args:
        model_path: Path to the model file (.pt or .pth)
        model_class: The model class to instantiate
        device: Device to load the model on ('cpu' or 'cuda')
    
    Returns:
        model: Loaded model in eval mode
    
    Raises:
        FileNotFoundError: If model file doesn't exist
        RuntimeError: If model loading fails
    """
    # TODO: Implement this function
    pass
`,

  tags: ['pytorch', 'model-loading', 'error-handling', 'best-practices'],
  estimatedTime: 15,
  hasTests: true,
  isExecutable: true,
  requiresBackend: true,
  
  points: 50,
  hints: [
    'Use Path from pathlib to check if the file exists',
    'Check torch.cuda.is_available() before using CUDA',
    'Use map_location parameter in torch.load() to handle device',
    'Remember to call model.eval() to set the model to evaluation mode',
    'Handle both direct state_dict and checkpoint dictionary formats',
  ],
  
  maxAttempts: 3,
  timeLimit: 600, // 10 minutes
  
  testCases: [
    {
      id: 'test-1',
      input: {
        model_path: 'nonexistent.pth',
        model_class: 'SimpleModel',
        device: 'cpu',
      },
      expectedOutput: 'FileNotFoundError',
      description: 'Should raise FileNotFoundError for non-existent file',
    },
    {
      id: 'test-2',
      input: {
        model_path: 'valid_model.pth',
        model_class: 'SimpleModel',
        device: 'cuda',
      },
      expectedOutput: 'model_on_correct_device',
      description: 'Should handle CUDA availability gracefully',
    },
    {
      id: 'test-3',
      input: {
        model_path: 'valid_model.pth',
        model_class: 'SimpleModel',
        device: 'cpu',
      },
      expectedOutput: 'model_in_eval_mode',
      description: 'Should set model to eval mode',
      hidden: false,
    },
  ],
  
  validationRules: {
    minLines: 10,
    maxLines: 100,
    requiredImports: ['torch', 'Path'],
    forbiddenKeywords: [],
  },
  
  explanation: `This challenge teaches important model loading best practices:

**Key Concepts:**
1. **File Validation**: Always check if files exist before loading
2. **Device Management**: Handle CUDA availability gracefully
3. **Error Handling**: Catch and report loading errors clearly
4. **Security**: Use weights_only=True in torch.load()
5. **Flexibility**: Handle both state_dict and checkpoint formats

**Common Mistakes:**
- Not checking file existence
- Assuming CUDA is available
- Not setting model to eval mode
- Not handling different checkpoint formats
- Poor error messages`,
  
  learningObjectives: [
    'Implement robust file handling',
    'Manage PyTorch devices correctly',
    'Handle model loading errors',
    'Apply security best practices',
    'Write defensive code',
  ],
  
  prerequisites: ['Basic Python', 'PyTorch fundamentals'],
  relatedExamples: ['model-saving', 'device-management'],
  
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Made with Bob
