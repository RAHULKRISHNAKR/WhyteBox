"""
Download ImageNet class labels
"""

import urllib.request
from pathlib import Path

# URL for ImageNet class labels
IMAGENET_CLASSES_URL = "https://raw.githubusercontent.com/pytorch/hub/master/imagenet_classes.txt"

# Save path
utils_dir = Path(__file__).parent
output_path = utils_dir / 'imagenet_classes.txt'

print("Downloading ImageNet class labels...")
try:
    urllib.request.urlretrieve(IMAGENET_CLASSES_URL, output_path)
    print(f"✅ Downloaded to: {output_path}")
    
    # Verify by reading first few classes
    with open(output_path, 'r') as f:
        classes = [line.strip() for line in f.readlines()]
    
    print(f"✅ Loaded {len(classes)} classes")
    print(f"   First 5 classes: {classes[:5]}")
    
except Exception as e:
    print(f"❌ Error downloading: {e}")
    print("You can manually download from:")
    print(IMAGENET_CLASSES_URL)
