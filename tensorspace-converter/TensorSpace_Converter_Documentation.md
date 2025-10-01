# TensorSpace Converter – Technical & Architectural Summary

## 1. Purpose and Positioning
TensorSpace Converter is a preprocessing and model transformation utility that bridges trained deep learning models (TensorFlow, Keras, TensorFlow.js) into a TensorSpace‑compatible multi‑output format suitable for interactive 3D visualization of internal layer activations in the browser. It automates what previously required manual graph surgery: extracting intermediate layer outputs, wrapping them into a derived multi-head model, and exporting artifacts (`model.json` + weight shards) consumable by the TensorSpace JavaScript runtime.

## 2. Core Functional Capabilities
- Model Intake Abstraction:
  - Framework origin flag: `--input_model_from` ∈ {`tensorflow`, `keras`, `tfjs`}.
  - Format specialization via `--input_model_format` to disambiguate serialization variants.
- Automatic Multi‑Output Reconstruction:
  - Generates a derivative model whose outputs are the selected internal layer tensors in user‐defined order (via `--output_layer_names="l1,l2,...,ln"`).
  - Leaves original layer semantics unchanged (purely structural re‑wiring of output heads).
- Format Normalization & Export:
  - Converts the multi-output representation into TensorFlow.js graph format (`model.json` + weight shards) through `tensorflowjs` / `tfjs-converter`.
- CLI Orchestration:
  - Single entrypoint executable: `tensorspacejs_converter`.
  - Deterministic, scriptable pipeline for batch conversion.
- Cross‑Framework Coverage:
  - TensorFlow (SavedModel, Frozen Graph `.pb`, tf.keras combined HDF5, separated topology+weights).
  - Native Keras (combined `.h5`; separated `.json` + `.h5`).
  - TensorFlow.js (topology `.json` + weights `.bin`).
- Visualization Readiness:
  - Output consumed directly in browser through TensorSpace:  
    ```javascript
    model.load({ type: "tensorflow", url: "/PATH/TO/MODEL/model.json" });
    ```
- Docker Support:
  - Provides a Dockerfile plus helper scripts (`init_docker_converter.sh`, `run_docker_converter.sh`) for reproducible, isolated runtime environments.

## 3. Supported Input Model Formats (Granular Matrix)

| Origin (`--input_model_from`) | `--input_model_format` (examples) | Input Artifact Pattern | Notes |
|-------------------------------|------------------------------------|------------------------|-------|
| tensorflow                    | `tf_keras`                         | Single `model.h5`      | tf.keras combined topology + weights |
| tensorflow                    | `tf_keras_separated`               | `model.json,weights.h5` (comma-delimited path list) | Separate topology & weight file |
| tensorflow                    | `tf_saved`                         | SavedModel directory   | Standard TF SavedModel folder layout |
| tensorflow                    | `tf_frozen`                        | Frozen graph `.pb`     | Legacy / static graph inference case |
| keras                         | `topology_weights_combined`        | Single `model.h5`      | Native Keras serialization |
| keras                         | `topology_weights_separated`       | `model.json,weights.h5` | Native Keras separated export |
| tfjs                          | (implicit)                         | `model.json` (+ colocated `*.bin` weights) | Loader infers weight shards from JSON |

## 4. CLI Interface Anatomy

Canonical form:
```
tensorspacejs_converter \
  --input_model_from="tensorflow|keras|tfjs" \
  --input_model_format="FORMAT_TOKEN" \
  --output_layer_names="layerA,layerB,...,layerZ" \
  input_path \
  output_path
```

Key semantics:
- `output_layer_names`: Ordered, comma-separated logical layer identifiers; ordering defines sequence of output arrays in exported model.
- `input_path`: Path or comma-concatenated path list (for separated topology/weights).
- `output_path`: Destination directory for TensorSpace-ready artifacts (includes `model.json` + weight shards + any generated metadata).

## 5. Multi‑Output Model Strategy (Conceptual Mechanics)
1. Parse / load original single-output (or existing multi-output) graph.
2. Resolve layer symbols by name → validate existence & topological order.
3. Construct new model instance with:
   - `inputs = original.input`
   - `outputs = [layer.output for layer in ordered_selection]`
4. (For Keras / tf.keras) Avoid retraining; compilation is optional unless continued training is desired.
5. Export to TF.js format (graph transformation → JSON graph spec + partitioned weight tensors).

Benefit:
- Enables granular visualization of internal convolutional maps, pooling reductions, dense activations, and final softmax logits without re-authoring original training code.

## 6. Typical End-to-End Workflow
1. (Optional) Environment bootstrap:  
   `pip install tensorspacejs` → `tensorspacejs_converter -init`
2. Identify target layers (inspect via model `summary()` in Keras / tf.keras).
3. Run converter with correct format token and layer name list.
4. Host produced `model.json` + weight shards on static server path.
5. Load into TensorSpace front-end for 3D interactive exploration.

