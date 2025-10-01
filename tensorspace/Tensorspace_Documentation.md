# TensorSpace.js – Comprehensive Technical Documentation

> Version basis: Repository snapshot as of commit eec8a46524fd3fb4c9f9fba804fa81d592637534 (pushed 2022-12-05). Some code excerpts retrieved are partial (indicated by `/*...*/` or `...`). Where source was truncated in retrieval, behavior is inferred conservatively from surrounding context. No undocumented behavior is speculatively invented.

---

## 1. Purpose & Scope

TensorSpace.js is a browser‑based 3D neural network visualization framework. It:

- Provides Keras‑like APIs for declaratively constructing a visualization graph independent of (but optionally bound to) a real prediction model.
- Loads preprocessed multi‑output (intermediate tensor exposing) models from TensorFlow, Keras, or TensorFlow.js.
- Animates transitions between abstracted (“closed”) and fully expanded (“open”) representations of layer internals.
- Enables exploratory inspection (hover, click, emit visual relations) of intermediate feature maps, dense activations, and outputs.

It is architected atop:
- Three.js (3D scene graph & rendering)
- TensorFlow.js (prediction backend & tensor lifecycle)
- Tween.js (@tweenjs/tween.js) for smooth opening/closing & positional transitions
- Custom internal subsystems for layering, model graph traversal, depth allocation, event wiring, and animation state.

---

## 2. High‑Level Architecture

```
+-----------------------------------------------------------------------------------+
|                  Application / Example Integration Code                           |
|   (e.g. examples/render-in-tfjsvisor/js/index.js, user’s page scripts)            |
+-------------------------------------+---------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                          TensorSpace Public API (TSP)                             |
|  - TSP.models.Sequential / TSP.models.Model                                       |
|  - TSP.layers.* (Input, Conv2d, Pooling2d, Dense, Output1d, …)                    |
|  - model.load({...})  model.init(cb)  model.predict(data, cb)                     |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                   Core Internal Subsystems (selected)                             |
|  AbstractModel / Sequential / Model (Functional)                                  |
|  Layer base (Layer.js) + Native / Output / Intermediate specializations           |
|  MergeProxy + MergedLayerFactory (operator layers: add, avg, concat, etc.)        |
|  Configuration (ModelConfiguration)                                               |
|  Layout & Positioning: LayerLocator, ActualDepthCalculator,                       |
|                        LayerStackGenerator, LevelStackGenerator                   |
|  Animation: MapTransitionFactory, OutputTransitionFactory, Tween pipelines        |
|  Rendering & Scene mgmt: ModelRenderer, Handler3D / ModelHandler3D                |
|  User Interaction: hover/click dispatch, emissive highlighting, relation lines    |
|  Loaders: TfjsLoader, KerasLoader, TfLoader, LiveLoader (lazy-loaded inference)   |
|  Utilities: MathUtils, TextureProvider, ColorUtils, TextHelper, constants         |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+------------------------+    +----------------------+    +------------------------+
|   Three.js Scene       |    | TensorFlow.js Model  |    | Tween.js Animation     |
|  (Meshes, Materials,   |    | (resource tensors,   |    | (Easing loops driving  |
|   Groups, Raycaster)   |    |  disposal)           |    |  geometry transforms)  |
+------------------------+    +----------------------+    +------------------------+
```

---

## 3. Directory Overview (Selected)

| Path                | Role |
|---------------------|------|
| `src/tsp-model/`    | Model abstractions (AbstractModel, Sequential, Model functional variant). |
| `src/layer/`        | Layer base classes + specialized layer types (input/intermediate/output/merge). |
| `src/merge/`        | Merge proxies & validator for multi‑input operations. |
| `src/elements/`     | Low-level visual entities (CloseButton, OutputMap3d, QueueAggregation, etc.). |
| `src/animation/`    | Tween factories controlling opening/closing transitions. |
| `src/utils/`        | Computational helpers (depth calc, stacking, math factorization, constants). |
| `src/configure/`    | ModelConfiguration (global theming & default parameters). |
| `src/event/`        | 3D interaction handlers (ModelHandler3D). |
| `examples/`         | Integration examples (HelloWorld, training visualization, tfjs visor embedding). |
| `docs/`             | Tutorials and preprocessing instructions (Keras, TF, TFJS). |
| `dist/`             | Built distributable bundles (not committed for development changes). |
| `assets/`           | Static images, logos, GIF demonstrations. |

