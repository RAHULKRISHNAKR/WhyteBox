# 3D Neural Network Visualization (Prototype Step 1)

Minimal proof-of-concept showing a tiny feedforward neural network (<10 nodes) in 3D with synchronized feature map view and animated signal flow.

## Included In This Prototype
- Hardcoded network: 3-3-1 (Input → Hidden (ReLU) → Output (Sigmoid))
- 3D Node View: spheres for neurons, glowing highlight on activation
- Connection View: lines between neurons, lighting up sequentially
- Feature Maps View: side planes showing activation intensity (blue → red)
- Synchronized updates: when a neuron activates its feature map updates
- Animated forward pass with random input vector loop
- Basic controls: rotate/zoom (ArcRotateCamera), Play/Pause, View toggle (Nodes / Maps / Combined)

## Not Included Yet (Future Steps)
- Larger / dynamic architectures
- CNN feature maps / layers
- XAI overlays (gradients, attention, saliency)
- Chatbot / model editing
- Dataset integration

## Quick Start
Just serve this folder with any static file server and open `index.html`.

### Option 1: VS Code Live Server Extension
1. Open the folder `prototype-3d-nn` in VS Code
2. Right click `index.html` → "Open with Live Server"

### Option 2: Node (npx serve)
```powershell
npx serve .
```
Then open the reported local URL.

### Option 3: Python (if installed)
```powershell
python -m http.server 8080
```
Open: http://localhost:8080/prototype-3d-nn/

## Controls
| Control | Action |
|---------|--------|
| Mouse Left Drag | Rotate camera |
| Mouse Wheel / Pinch | Zoom |
| Play / Pause | Start/stop animation loop |
| View Toggle | Cycle Node / Feature Maps / Combined |

## Code Structure
```
prototype-3d-nn/
  index.html          # Entry page loading Babylon.js + scripts
  style.css           # Basic layout + UI styling
  src/
    nnVisualizer.js   # Scene creation & animation orchestration
    network.js        # Dummy network data + forward pass
    utils.js          # Helpers (color mapping, sleep, etc.)
```

## Implementation Notes
- Weights are randomized on load; new random input per loop
- Activations use: ReLU for hidden, Sigmoid for output
- Feature map planes (Hidden layer: 3, Output: 1) colored by activation value
- Color scale: Blue (#0044ff) at 0 → Red (#ff2222) at 1, linear interpolation
- Animation sequence:
  1. Highlight inputs
  2. For each input→hidden connection group (one hidden neuron at a time): light lines → activate neuron → update feature map
  3. After all hidden neurons processed, process hidden→output lines similarly
  4. Output neuron activates, output map updates
  5. Short delay → repeat with new random input

## Extending Later
Future upgrades can hook into the `Network` class to:
- Accept dynamically built architectures
- Visualize convolutional feature maps (as grids/volumes)
- Add attention flows or gradient backprop animations
- Integrate TensorSpace for richer layer abstractions

## License
Prototype code released under MIT (inherits repository root license context). Babylon.js served via CDN under its license.

## Feedback
Open an issue or leave comments to iterate for Step 2.
