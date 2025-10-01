import { sleep, lerpColor } from './utils.js';

export class NNVisualizer {
  constructor(engine, network, callbacks={}) {
    this.engine = engine;
    this.network = network;
    this.callbacks = callbacks;
    this.scene = new BABYLON.Scene(engine);
    this.isRunning = false;
    this.viewMode = 'combined';
    this.speedMultiplier = 1; // 1x default
    this._cycleToken = 0; // cancellation token
    this._fpsAcc = 0; this._fpsFrames = 0; this._lastFpsUpdate = 0;
    this.lastFrameTime = performance.now();

    this._buildScene();
  }

  _buildScene() {
    const scene = this.scene;
    scene.clearColor = new BABYLON.Color4(0.06,0.08,0.11,1);

    // Camera
    this.camera = new BABYLON.ArcRotateCamera('camera', -Math.PI/2.2, Math.PI/2.4, 18, new BABYLON.Vector3(0, 0, 0), scene);
    this.camera.lowerRadiusLimit = 5;
    this.camera.upperRadiusLimit = 50;
    this.camera.wheelDeltaPercentage = 0.02;
    this.camera.attachControl(this.engine.getRenderingCanvas(), true);

    // Light
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0,1,0), scene);
    light.intensity = 0.9;

    this.neuronMeshes = { input: [], hidden: [], output: [] };
    this.connectionMeshes = [];

    const layerX = { input: -6, hidden: 0, output: 6 };

    const sphereMatBase = new BABYLON.StandardMaterial('sphereBase', scene);
    sphereMatBase.diffuseColor = new BABYLON.Color3(0.15,0.25,0.35);
    sphereMatBase.emissiveColor = new BABYLON.Color3(0.05,0.08,0.1);
    sphereMatBase.specularColor = new BABYLON.Color3(0.2,0.2,0.2);

    // Create neurons
    const createNeuron = (layer, index, total, x) => {
      const ySpacing = 2.2;
      const offset = (total - 1) * ySpacing * 0.5;
      const y = index * ySpacing - offset;
      const mesh = BABYLON.MeshBuilder.CreateSphere(`${layer}-n-${index}`, { diameter: 1 }, scene);
      mesh.position.set(x, y, 0);
      mesh.material = sphereMatBase.clone(`${layer}-mat-${index}`);
      return mesh;
    };

    for (let i=0;i<this.network.inputSize;i++) this.neuronMeshes.input.push(createNeuron('input', i, this.network.inputSize, layerX.input));
    for (let j=0;j<this.network.hiddenSize;j++) this.neuronMeshes.hidden.push(createNeuron('hidden', j, this.network.hiddenSize, layerX.hidden));
    for (let k=0;k<this.network.outputSize;k++) this.neuronMeshes.output.push(createNeuron('output', k, this.network.outputSize, layerX.output));

    // Connections input->hidden
    for (let i=0;i<this.network.inputSize;i++) {
      for (let j=0;j<this.network.hiddenSize;j++) {
        this._createConnection(this.neuronMeshes.input[i], this.neuronMeshes.hidden[j]);
      }
    }
    // Connections hidden->output
    for (let j=0;j<this.network.hiddenSize;j++) {
      for (let k=0;k<this.network.outputSize;k++) {
        this._createConnection(this.neuronMeshes.hidden[j], this.neuronMeshes.output[k]);
      }
    }

    // Pre-store base colors for fading
    this._baseNeuronDiffuse = new BABYLON.Color3(0.15,0.25,0.35);
    this._baseNeuronEmissive = new BABYLON.Color3(0.05,0.08,0.1);
    this._baseConnDiffuse = new BABYLON.Color3(0.2,0.25,0.3);
    this._baseConnEmissive = new BABYLON.Color3(0,0,0);

    const fpsEl = document.getElementById('fpsCounter');
    this.engine.runRenderLoop(()=>{
      const now = performance.now();
      const dt = now - this.lastFrameTime; // ms
      this.lastFrameTime = now;
      if (this.isRunning) this._updateFading(dt);
      scene.render();
      // FPS calc (update ~1/sec)
      this._fpsAcc += dt; this._fpsFrames++;
      if (this._fpsAcc >= 1000) {
        if (fpsEl) fpsEl.textContent = `FPS: ${ (this._fpsFrames * 1000 / this._fpsAcc).toFixed(0) }`;
        this._fpsAcc = 0; this._fpsFrames = 0;
      }
    });
  }

  _createConnection(meshA, meshB) {
    const points = [meshA.position, meshB.position];
    const tube = BABYLON.MeshBuilder.CreateTube(`c-${meshA.name}-${meshB.name}`, { path: points, radius: 0.05 }, this.scene);
    const mat = new BABYLON.StandardMaterial(`mat-${tube.name}`, this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.2,0.25,0.3);
    mat.emissiveColor = new BABYLON.Color3(0,0,0);
    mat.specularColor = new BABYLON.Color3(0.1,0.1,0.1);
    tube.material = mat;
    this.connectionMeshes.push({ mesh: tube, from: meshA, to: meshB, mat });
  }

  async start() { this.isRunning = true; this._loop(); }
  play(){ if(!this.isRunning){ this.isRunning=true; this._loop(); } }
  pause(){
    if (this.isRunning){
      this.isRunning=false;
      this._cycleToken++; // cancel in-flight animation
    }
  }

  setViewMode(mode){
    this.viewMode = mode;
    const root = document.getElementById('app');
    root.classList.remove('view-nodes','view-maps');
    if (mode === 'nodes') root.classList.add('view-nodes');
    else if (mode === 'maps') root.classList.add('view-maps');
    // Resize engine after layout change so canvas updates
    setTimeout(()=> this.engine.resize(), 50);
  }

  setSpeed(mult){ this.speedMultiplier = mult > 0 ? mult : 1; }

  async _loop(){
    while(this.isRunning){
      const token = ++this._cycleToken;
      await this._runForwardPass(token);
      if (!this.isRunning || token !== this._cycleToken) break;
      await this._sleepScaled(800, token);
    }
  }

  async _runForwardPass(token){
    if (!this.isRunning || token !== this._cycleToken) return;
    // Reset visuals
    this._resetVisuals();

    // Random input
    const input = this.network.randomInput();
    if (this.callbacks.onNewInput) this.callbacks.onNewInput(input);

    // Highlight input neurons
    for (let i=0;i<input.length;i++){
      this._pulseNeuron(this.neuronMeshes.input[i], input[i]);
    }
    if (await this._sleepScaled(400, token)) return;

    // Compute forward pass values (no animation yet)
    const { hidden, output } = this.network.forward(input);

    // Animate input->hidden layer by hidden neuron
    for (let j=0;j<hidden.length;j++){
      // highlight connections feeding hidden j
      const targetMesh = this.neuronMeshes.hidden[j];
      const incoming = this.connectionMeshes.filter(c=>c.to===targetMesh);
      if (await this._pulseConnections(incoming, hidden[j], token)) return;
      this._pulseNeuron(targetMesh, hidden[j]);
      if (this.callbacks.onHiddenActivation) this.callbacks.onHiddenActivation(j, hidden[j]);
      if (await this._sleepScaled(300, token)) return;
    }

    // Animate hidden->output (only 1 output)
    for (let k=0;k<output.length;k++){
      const target = this.neuronMeshes.output[k];
      const incoming = this.connectionMeshes.filter(c=>c.to===target);
      if (await this._pulseConnections(incoming, output[k], token)) return;
      this._pulseNeuron(target, output[k]);
      if (this.callbacks.onOutputActivation) this.callbacks.onOutputActivation(output[k]);
      if (await this._sleepScaled(400, token)) return;
    }
  }

  _resetVisuals(){
    const resetMat = (m)=>{ m.material.emissiveColor = new BABYLON.Color3(0.05,0.08,0.1); m.material.diffuseColor = new BABYLON.Color3(0.15,0.25,0.35); };
    [...this.neuronMeshes.input, ...this.neuronMeshes.hidden, ...this.neuronMeshes.output].forEach(resetMat);
    this.connectionMeshes.forEach(c=>{ c.mat.emissiveColor = new BABYLON.Color3(0,0,0); c.mat.diffuseColor = new BABYLON.Color3(0.2,0.25,0.3); });
  }

  _pulseNeuron(mesh, value){
    const intensity = Math.min(1, value);
    const col = this._colorFromValue(intensity);
    mesh.material.emissiveColor = col;
    mesh.material.diffuseColor = col.scale(0.7);
    mesh.metadata = mesh.metadata || {}; mesh.metadata.lastPulse = performance.now();
  }

  async _pulseConnections(connections, value, token){
    const intensity = Math.min(1, value);
    for (const c of connections){
      if (!this.isRunning || token !== this._cycleToken) return true; // cancelled
      const col = this._colorFromValue(intensity);
      c.mat.emissiveColor = col;
      c.mat.diffuseColor = col.scale(0.5);
      c.mesh.metadata = c.mesh.metadata || {}; c.mesh.metadata.lastPulse = performance.now();
      if (await this._sleepScaled(80, token)) return true;
    }
    return false;
  }

  _colorFromValue(v){
    const hex = lerpColor('#0044ff', '#ff2222', Math.max(0,Math.min(1,v||0)) );
    const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    const r = parseInt(rgb[1],16)/255, g = parseInt(rgb[2],16)/255, b = parseInt(rgb[3],16)/255;
    return new BABYLON.Color3(r,g,b);
  }

  async _sleepScaled(baseMs, token){
    const actual = baseMs / this.speedMultiplier;
    let elapsed = 0; const step = 20;
    while(elapsed < actual){
      if (!this.isRunning || token !== this._cycleToken) return true; // cancelled
      const remain = Math.min(step, actual - elapsed);
      await sleep(remain);
      elapsed += remain;
    }
    return false;
  }

  _updateFading(dt){
    const now = performance.now();
    const fadeNeuron = 0.92; // per-frame fade factor when not recently pulsed
    const fadeConn = 0.90;
    const recentWindow = 180; // ms window treated as active
    const applyFade = (mat, baseDiffuse, baseEmissive, factor)=>{
      mat.emissiveColor = new BABYLON.Color3(
        baseEmissive.r + (mat.emissiveColor.r - baseEmissive.r)*factor,
        baseEmissive.g + (mat.emissiveColor.g - baseEmissive.g)*factor,
        baseEmissive.b + (mat.emissiveColor.b - baseEmissive.b)*factor,
      );
      mat.diffuseColor = new BABYLON.Color3(
        baseDiffuse.r + (mat.diffuseColor.r - baseDiffuse.r)*factor,
        baseDiffuse.g + (mat.diffuseColor.g - baseDiffuse.g)*factor,
        baseDiffuse.b + (mat.diffuseColor.b - baseDiffuse.b)*factor,
      );
    };
    const neuronSets = [...this.neuronMeshes.input, ...this.neuronMeshes.hidden, ...this.neuronMeshes.output];
    neuronSets.forEach(mesh=>{
      const last = mesh.metadata?.lastPulse || 0;
      if (now - last > recentWindow){
        applyFade(mesh.material, this._baseNeuronDiffuse, this._baseNeuronEmissive, fadeNeuron);
      }
    });
    this.connectionMeshes.forEach(c=>{
      const last = c.mesh.metadata?.lastPulse || 0;
      if (now - last > recentWindow){
        applyFade(c.mat, this._baseConnDiffuse, this._baseConnEmissive, fadeConn);
      }
    });
  }
}