---

## 4. Core Concepts

### 4.1 Model Abstractions
- `AbstractModel`: Base implementing lazy initialization, loader selection (`loadTfjsModel`, `loadKerasModel`, `loadTfModel`, `loadLiveModel`), prediction orchestration, tensor disposal, layer traversal.
- `Sequential`: Linear stack. Depth = number of layers; `initTSPModel()` sequentially assigns previous layer references for non-merged layers.
- `Model`: Functional graph allowing multiple inputs/outputs. Uses level mapping via relation matrices to compute depth per logical layer level (`LevelStackGenerator` + topological expansion).

### 4.2 Layers
All layers inherit (directly or indirectly) from `Layer` (abstract). Key responsibilities:

Attribute categories (from `Layer.js` partial excerpt):
- Identification: `name`, `layerIndex`, `layerType`
- Shape: `inputShape`, `outputShape`, `isShapePredefined`
- Visual state flags: `isOpen`, `isWaitOpen`, `isWaitClose`, `hasCloseButton`
- Timing: `openTime`, `separateTime` (animation durations, scaled via `animeTime` multiplier)
- Material/Color/Opacity: `color`, `minOpacity` (default from `ModelConfiguration.minOpacity`)
- Relations: references to `lastLayer` or merged elements, relation system toggles.

Layer life-cycle methods (override points):
- `loadBasicLayerConfig(config)` – per-layer user overrides (initStatus, color, name, close button, minOpacity, animeTime factor).
- `loadBasicModelConfig(modelConfig)` – global defaults injection if not already set.
- `assemble()` – compute shapes, dimension metadata, feature map arrangement.
- `init(center, actualDepth)` – create Three.js objects (aggregation and optionally segregation or output elements).
- `updateValue()`, `clear()`, `reset()` – state refresh, clearing textures, resetting open/close status.
- `handleClick()`, `handleHoverIn()`, `handleHoverOut()` – event reaction.
- `getBoundingWidth()`, position metrics, and reflow.

Open/Close semantics:
- "Closed" view: aggregated bounding cube (e.g., `QueueAggregation` / collapsed representation).
- "Open" view: decomposed feature maps or output units positioned around centers computed by layout utilities.
- Transition orchestrated by tween factories:
  - `MapTransitionFactory` (feature map expansions for convolutional/pooling layers)
  - `OutputTransitionFactory` (output vector expansion for Output layers)
  
### 4.3 Output Layers (Example: `Output1d`)
Key behaviors (excerpt from Output1d):
- Paging segmentation for large output arrays (`segmentLength`, `queueLength`, `totalSegments`).
- `openLayer()` / `closeLayer()` delegate to `OutputTransitionFactory`.
- Emissive highlighting toggles between aggregated and open output handlers.
- Storage of `outputs` label array (e.g., digits "0"–"9").
- Dynamic bounding width changes when open: close button + extended spread influences layout recomputation (`rearrangeLayerInLevel` triggered after open/close).

### 4.4 Merge Layers & Proxies
- `MergeProxy` defers creation of actual merged visualization until needed, validating shapes using `MergeValidator.validateDimension`.
- Proxy pattern isolates interface from actual layer type determined by operator (add, subtract, concatenate, average, etc.).
- Workflow: collect sources → validate dimensions → instantiate correct merged layer from `MergedLayerFactory` → adopt metrics (width/height/depth/unitLength) → proxy all interaction and lifecycle calls (`updateLayerMetric`, `setEnvironment`, `translateLayer`, etc.).

### 4.5 Configuration
`ModelConfiguration` sets defaults:
- Behavior toggles: `relationSystem`, `textSystem`, `stats`, `hasCloseButton`
- Visual defaults: colors per layer type (e.g., `conv2d: 0xF7FE2E`, `dense: 0x00ff00`)
- Animation/time: `animeTime` (ms), `minOpacity`
- Aggregation strategy: `"average"` or `"max"`
- Theming can be overridden by user-supplied config object passed to model constructor.

