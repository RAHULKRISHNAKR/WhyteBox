# ⚡ Quick Reference Card - Interactive Model Converter

## 🚀 Run It
```powershell
cd backend
python examples\interactive_converter.py
```

## 📋 Model List (20 Models)

| # | Model | Params | Type |
|---|-------|--------|------|
| 1 | VGG16 | 138M | Classic |
| 2 | VGG19 | 144M | Classic |
| 3 | ResNet18 | 11.7M | Residual |
| 4 | ResNet34 | 21.8M | Residual |
| 5 | ResNet50 | 25.6M | Residual ⭐ |
| 6 | ResNet101 | 44.5M | Residual |
| 7 | DenseNet121 | 8M | Dense |
| 8 | DenseNet161 | 28.7M | Dense |
| 9 | MobileNetV2 | 3.5M | Efficient ⚡ |
| 10 | MobileNetV3-Small | 2.5M | Efficient |
| 11 | MobileNetV3-Large | 5.5M | Efficient |
| 12 | SqueezeNet1_0 | 1.2M | Compact |
| 13 | SqueezeNet1_1 | 1.2M | Compact |
| 14 | AlexNet | 61M | Pioneer |
| 15 | InceptionV3 | 27M | Inception |
| 16 | GoogLeNet | 13M | Inception |
| 17 | ShuffleNetV2 | 2.3M | Shuffle |
| 18 | EfficientNet-B0 | 5.3M | Modern 🔥 |
| 19 | EfficientNet-B1 | 7.8M | Modern |
| 20 | RegNet-Y-400MF | 4.3M | Regularized |

⭐ = Recommended for beginners  
⚡ = Lightweight/Fast  
🔥 = Modern/Popular

## ✨ Features

| Feature | Status |
|---------|--------|
| Smart Caching | ✅ |
| Instant Load (cached) | ✅ |
| Auto-Convert (new) | ✅ |
| Terminal Display | ✅ |
| JSON Export | ✅ |
| 20+ Models | ✅ |

## 🎯 Quick Tips

1. **VGG16 is cached** - Try it first (#1)
2. **ResNet50** - See skip connections (#5)
3. **MobileNetV2** - See efficiency (#9)
4. **EfficientNet** - See modern design (#18)

## 📂 Output Location
```
backend/output/{model_name}_pytorch_visualization.json
```

## 📊 What You See
- Model metadata (name, params, shapes)
- Layer breakdown (type, shape, params, color)
- Connections (layer → layer)
- Architecture analysis
- Visualization hints
- File size & location

## ⚙️ Cache System
```
First Time:  3-10 seconds (converts)
Next Time:   < 1 second  (cached) ⚡
```

## 🔧 Requirements
```
- Python 3.8+
- PyTorch + torchvision
- Backend installed
```

## 📚 Documentation
- `INTERACTIVE_CONVERTER_GUIDE.md` - Full guide
- `INTERACTIVE_DEMO.md` - Demo walkthrough
- `INTERACTIVE_FEATURE_SUMMARY.md` - Technical details

## 🆘 Troubleshooting

**No module 'torch':**
```powershell
pip install torch torchvision
```

**Can't find file:**
```powershell
cd backend  # Must be in backend folder
```

**Model won't convert:**
- Check internet (downloads from PyTorch)
- Check disk space
- Check Python version (3.8+)

## ✅ Quick Checklist

- [ ] Navigate to backend folder
- [ ] Run interactive_converter.py
- [ ] Select a model number
- [ ] Wait for conversion (if new)
- [ ] View details in terminal
- [ ] Find JSON in output folder
- [ ] Load in frontend viz

## 🎉 That's It!

**One command. Twenty models. Infinite possibilities.** 🚀

```powershell
python examples\interactive_converter.py
```
