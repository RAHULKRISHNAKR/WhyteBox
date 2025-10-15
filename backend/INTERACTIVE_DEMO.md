# 🎯 Interactive Model Converter - Quick Demo

## What It Does

**Select a model → Automatically converts (if needed) → Displays complete details**

---

## 🖥️ Demo Session

### Step 1: Launch the Tool
```powershell
PS C:\...\WhyteBox\backend> python examples\interactive_converter.py
```

### Step 2: See the Menu
```
======================================================================
🚀 WhyteBox - Interactive Model Converter
======================================================================

📋 Available PyTorch Models:
----------------------------------------------------------------------
  [ 1] VGG16                     ✓ Cached
  [ 2] VGG19                       New
  [ 3] ResNet18                    New
  [ 4] ResNet34                    New
  [ 5] ResNet50                    New
  [ 6] ResNet101                   New
  [ 7] DenseNet121                 New
  [ 8] DenseNet161                 New
  [ 9] MobileNetV2                 New
  [10] MobileNetV3-Small           New
  [11] MobileNetV3-Large           New
  [12] SqueezeNet1_0               New
  [13] SqueezeNet1_1               New
  [14] AlexNet                     New
  [15] InceptionV3                 New
  [16] GoogLeNet                   New
  [17] ShuffleNetV2                New
  [18] EfficientNet-B0             New
  [19] EfficientNet-B1             New
  [20] RegNet-Y-400MF              New

======================================================================
  [0] Exit
======================================================================

🎯 Select a model (enter number): _
```

### Step 3: Select a Model (e.g., type "5" for ResNet50)
```
🎯 Select a model (enter number): 5

======================================================================
Selected: ResNet50
======================================================================

⚠️  No cached output found.
   Converting model now...

🔄 Converting ResNet50...
   Loading model from torchvision...
   Extracting layers and connections...
   Converting to visualization format...
   ✓ Saved to: resnet50_pytorch_visualization.json

✓ Conversion complete!
```

### Step 4: View Complete Model Details
```
======================================================================
📊 Visualization Data: resnet50_pytorch_visualization.json
======================================================================

📋 Model Metadata:
----------------------------------------------------------------------
  Model Name:          ResNet50
  Framework:           PYTORCH
  Total Layers:        177
  Total Parameters:    25,557,032
  Trainable Params:    25,557,032
  Input Shape:         [1, 3, 224, 224]
  Output Shape:        [1, 1000]

📦 Layers (177 total):
----------------------------------------------------------------------
  [  1] conv1                          Conv2d          → [1, 64, 112, 112]      (     9,408 params) #4A90E2
  [  2] bn1                            BatchNorm2d     → [1, 64, 112, 112]      (       128 params) #9B59B6
  [  3] relu                           ReLU            → [1, 64, 112, 112]      (         0 params) #E74C3C
  [  4] maxpool                        MaxPool2d       → [1, 64, 56, 56]        (         0 params) #F5A623
  [  5] layer1.0.conv1                 Conv2d          → [1, 64, 56, 56]        (     4,096 params) #4A90E2
  [  6] layer1.0.bn1                   BatchNorm2d     → [1, 64, 56, 56]        (       128 params) #9B59B6
  [  7] layer1.0.relu                  ReLU            → [1, 64, 56, 56]        (         0 params) #E74C3C
  [  8] layer1.0.conv2                 Conv2d          → [1, 64, 56, 56]        (    36,864 params) #4A90E2
  [  9] layer1.0.bn2                   BatchNorm2d     → [1, 64, 56, 56]        (       128 params) #9B59B6
  [ 10] layer1.0.relu                  ReLU            → [1, 64, 56, 56]        (         0 params) #E74C3C
  ...  [167 more layers]

  Last 3 layers:
  [175] fc                             Linear          → [1, 1000]              (2,049,000 params) #50C878
  [176] avgpool                        AdaptiveAvgPool → [1, 2048, 1, 1]        (         0 params) #F5A623
  [177] flatten                        Flatten         → [1, 2048]              (         0 params) #95A5A6

🔗 Connections (176 total):
----------------------------------------------------------------------
  layer_0 → layer_1 (sequential)
  layer_1 → layer_2 (sequential)
  layer_2 → layer_3 (sequential)
  layer_3 → layer_4 (sequential)
  layer_4 → layer_5 (sequential)
  ... [171 more connections]

🏗️  Architecture Analysis:
----------------------------------------------------------------------
  Type:                ResNet
  Depth:               50
  Skip Connections:    True
  Branches:            True

🎨 Visualization Hints:
----------------------------------------------------------------------
  Layout:              hierarchical
  Camera Position:     [0, 10, 30]
  Layer Spacing:       1.5
  Color Scheme:        layer_type

💾 File Information:
----------------------------------------------------------------------
  Location:            output\resnet50_pytorch_visualization.json
  Size:                78.42 KB
  Format:              JSON

======================================================================
✓ Ready to load in frontend visualization!
======================================================================

⏎ Press Enter to continue...
```

### Step 5: Select Another Model (cached)
```
🎯 Select a model (enter number): 1

======================================================================
Selected: VGG16
======================================================================

✓ Found cached output: vgg16_pytorch_visualization.json
   Loading from cache...

[Instantly displays VGG16 details - no conversion needed!]
```

### Step 6: Exit
```
🎯 Select a model (enter number): 0

👋 Thanks for using WhyteBox! Goodbye.
```

---

## 🎯 Key Features Demonstrated

1. **✓ Cached** - Shows which models are already converted
2. **⚠️ New** - Indicates models that need conversion
3. **Automatic Conversion** - Converts on-the-fly if needed
4. **Instant Loading** - Cached models load immediately
5. **Complete Details** - Full model information displayed
6. **File Ready** - JSON file ready for frontend use

---

## 📊 What You Get

For **EVERY** model, you see:
- Total layers and parameters
- Layer-by-layer breakdown with shapes and colors
- All connections between layers
- Architecture type (VGG, ResNet, etc.)
- Visualization hints for 3D rendering
- File size and location

---

## 🚀 Try It Now!

```powershell
cd backend
python examples\interactive_converter.py
```

**Select any model number (1-20) and see the magic!** ✨

---

## 💡 Pro Tips

1. **Start with #1 (VGG16)** - It's already cached from earlier
2. **Try #5 (ResNet50)** - See skip connections
3. **Try #9 (MobileNetV2)** - See efficient architecture
4. **Try #18 (EfficientNet-B0)** - See modern design

All models are production-ready for 3D visualization! 🎨