### 4.6 Layout & Position Computation
Utilities involved:
- `LayerLocator.calculateLayersPos(layers)` (not shown in retrieved excerpts but referenced) – derive `center` coordinates per layer along model axis (likely X or Z).
- `ActualDepthCalculator.calculateDepths(layers)` – ensures per-layer depth budgets constrained by `MaxDepthInLayer` (constant), to produce consistent perspective and spacing.
- `LayerStackGenerator.createStack(outputs)` – recursively traverses backwards from outputs (handling merges) to build full ordered set of dependent layers.
- `LevelStackGenerator` – constructs adjacency matrix, assigns levels via BFS expansion (`relationMatrix` + `layerLevelLookup`) for functional models; aligns outputs at final depth to produce uniform end plane.

Constants (from `Constant.js`):
- `ModelLayerInterval`: spacing between consecutive layers (Sequential).
- `DefaultCameraPos`, `NeuralBoxLength`, `DefaultMinAlpha` etc. supply scale and camera heuristics.
- `FeatureMapIntervalRatio`, `SideFaceRatio`, `MaxDepthInLayer` influence open-state 3D arrangement.

### 4.7 Animation System
Pattern:
1. Dispose opposing visual element (aggregation vs segregation).
2. Initialize target representation (`layer.initSegregationElements`, `layer.initOutputElement`, etc.).
3. Tween `ratio` from 0 → 1 (or reverse) over `openTime`.
4. On each update, compute interpolated vector delta:
   ```
   tempPos = ratio * (openCenter[i] - closeCenter[i])
   ```
5. Update mesh positions.
6. On completion, add interactive affordances (close button, pagination).
7. Maintain flags (`isWaitOpen`, `isWaitClose`) to prevent conflicting state transitions.

Factories:
- `MapTransitionFactory.openLayer(layer)` / `.closeLayer(layer)`
- `OutputTransitionFactory.openLayer(layer)` / `.closeLayer(layer)`

### 4.8 Event Handling
- `ModelHandler3D` (extends `Handler3D`) centralizes raycast interactions:
  - Hover: find first `hoverable` mesh, call `selectedLayer.handleHoverIn()`, elevate emissive state (opacity boost via `emissive()`).
  - Click: delegates to layer, then triggers layout reflow within layer’s level (functional model) or linear reorder (sequential).
- Emissive pattern: elements expose `emissiveable` and call underlying material opacity modification (e.g., `QueueAggregation.emissive()` increments opacity by 0.2).

### 4.9 Prediction Flow & Tensor Lifecycle
`Model.predict(input, callback)`:
1. `clear()` resets existing prediction results and disposes previous tf.Tensors:
   ```javascript
   for (let i = 0; i < this.predictResult.length; i++) {
       tf.dispose(this.predictResult[i]);
   }
   ```
2. If `resource` (backend tf model) loaded, call `predictor.predict(input)` producing array of intermediate outputs (due to preprocessing multi-output conversion).
3. `updateVis()` iterates layers, feeding appropriate tensor slice or values to each layer’s visualization update routine (not in snippet but implied: e.g. mapping data buffer to texture colors).
4. Callback receives final output’s `dataSync()` result (synchronous extraction — note: consider large outputs overhead).

Memory best practice: always dispose intermediate predictions on subsequent calls to prevent WebGL/JS heap growth.

### 4.10 Model Preprocessing (External Pipeline)
To expose intermediate activations, original single-output model must be transformed into a multi-output graph. Provided via separate Python/pip tool `tensorspacejs_converter`. Example CLI (Keras combined H5):

```shell
tensorspacejs_converter \
  --input_model_from="keras" \
  --input_model_format="topology_weights_combined" \
  --output_node_names="Conv2D_1,MaxPooling2D_1,Conv2D_2,MaxPooling2D_2,Dense_1,Dense_2,Softmax" \
  ./rawModel/combined/mnist.h5 \
  ./convertedModel/
```

