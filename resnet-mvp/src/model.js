// Pseudo ResNet block chain definition for MVP (not actual weights, simplified)
export function buildPseudoResNet(){
  // Minimal staged blocks capturing concept: stem -> 3 residual stages -> pool -> fc
  // Each entry: { type, name, sizeIn, sizeOut, channels }
  const layers = [
    { type:'conv', name:'conv1', channels:64 },
    { type:'pool', name:'pool1' },
    { type:'res', name:'res2', repeats:2, channels:64 },
    { type:'res', name:'res3', repeats:2, channels:128 },
    { type:'res', name:'res4', repeats:2, channels:256 },
    { type:'pool', name:'global_avg' },
    { type:'fc', name:'fc1000', classes:1000 }
  ];
  return layers;
}

// Forward pass simulation: generate activation summaries (vector lengths) per layer output
export function forwardPseudoResNet(modelDef, inputVec){
  let activations = [];
  let current = inputVec.slice();
  for (const layer of modelDef){
    if (layer.type==='conv'){
      current = simulateConv(current, layer.channels);
    } else if (layer.type==='pool') {
      current = simulatePool(current);
    } else if (layer.type==='res') {
      for (let r=0;r<layer.repeats;r++){
        const identity = current.slice();
        let out = simulateConv(current, layer.channels);
        out = addVectors(out, identity); // residual add (length match assumption)
        current = out.map(v=>Math.max(0,v));
      }
    } else if (layer.type==='fc') {
      current = simulateFC(current, layer.classes);
      // softmax-like normalization
      const sum = current.reduce((a,b)=>a+Math.exp(b),0);
      current = current.map(v=>Math.exp(v)/sum);
    }
    activations.push(current.slice());
  }
  return activations;
}

function simulateConv(vec, channels){
  // produce new length = channels (aggregate stats to mimic channel activations)
  let out = [];
  for (let c=0;c<channels;c++){
    // random linear combination + ReLU-like shaping of original
    let acc = 0; for (let v of vec) acc += v * ( (c*1315423911 % 97)/97 );
    acc = Math.tanh(acc) * 0.5 + Math.random()*0.05; // bounded
    out.push(Math.max(0, acc));
  }
  return out;
}
function simulatePool(vec){
  // reduce size by half (take max pairs)
  const out=[]; for(let i=0;i<vec.length;i+=2){ out.push(Math.max(vec[i]||0, vec[i+1]||0)*0.9); }
  return out;
}
function simulateFC(vec, classes){
  const out=[]; for(let i=0;i<classes;i++){ let acc=0; for(let v of vec) acc+= v*( (i*2654435761 % 61)/61 ); out.push(acc/classes); } return out;
}
function addVectors(a,b){ const n=Math.min(a.length,b.length); const out=[]; for(let i=0;i<n;i++) out.push(a[i]+b[i]); return out; }
