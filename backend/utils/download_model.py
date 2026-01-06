"""
Download and save a pretrained model for inference testing
"""

import torch
import torchvision.models as models
from pathlib import Path

# Create models directory if it doesn't exist
models_dir = Path(__file__).parent.parent / 'models'
models_dir.mkdir(exist_ok=True)

print("Downloading pretrained VGG16 model...")
model = models.vgg16(pretrained=True)
model.eval()  # Set to evaluation mode

# Save the model
model_path = models_dir / 'vgg16_pretrained.pth'
torch.save(model, model_path)

print(f"✅ Model saved to: {model_path}")
print(f"Model size: {model_path.stat().st_size / (1024*1024):.1f} MB")

# Also save just the state dict (smaller file)
state_dict_path = models_dir / 'vgg16_state_dict.pth'
torch.save(model.state_dict(), state_dict_path)

print(f"✅ State dict saved to: {state_dict_path}")
print(f"State dict size: {state_dict_path.stat().st_size / (1024*1024):.1f} MB")

print("\n📝 You can now use this model for inference!")
print(f"   Model path: {model_path.name}")