Resulting `model.json` lists multiple outputs; associated weight shards accompany it. This matches the sequence of TSP visualization layers so indices align.

### 4.11 Rendering Abstraction
- `ModelRenderer` (skeleton in retrieved excerpt) likely orchestrates:
  - Scene, camera, controls (TrackballControls)
  - Animation loop / requestAnimationFrame
  - Stats toggling (if `stats: true` in configuration)
- Instances obtained through a `RendererFactory.getRenderer(this)` (referenced in `Sequential.initTSPModel()`).
- Layers add their Three.js groups into a scene graph root or container managed by renderer.

### 4.12 Visual Elements
Representative components:
- `QueueAggregation` – collapsed layer cube + wireframe edges (edges geometry overlay).
- `OutputMap3d` – textured mesh mapping activation values onto faces; uses custom canvas updated per value update (Color mapping occurs via `ColorUtils.getAdjustValues`).
- `CloseButton` – cylindrical clickable mesh with alpha-mapped 'X' texture.

### 4.13 Relation System
Though internal rendering calls not shown, architecture hints:
- On hover, `getRelativeElements` queries previous layer (bridge pattern) returning elements for drawing relation lines (e.g., connecting a pooled output back to contributing features).
- Layer provides `provideRelativeElements(request)` methods to interpret:
  - `all: true`
  - or `index: k`
- Enabling/disabling relation lines is governed by `modelConfig.relationSystem`.

### 4.14 Text & Annotation
- Dimensions (width/height) produced via Three.js `TextGeometry` (see `OutputMap3d.showText()`), positioned using helpers (`TextHelper.calcFmWidthTextPos`).
- `textSystem` global toggle.

### 4.15 Pagination (Large Outputs)
`Output1d` supports segmented browsing:
- `segmentLength` sets visible units per page.
- Pagination controls (not in retrieved snippet) shown after open transition when `paging` enabled.
- `segmentIndex` tracks current segment; switching segments triggers subset data mapping.

---

## 5. Public API Summary (Observed)

Below list is based on exposed usage in README/examples; internal code may include more:

Model construction:
```javascript
let model = new TSP.models.Sequential(container[, config]);
let fModel = new TSP.models.Model(container[, config]); // functional variant
```

Model lifecycle:
```javascript
model.add(new TSP.layers.Conv2d({...}));
model.load({ type: "keras" | "tfjs" | "tensorflow" | "live", url: "path/to/model.json", onComplete? });
model.init(callback?);
model.predict(inputTensorOrData, callback?);
model.reset();
model.clear();
model.getPredictionModel(); // returns underlying tf.Model
model.getLayerByName("Conv2D_1");
model.getAllLayers();
```

Layer configuration example (Dense or Output1d):
```javascript
new TSP.layers.Output1d({
    outputs: ["0","1","2","3","4","5","6","7","8","9"],
    units: 10,          // or shape: [10]
    paging: true,
    segmentLength: 5,
    initSegmentIndex: 0,
    initStatus: "open", // or "close"
    minOpacity: 0.25,
    animeTime: 1500
});
```

Layer open/close interaction:
```javascript
let out = model.getLayerByName("Output1d_1");
out.openLayer();
out.closeLayer();
```

---

## 6. Model Initialization Sequence (Sequential)

1. User pushes layers via `add()`.
2. Optional: `load()` invoked to set up loader & mark `hasLoader = true`.
3. `init()`:
   - If loader: asynchronous fetch of model JSON & weights; after load resolves:
     - `initTSPModel()`:
       1. Set `depth = layers.length`.
       2. If loader present: obtain shapes via `LayerShapeGenerator.getShapes(this)`; apply.
       3. Assign `lastLayer` for each non-merged layer.
       4. Call `setEnvironment`, `loadModelConfig`, `setPositionMetrics`.
       5. `assemble()` each layer (calculate dimensions & shape).
       6. `createModelElements()` → centers + depths.
       7. Create renderer & call `renderer.init()`.
       8. `isInitialized = true`.
     - Execute user callback.
   - If no loader: same as above but shape inference relies on user-specified config (e.g., `units`, kernel sizes, etc.) or defaults.

