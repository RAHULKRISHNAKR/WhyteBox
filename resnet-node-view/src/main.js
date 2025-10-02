import { ResNetGraphView } from './graphView.js';

const canvas = document.getElementById('renderCanvas');
const playPauseBtn = document.getElementById('playPauseBtn');
const speedBtn = document.getElementById('speedBtn');
const inputVecEl = document.getElementById('inputVec');
const outputVecEl = document.getElementById('outputVec');
const currentLayerEl = document.getElementById('currentLayer');
const statusEl = document.getElementById('status');

const graph = new ResNetGraphView(canvas);
let running = true; let speedIdx=1; const speeds=[0.75,1,1.5,2]; graph.setSpeed(speeds[speedIdx]);

function randomInput(){
  return Array.from({length:16},()=>Math.random());
}
let currentInput = randomInput(); inputVecEl.textContent = formatVec(currentInput);

async function loop(){
  while(true){
    if (running){
      statusEl.textContent='Running';
        await graph.animateForward((node)=>{ currentLayerEl.textContent = `${node.id}\n${node.desc||''}\n${node.shape||''}`; });
      // Simulated output after full pass
      const out = softmax(Array.from({length:1000},(_,i)=>Math.random()* (i%17===0?2:1))); // biased randomness
      outputVecEl.textContent = topK(out,5).map(o=>`#${o.i}: ${o.v.toFixed(4)}`).join('\n');
      currentInput = randomInput(); inputVecEl.textContent = formatVec(currentInput);
      await sleep(800 / (graph.speed||1));
    } else {
      statusEl.textContent='Paused';
      await sleep(120);
    }
  }
}

playPauseBtn.addEventListener('click', ()=>{ running=!running; playPauseBtn.textContent = running? 'Pause' : 'Play'; });

speedBtn.addEventListener('click', ()=>{
  speedIdx = (speedIdx+1)%speeds.length; graph.setSpeed(speeds[speedIdx]);
  speedBtn.textContent = 'Speed: '+speeds[speedIdx]+'x';
});

window.addEventListener('keydown', (e)=>{ if (e.code==='Space'){ running=!running; playPauseBtn.textContent = running? 'Pause' : 'Play'; } });

// Shift + wheel horizontal move convenience
canvas.addEventListener('wheel', (e)=>{ if (e.shiftKey){ graph.camera.target.x += e.deltaY * 0.3; e.preventDefault(); } }, {passive:false});

loop();

function formatVec(v){ return '['+v.slice(0,8).map(x=>x.toFixed(3)).join(', ')+ (v.length>8?', ...]':']'); }
function softmax(arr){ const m=Math.max(...arr); const ex=arr.map(v=>Math.exp(v-m)); const s=ex.reduce((a,b)=>a+b,0); return ex.map(v=>v/s); }
function topK(arr,k){ return arr.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v).slice(0,k); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
