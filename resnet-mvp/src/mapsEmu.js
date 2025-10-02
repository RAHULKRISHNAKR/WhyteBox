// Feature map emulator draws abstract bars for channel activations
export class FeatureMapEmulator {
  constructor(canvas, modelDef){
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.modelDef = modelDef;
    window.addEventListener('resize', ()=> this.resize());
    this.resize();
  }
  resize(){ this.canvas.width = this.canvas.clientWidth; this.canvas.height = this.canvas.clientHeight; this.render(); }
  update(activations){ this.activations = activations; this.render(); }
  render(){
    const ctx = this.ctx; if(!ctx) return;
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    if(!this.activations) return;
    const pad=20; const w=this.canvas.width - pad*2; const h=this.canvas.height - pad*2;
    const layerH = h / this.activations.length;
    ctx.font='10px monospace'; ctx.textBaseline='middle';
    this.activations.forEach((act,idx)=>{
      const y0 = pad + idx*layerH;
      const barAreaH = layerH*0.6;
      const meta = this.modelDef[idx];
      // title
      ctx.fillStyle='#9fb6c9';
      ctx.fillText(meta.name + ' ('+act.length+')', pad, y0 + barAreaH + 10);
      // bars (sample up to 120 channels)
      const sample = Math.min(act.length, 120);
      const barW = w / sample;
      let max = 0; for (let i=0;i<act.length;i++) if (act[i]>max) max = act[i];
      for (let i=0;i<sample;i++){
        const v = act[i]/(max||1);
        const x = pad + i*barW;
        const bh = v * barAreaH;
        const y = y0 + (barAreaH - bh);
        const col = lerpColor('#0a4b9a','#ff5533', v);
        ctx.fillStyle = col;
        ctx.fillRect(x,y,Math.max(1,barW-1),bh);
      }
    });
  }
}
function lerpColor(a,b,t){
  const ar=parseInt(a.substr(1,2),16), ag=parseInt(a.substr(3,2),16), ab=parseInt(a.substr(5,2),16);
  const br=parseInt(b.substr(1,2),16), bg=parseInt(b.substr(3,2),16), bb=parseInt(b.substr(5,2),16);
  const r=Math.round(ar+(br-ar)*t), g=Math.round(ag+(bg-ag)*t), bl=Math.round(ab+(bb-ab)*t);
  return `rgb(${r},${g},${bl})`;
}