---

## 7. Functional Model Initialization (Model)

Differences vs Sequential:
- Graph creation (`createGraph()`) forms adjacency and collects input/output references.
- BFS over relation matrix to assign level indices.
- Compute `levelCenters` for uniform layering with potential lateral arrangement of parallel branches.
- Rearrangement triggers when a layer opens/closes to maintain consistent spacing within its level (`rearrangeLayerInLevel` invoked by `ModelHandler3D.handleClick`).

---

## 8. Data & Value Propagation

Prediction:
- `predictor.predict(input)` returns ordered array of intermediate tensors matching the user-specified output node ordering from preprocessing.
- Each layer likely indexed into `predictResult` with predetermined mapping (not shown; mapping built during loader shape configuration).
- Layers convert numeric arrays → color values (normalization and minOpacity blending in `ColorUtils.getAdjustValues`).
- For open state, multiple segregation handlers each promote a portion (e.g., per-feature map plane); closed state uses aggregate bounding representation.

---

## 9. Extensibility Guide

### 9.1 Adding a New Layer Type
1. Determine dimensionality: 1D, 2D, 3D, or output; choose correct abstract parent (e.g., `NativeLayer1d`, `NativeLayer2d`, etc.) — not shown but implied by `Dense` referencing "NativeLayer1d".
2. Implement:
   - `assemble()` – derive `inputShape` → `outputShape`, set `unitLength`, `actualWidth/Height/Depth`, open/close centers.
   - `loadLayerConfig(layerConfig)` – parse custom config keys.
   - `loadModelConfig(modelConfig)` – fill defaults if undefined.
   - `getRelativeElements(selectedElement)` – specify upstream relation semantics.
   - Provide visual element constructors (aggregation + segregation handlers).
3. Register color in `ModelConfiguration.color`.
4. If mergeable, ensure `MergeValidator` supports shape (if combining).
5. Test open/close transitions with `MapTransitionFactory` or implement custom tween factory.

### 9.2 Adding a New Loader
1. Create loader class (e.g., `OnnxLoader`) analog to existing ones (not retrieved but pattern clear).
2. Implement `preLoad()` to set `model.hasLoader = true` and `setLoader(this)`.
3. Implement `load()` returning Promise resolving after resource model ready (`resource` assigned).
4. Provide shape extraction for intermediate outputs to feed `LayerShapeGenerator`.

### 9.3 Custom Renderer
If extending beyond TrackballControls / default perspective:
1. Implement new renderer class with same interface (`init()`, `reset()`).
2. Inject via `RendererFactory` (update factory to choose based on config flag).
3. Add VR/AR contexts (hinted by “Next Episode: TensorSpace-VR”).

---

## 10. Performance Considerations

| Concern | Recommendation |
|---------|----------------|
| Tensor memory growth | Always rely on built-in `clear()` before new predictions; if performing rapid streaming predictions, batch disposal or throttling needed. |
| Large Output Layers | Use paging (`paging: true`) to restrict rendered meshes/text. |
| Excess Feature Maps | Cap or decimate representation; consider custom layer mode that aggregates channels (not built-in). |
| Animation CPU | Reduce `animeTime` or skip open transitions for large levels. |
| Overdraw / Fill Rate | Leverage `minOpacity` judiciously; transparent materials incur cost. |
| Raycasting Load | On large scenes, segment interactive objects into layers to short-circuit early. |
| Texture Updates | Reuse Canvas objects and only flag `needsUpdate` when value arrays actually change (current design does per-prediction). |

---

## 11. Error Handling & Diagnostics

Observed patterns:
- Validation via console errors (e.g., unsupported `initStatus`, invalid `aggregationStrategy`).
- Missing mandatory config (e.g., Output1d requiring `units` or `shape`) triggers `console.error`.
- Merge dimension validation: `MergeValidator.validateDimension` called before constructing actual merged layer.

Suggested enhancements:
- Throw Exceptions instead of console-only for programmatic integration.
- Add debug overlay if `stats: true` to also show layer shape mapping.

