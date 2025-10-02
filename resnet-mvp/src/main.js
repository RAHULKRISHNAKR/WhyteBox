import { buildPseudoResNet, forwardPseudoResNet } from './model.js';
import { FeatureMapEmulator } from './mapsEmu.js';
import { NodeGraph } from './nodeGraph.js';

const toggleBtn = document.getElementById('toggleViewBtn');
const runBtn = document.getElementById('runBtn');
const randomInputBtn = document.getElementById('randomInputBtn');
const layout = document.getElementById('layout');
const inputInfo = document.getElementById('inputInfo');
const outputInfo = document.getElementById('outputInfo');
const perfInfo = document.getElementById('perfInfo');
const status = document.getElementById('status');

let mode = 'maps';
let running = false;

// Build pseudo model definition
const modelDef = buildPseudoResNet();

// Initialize views
const featureMapView = new FeatureMapEmulator(document.getElementById('tsCanvas'), modelDef);
const nodeGraph = new NodeGraph(document.getElementById('nodeCanvas'), modelDef);

let currentInput = randomInput();
renderInput(currentInput);

function randomInput(){
  // Simulate a 224x224x3 input collapsed into a small vector for MVP
  return Array.from({length:12}, ()=>Math.random());
}

async function runForward(){
  if (running) return; running = true; status.textContent = 'Running';
  const t0 = performance.now();
  const activations = forwardPseudoResNet(modelDef, currentInput);
  const t1 = performance.now();

  // Update feature maps emulator
  featureMapView.update(activations);
  // Animate in node graph
  await nodeGraph.animate(activations);

  const output = activations[activations.length-1];
  renderOutput(output);
  perfInfo.textContent = (t1 - t0).toFixed(2) + ' ms (compute mock)';
  status.textContent = 'Idle'; running = false;
}

function renderInput(inp){
  inputInfo.textContent = '['+ inp.map(v=>v.toFixed(3)).join(', ')+']';
}
function renderOutput(out){
  // Top-k style (k=5)
  const arr = out.map((v,i)=>({i,v})).sort((a,b)=>b.v-a.v).slice(0,5);
  outputInfo.textContent = arr.map(o=>`#${o.i}: ${o.v.toFixed(4)}`).join('\n');
}

// UI events

toggleBtn.addEventListener('click', ()=>{
  mode = mode==='maps' ? 'nodes' : 'maps';
  layout.classList.toggle('mode-maps', mode==='maps');
  layout.classList.toggle('mode-nodes', mode==='nodes');
  toggleBtn.textContent = 'View: ' + (mode==='maps' ? 'Feature Maps' : 'Node Graph');
});

runBtn.addEventListener('click', ()=> runForward());
randomInputBtn.addEventListener('click', ()=>{ currentInput = randomInput(); renderInput(currentInput); });

// Auto first forward
runForward();
