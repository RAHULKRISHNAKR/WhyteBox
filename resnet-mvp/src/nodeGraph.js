// Babylon.js node graph for major blocks
export class NodeGraph {
  constructor(canvas, modelDef){
    this.canvas = canvas; this.modelDef = modelDef;
    this.engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer:true, stencil:true});
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.06,0.09,0.12,1);
    this.camera = new BABYLON.ArcRotateCamera('cam', -Math.PI/2.2, Math.PI/2.5, 55, new BABYLON.Vector3(0,0,0), this.scene);
    this.camera.attachControl(canvas, true);
    new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0,1,0), this.scene);
    this._build();
    this.engine.runRenderLoop(()=> this.scene.render());
    window.addEventListener('resize', ()=> this.engine.resize());
  }
  _build(){
    this.blocks=[]; this.connections=[];
    const gapX=12; let x= - (this.modelDef.length-1)*gapX/2;
    const matBase = new BABYLON.StandardMaterial('nb-base', this.scene);
    matBase.diffuseColor = new BABYLON.Color3(0.18,0.28,0.38);
    matBase.emissiveColor = new BABYLON.Color3(0.05,0.07,0.09);

    this.modelDef.forEach((layer, idx)=>{
      const box = BABYLON.MeshBuilder.CreateBox(layer.name,{width:6,height:4,depth:4},this.scene);
      box.position.x = x; box.metadata={idx, layer};
      box.material = matBase.clone('m-'+layer.name);
      const labelPlane = BABYLON.MeshBuilder.CreatePlane('p-'+layer.name,{size:6},this.scene);
      labelPlane.position = box.position.add(new BABYLON.Vector3(0,3.2,0));
      const dynTex = new BABYLON.DynamicTexture('dt-'+layer.name,{width:256,height:64}, this.scene, false);
      dynTex.drawText(layer.name,20,42,'24px monospace','#d7e6f1','#00000066');
      const labelMat = new BABYLON.StandardMaterial('lm-'+layer.name,this.scene);
      labelMat.diffuseTexture = dynTex; labelMat.emissiveColor = new BABYLON.Color3(1,1,1); labelMat.backFaceCulling=false;
      labelPlane.material = labelMat; labelPlane.parent=box;

      this.blocks.push(box);
      x += gapX;
      if (idx>0){
        const prev = this.blocks[idx-1];
        const tube = BABYLON.MeshBuilder.CreateTube('c-'+prev.name+'-'+box.name,{path:[prev.position, box.position], radius:0.3}, this.scene);
        const cm = new BABYLON.StandardMaterial('cm-'+idx,this.scene);
        cm.diffuseColor = new BABYLON.Color3(0.25,0.3,0.35); cm.emissiveColor = new BABYLON.Color3(0,0,0);
        tube.material=cm; this.connections.push({mesh:tube, mat:cm});
      }
    });
  }
  async animate(activations){
    // Pulse each block and its incoming connection
    const sleep = ms=>new Promise(r=>setTimeout(r,ms));
    const maxLen = Math.max(...activations.map(a=>a.length));
    for (let i=0;i<this.blocks.length;i++){
      const block = this.blocks[i];
      const act = activations[i];
      const ratio = (act?act.length:1)/maxLen;
      const color = this._colorFromRatio(ratio);
      block.material.emissiveColor = color;
      if (i>0){
        const conn = this.connections[i-1];
        conn.mat.emissiveColor = color.scale(0.8);
      }
      await sleep(250);
    }
    // fade back
    for (let b of this.blocks){ b.material.emissiveColor = b.material.emissiveColor.scale(0.2); }
    for (let c of this.connections){ c.mat.emissiveColor = c.mat.emissiveColor.scale(0.15); }
  }
  _colorFromRatio(r){
    const lerp=(a,b,t)=>a+(b-a)*t; const c1=[0,0.4,1]; const c2=[1,0.3,0.15];
    const r1=lerp(c1[0],c2[0],r), g1=lerp(c1[1],c2[1],r), b1=lerp(c1[2],c2[2],r);
    return new BABYLON.Color3(r1,g1,b1);
  }
}