---

## 12. Security & Sandbox Notes

- Runs fully client-side; loading remote model JSON/weights must respect CORS.
- Avoid injecting user-controlled strings into `TextGeometry` without sanitization if embedding multi-user content.
- WebGL context exhaustion: multiple tabs with large models may cause GPU resource limits; graceful fallback recommended.

---

## 13. Example Walkthrough (Hello World LeNet)

Minimal pattern:

```javascript
let container = document.getElementById("container");
let model = new TSP.models.Sequential(container);

model.add(new TSP.layers.GreyscaleInput());
model.add(new TSP.layers.Padding2d());
model.add(new TSP.layers.Conv2d());
model.add(new TSP.layers.Pooling2d());
model.add(new TSP.layers.Conv2d());
model.add(new TSP.layers.Pooling2d());
model.add(new TSP.layers.Dense());
model.add(new TSP.layers.Dense());
model.add(new TSP.layers.Output1d({
  outputs: ["0","1","2","3","4","5","6","7","8","9"]
}));

model.load({
  type: "tensorflow",
  url: "./convertedModel/model.json"
});

model.init(function() {
  console.log("Model initialized");
  model.predict(image_5); // image_5 must match preprocessed input shape
});
```

Flow:
1. `add()` populates layer list (no shapes yet).
2. `load()` sets loader; underlying multi-output TensorFlow model fetched.
3. `init()` triggers shape resolution, assembly, layer positioning & renderer setup.
4. `predict()` updates input layer first, then iterates each successive layer’s visualization surfaces.

---

## 14. Advanced Integration (tfjs Visor Example)

From `examples/render-in-tfjsvisor/js/index.js`:
- Embeds model inside TensorFlow.js Visor surface (DOM container pass-through).
- Uses `onComplete` loader callback to populate `tfvis.show.modelSummary(summarySurface, tspModel.getPredictionModel())`.
- Synchronizes prediction confidences to a Chart.js bar chart (not fully shown in excerpt).
- Demonstrates decoupling: TensorSpace container can be any DOM node (no global assumptions).

Key integration pattern:
```javascript
tspModel = new TSP.models.Sequential(surface.drawArea, { stats: true });
tspModel.load({ type: "tfjs", url: "./model/mnist.json", onComplete: () => {
   tfvis.show.modelSummary(summarySurface, tspModel.getPredictionModel());
}});
tspModel.init();
```

---

## 15. Theming & Customization

- Override colors globally at model construction:
  ```javascript
  let themedModel = new TSP.models.Sequential(container, {
    color: { conv2d: 0xffaa00, dense: 0x0055ff, background: 0x111111 }
  });
  ```
- Per layer override:
  ```javascript
  new TSP.layers.Conv2d({ color: 0xabcdef, initStatus: "open", minOpacity: 0.3 });
  ```

---

## 16. Testing Strategy (From CONTRIBUTING.md Hints)

- `test/` directory intended for unit tests per module, currently needing contributions.
- Contributors asked to run `npm test` before PR; indicates existence of test harness (likely mocha/jest) though not included in snippet.
- Recommendation: Provide headless WebGL mocks for rendering tests and tf.js tensor stubbing.

---

## 17. Potential Improvement Areas (Roadmap Suggestions)

| Category | Enhancement |
|----------|-------------|
| API | Promise-based `init()` returning readiness instead of callback. |
| Performance | Batched GPU updates; reuse geometry for identical sized feature maps with instancing. |
| Accessibility | Add ARIA-friendly textual summary of model structure. |
| VR Extension | Integration with WebXR (hinted by “TensorSpace-VR”). |
| Diagnostics | Built-in layer activation histogram overlays. |
| Loader Coverage | Add ONNX, PyTorch (TorchScript) to expand pipeline (requires intermediate tensor extraction strategy). |
| Error Surfaces | Structured error objects rather than console-only. |
| TypeScript | Provide `.d.ts` or migrate to TS for better API discoverability. |
| Layout | Adaptive camera framing based on total bounding box (auto-fitting on open transitions). |

---

## 18. Glossary

