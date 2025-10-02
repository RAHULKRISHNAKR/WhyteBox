# ResNet Node View (Focused Implementation)

Goal: High-fidelity node-level visualization of a ResNet-style architecture (block + internal layers + skip connections) with animated forward signal flow.

This phase intentionally excludes the feature map (TensorSpace-style) view to get the node graph correct first.

## Scope in this Phase
- Represent key internal layers inside each residual block: (Conv -> BN -> ReLU) sequences and projection/identity skip.
- Visual layout: vertical stacking inside a block container; blocks arranged left-to-right by stage.
- Skip connections: curved / elevated arcs from block input to Add node output.
- Animated forward pass: highlight path layer-by-layer including both main and skip path merges.
- Input tensor stub + output classification vector stub (random or simulated until real model integration).

## Planned Stages (Simplified ResNet-50 Skeleton)
- Stem: Conv1 -> BN -> ReLU -> MaxPool
- Stage 2: 3 Bottleneck blocks (64 -> 256)
- Stage 3: 4 Bottleneck blocks (128 -> 512) [Simplified count]
- Stage 4: 6 Bottleneck blocks (256 -> 1024) [Reduced]
- Stage 5: 3 Bottleneck blocks (512 -> 2048)
- Head: GlobalAvgPool -> FC (1000)

## Node Types
- conv, bn, relu, pool, bottleneck (as container), add, gap, fc, input, output

## Animation Cycle
1. Input node pulses.
2. Stem sequence (conv/bn/relu/pool) sequential highlight.
3. For each residual block:
   - Main path layers highlight sequentially.
   - Skip path (identity or projection conv+bn) highlights in parallel tinted differently.
   - Add node pulses after both paths complete.
   - Activation flows to next block.
4. GlobalAvgPool + FC + Output pulses.
5. Loop with new random input vector.

## Interaction Basics
- Hover: show tooltip with layer shape (placeholder shapes initially).
- Click: lock highlight.
- Keyboard: Space toggles play/pause.

## Implementation Notes
- Engine: Babylon.js
- Node geometry: spheres for atomic ops, framed boxes for block containers, arcs/tubes for skip.
- Color scheme: main path (blue→orange gradient), skip path (teal), additive merge (yellow pulse), inactive (slate).

Next: integrate real shape metadata & True ResNet weight/shape ingestion.