## 7. Environment & Dependency Profile
- Python runtime: 3.6.x (strict requirement in docs).
- Node.js: ≥ 11.3
- npm: ≥ 6.5
- Core ML libs: TensorFlow, Keras
- Conversion toolchain: `tensorflowjs` / `tfjs-converter`
- Additional Node-side dependencies (implied by badges): `tfjs-node`
- Distribution channel: PyPI package `tensorspacejs`.

Isolation Recommendation:
```
conda create -n tensorspace python=3.6
source activate tensorspace
pip install tensorspacejs
```

## 8. Dockerization
- Provided Dockerfile yields an “out-of-the-box” runtime with pinned versions.
- Workflow:
  - Build/image init: `bash init_docker_converter.sh`
  - Execution: `bash run_docker_converter.sh --work_dir PATH/TO/WORK_DIR`
- Encourages reproducibility and mitigates host Python / Node version conflicts.

## 9. Development Lifecycle
Setup:
```
git clone https://github.com/tensorspace-team/tensorspace-converter.git
cd tensorspace-converter
bash init-converter-dev.sh
npm install
```
Build Python wheel:
```
bash build-pip-package.sh
pip install dist/tensorspacejs-<VERSION>-py3-none-any.whl
```
Test Execution (after granting script permissions):
```
bash ./test/grandPermission.sh
npm run test
```

## 10. Testing Scope (Implied)
- End-to-end tests likely cover CLI invocation across format permutations and structural integrity of produced `model.json` (not directly shown, but consistent with an E2E test entry).
- Permission script suggests executable test assets (possibly shell harnesses invoking conversion pipeline with fixture models).

## 11. Design Considerations & Constraints
- Deterministic export ordering to keep visualization layer alignment stable.
- Strict layer name referencing requires premeditated naming during model definition (encouraged via explicit `name=` fields).
- Avoidance of re-training ensures idempotent transformation (no weight mutation).
- Format divergence handled explicitly through `--input_model_format` tokenization to avert misinterpretation of artifact layouts.
- Separation of concerns: training remains external; this tool only orchestrates structural adaptation + serialization.

## 12. Operational Caveats / Best Practices
- Always verify layer names via `model.summary()` before running converter to prevent silent omission.
- Maintain consistent environment versions (especially TensorFlow vs. tensorflowjs) to avoid incompatibility in serialization schema.
- Ordering in `--output_layer_names` should follow forward computational graph order to ensure intuitive progressive visualization.
- For frozen graphs (`tf_frozen`), ensure graph is properly frozen (variables converted to constants) beforehand.
- For separated topology+weights inputs, paths must be comma-joined with no extraneous whitespace.

## 13. Output Artifact Structure
- `model.json`: Graph topology including multiple output node references.
- `group*-shard*of*` weight files: Binary shards referenced inside `model.json` (`weightsManifest`).
- No additional proprietary metadata required by TensorSpace; consumption relies on standard TF.js loading semantics.

## 14. Integration with TensorSpace
- TensorSpace front-end expects multi-output arrays aligned with declared layers.
- Each activation tensor can be spatially rendered (e.g., conv maps, pooling outputs), enabling pedagogical and diagnostic introspection.

## 15. Ecosystem Role
- Acts as a preprocessing “compiler” stage in a visualization pipeline:
  Train (any supported framework) → Convert (this tool) → Visualize (TensorSpace).
- Reduces barrier for model explainability and educational demos by eliminating manual graph editing.

## 16. Licensing & Governance
- Licensed under Apache 2.0 (per LICENSE badge & repository metadata) allowing permissive commercial and derivative use.
- Open contribution model; contributor section managed (likely via all-contributors spec, partially visible).

## 17. Use Cases
- Educational demonstrations (e.g., LeNet / MNIST layered activation exploration).
- Model debugging (intermediate feature inspection without ad-hoc Python probing).
- Documentation assets for research / product teams.
- Interactive presentations / workshops.

## 18. Limitations (Based on Available Documentation)
- Current docs emphasize Python 3.6; no explicit statement on broader Python 3.x support (may be outdated relative to modern environments).
- No direct mention of ONNX, PyTorch, or JAX; unsupported without intermediate conversion.
- Requires explicit layer naming discipline for predictable visualization ordering.
- Does not modify or optimize weights for size reduction beyond what tfjs-converter normally performs (e.g., quantization not described).

## 19. Security / Reproducibility Notes
- Deterministic artifact generation relies on stable upstream TensorFlow / Keras versions; unpinned environments could produce subtly different `model.json` op encodings.
- Docker path recommended for reproducible builds in CI or educational distribution scenarios.

## 20. High-Level Conceptual Pipeline (Abstracted)
(Load + Inspect) → (Select Layers) → (Generate Multi-Head Model) → (Export TF.js Graph) → (Serve Files) → (TensorSpace Load & Render)

---