| Term | Definition |
|------|------------|
| Aggregation Element | Single cube representing collapsed layer state. |
| Segregation Elements | Individual feature map (or neuron) meshes displayed when layer is open. |
| Open/Close | Binary visualization state toggled via transitions. |
| Loader | Adapter fetching preprocessed model JSON and weights to produce `resource` tf.Model. |
| Resource | Underlying multi-output tf.Model used for predictions. |
| Predict Result | Array of tensors representing intermediate outputs aligned to layer order. |
| Relation System | Visual connectors drawn between related upstream representations. |
| Unit Length | Base linear size scalar for consistency across layer geometries. |

---

## 19. Selected Code Excerpts (For Context)

Layer basic config loading (excerpt):
```javascript
loadBasicLayerConfig: function(config) {
  if (config.initStatus === "open") { this.initStatus = "open"; this.isOpen = true; }
  else if (config.initStatus === "close") { this.initStatus = "close"; this.isOpen = false; }
  // color, name, closeButton, animeTime, minOpacity ...
}
```

Output transition interpolation (excerpt):
```javascript
let openTween = new TWEEN.Tween(init).to(end, layer.openTime);
openTween.onUpdate(function() {
  for (let i = 0; i < layer.outputHandler.outputLength; i++) {
    poses.push({
      x: init.ratio * (openPos.x - closePos.x),
      y: init.ratio * (openPos.y - closePos.y),
      z: init.ratio * (openPos.z - closePos.z),
    });
  }
  layer.outputHandler.updatePoses(poses);
});
```

Queue aggregation emissive behavior:
```javascript
emissive: function() {
  this.material.opacity += 0.2;
  this.material.needsUpdate = true;
},
darken: function() {
  this.material.opacity -= 0.2;
  this.material.needsUpdate = true;
}
```

Tensor disposal pattern:
```javascript
clear: function() {
  if (this.predictResult !== undefined) {
    for (let i = 0; i < this.predictResult.length; i++) {
      tf.dispose(this.predictResult[i]);
    }
    this.predictResult = undefined;
  }
  // Clear each layer visualization...
}
```

---

## 20. Edge Cases & Caveats

| Situation | Behavior / Concern |
|-----------|--------------------|
| Opening multiple large layers quickly | Layout recalculations may cascade; debounce advisable if extending. |
| Missing `units` in `Output1d` config | Logs error; width remains undefined; downstream assembly may fail. |
| Setting `initStatus` improperly | Logs console error; defaults not explicitly enforced (risk: undefined state). |
| Large number of feature maps | Potential depth capping via `MaxDepthInLayer`; may cause overlapping if not proportionally scaled. |
| Functional model with cycles | Graph generation expects DAG; cycles could cause infinite BFS or incorrect level assignment (no explicit guard shown). |

---

## 21. Practical Extension Example: Adding “BatchNorm” Layer (Hypothetical Workflow)

1. Create `src/layer/intermediate/BatchNorm.js` extending appropriate native base (likely 1D/2D depending on spatial context).
2. In `assemble()`, adopt `inputShape` from `lastLayer`, output shape equal to input shape.
3. Provide color entry `batchNorm` inside `ModelConfiguration.color` fallback.
4. Add segmentation centers identical to previous layer (acts as pass-through transform) so open state visually matches previous feature arrangement.
5. Implement `updateValue()` to adjust visual mapping if exposing gamma/beta/mean/var overlays (optional).
6. Register export in core layer index file so `new TSP.layers.BatchNorm()` is available.

---

## 22. Conclusion

TensorSpace.js provides a layered, extensible architecture for introspecting neural network behavior in a 3D environment directly in the browser. Its design balances declarative model visualization with dynamic data-driven animation. By leveraging separation of concerns (loaders, layers, rendering, animation, utilities), new modalities (VR, advanced layer types, alternative backends) can be integrated with minimal disruption.

For deeper dives (beyond retrieved excerpts) refer to:
- Official docs: https://tensorspace.org
- Preprocessing tutorials: Model Preprocessing, Keras / TF / TFJS examples
- Converter repo: https://github.com/tensorspace-team/tensorspace-converter
