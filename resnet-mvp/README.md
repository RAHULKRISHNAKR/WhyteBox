# ResNet MVP Dual View

This MVP provides two synchronized visualization modes for a (truncated) ResNet-like model:
1. Feature Map View (TensorSpace style) – shows layered convolutional blocks and output classification distribution.
2. Node Graph View (Babylon.js) – simplified graph of major residual blocks with animated forward flow.

A toggle button switches between the views while keeping the latest input + output visible.

## Current Scope
- Loads a small sample image tensor (placeholder random or sample JSON if available)
- Builds a minimal pseudo-ResNet stack (NOT full 50 layers) for faster load
- TensorSpace-style view rendered in a separate container (will later swap to real TensorSpace build or adapter once dist build is added)
- Node Graph view renders block nodes (Conv / Residual Add / Pool / Output)
- Animates signal propagation block-by-block

## Pending / Next Steps
- Integrate actual ResNet50 converted model once tensorspace/dist build becomes available or we add build step.
- Replace random input with real image loader + simple preprocessing (resize, normalize).
- Cross-highlighting: clicking a block in node view highlights corresponding layers in feature map view.
- Performance metrics (time per forward, total params) overlay.
- Attention / channel selection.

## Run
Serve the folder via static server (ES modules needed):
```powershell
cd resnet-mvp
python -m http.server 8090
```
Open: http://localhost:8090/resnet-mvp/

If TensorSpace distribution file gets added under `tensorspace/dist/`, update script tag path in `index.html`.
