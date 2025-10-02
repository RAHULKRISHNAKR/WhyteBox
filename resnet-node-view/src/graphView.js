import { buildResNetSpec } from './resnetSpec.js';

export class ResNetGraphView {
  constructor(canvas){
    this.canvas = canvas;
    this.engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer:true, stencil:true});
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.05,0.07,0.1,1);
  this.camera = new BABYLON.ArcRotateCamera('cam', -Math.PI/2.1, Math.PI/2.6, 240, new BABYLON.Vector3(180,20,0), this.scene);
  this.camera.lowerRadiusLimit = 120; this.camera.upperRadiusLimit = 700;
  this.camera.panningSensibility = 0; // we implement custom horizontal pan
  this.camera.attachControl(canvas, true, false);
    new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0,1,0), this.scene);
    this.spec = buildResNetSpec();
    this.nodeMeshes = new Map();
    this.skipArcs = [];
  this._buildLayout();
  this._enableHorizontalPan();
  this._setupPointerInteractions();
    this.engine.runRenderLoop(()=> this.scene.render());
    window.addEventListener('resize',()=> this.engine.resize());
  }
  _buildLayout(){
    // Layout by sequence index and stage grouping
    const stageColor = {input:'#5AA0FF',conv:'#5AA0FF',bn:'#6DD6FF',relu:'#FFD257',pool:'#FF925A',gap:'#58D7A7',fc:'#D678FF',output:'#FFFFFF',add:'#FFE164'};
    // Arrange nodes by x within stage columns rather than sequence spiral
    const colGap = 28; const rowGap = 5; const stageDepth = 40; // z separation
    const stageNodes = new Map();
    this.spec.forEach(n=>{ stageNodes.set(n.stage, (stageNodes.get(n.stage)||[]).concat(n)); });

    // Background stage bands
    for (const st of [...stageNodes.keys()]){
      if (st===0) continue; // input alone
      const plane = BABYLON.MeshBuilder.CreatePlane('stageBand-'+st,{width:colGap*3,height:stageDepth},this.scene);
      plane.position = new BABYLON.Vector3(st*colGap*3 - colGap*1.5, 0, -stageDepth*0.15);
      plane.rotation.x = Math.PI/2;
      const mat = new BABYLON.StandardMaterial('mat-band-'+st,this.scene);
      mat.diffuseColor = new BABYLON.Color3(0.05,0.09,0.12);
      mat.alpha = 0.5;
      plane.material = mat;
      plane.isPickable = false;
    }

    const textPlane = (mesh,label)=>{
      const plane = BABYLON.MeshBuilder.CreatePlane('lbl-'+mesh.name,{size:6},this.scene);
      plane.position = mesh.position.add(new BABYLON.Vector3(0,2.2,0));
      const dt = new BABYLON.DynamicTexture('dt-'+mesh.name,{width:256,height:64},this.scene,false);
      dt.drawText(label,10,42,'28px monospace','#e2eef6','#00000080');
      const mat = new BABYLON.StandardMaterial('mat-lbl-'+mesh.name,this.scene);
      mat.diffuseTexture=dt; mat.emissiveColor=new BABYLON.Color3(1,1,1); mat.backFaceCulling=false; plane.material=mat; plane.parent=mesh;
    };

    for (let i=0;i<this.spec.length;i++){
      const node = this.spec[i];
      const stageList = stageNodes.get(node.stage) || [];
      const indexInStage = stageList.findIndex(n=>n.id===node.id);
      const x = node.stage * colGap*3 + (indexInStage%3 -1)*colGap; // three columns per stage
      const z = -Math.floor(indexInStage/3)*rowGap; // rows backward in z
      let mesh;
      if (node.type==='add'){
        mesh = BABYLON.MeshBuilder.CreateSphere(node.id,{diameter:3},this.scene);
      } else if (node.type==='input' || node.type==='output') {
        mesh = BABYLON.MeshBuilder.CreateSphere(node.id,{diameter:4},this.scene);
      } else {
        mesh = BABYLON.MeshBuilder.CreateBox(node.id,{width:4,height:3,depth:3},this.scene);
      }
  mesh.position.set(x, 0, z);
      const mat = new BABYLON.StandardMaterial('mat-'+node.id,this.scene);
      const baseCol = BABYLON.Color3.FromHexString(stageColor[node.type]||'#8aa3b7');
      mat.diffuseColor = baseCol.scale(0.35); mat.emissiveColor = baseCol.scale(0.15);
      mesh.material = mat;
      mesh.metadata = { node };
      textPlane(mesh, node.id.replace(/_out$/,'').replace(/_bn\d/,'bn').slice(0,16));
      this.nodeMeshes.set(node.id, mesh);
    }

    // Connections (sequential + add inputs)
    this.connections = [];
    const allNodes = this.spec;
    function tubeBetween(a,b,scene){
      const tube = BABYLON.MeshBuilder.CreateTube('c-'+a.name+'-'+b.name,{path:[a.position,b.position],radius:0.35},scene);
      const cm = new BABYLON.StandardMaterial('cm-'+tube.name, scene);
      cm.diffuseColor=new BABYLON.Color3(0.2,0.27,0.34); cm.emissiveColor=new BABYLON.Color3(0,0,0); tube.material=cm; return {mesh:tube, mat:cm};
    }
    for (let i=1;i<allNodes.length;i++){
      const prev = this.nodeMeshes.get(allNodes[i-1].id);
      const cur = this.nodeMeshes.get(allNodes[i].id);
      // Only draw direct sequential if not an add immediately after out relu to reduce clutter? Keep all for now.
      this.connections.push(tubeBetween(prev, cur, this.scene));
    }
    // Add skip arcs
    for (const node of allNodes){
      if (node.type==='add' && node.inputs){
        const a = this.nodeMeshes.get(node.inputs[0]);
        const b = this.nodeMeshes.get(node.inputs[1]);
        if (a && b){
          // create elevated arc path
            const mid = a.position.add(b.position).scale(0.5).add(new BABYLON.Vector3(0,8,0));
            const path=[a.position, mid, this.nodeMeshes.get(node.id).position];
            const arc = BABYLON.MeshBuilder.CreateTube('skip-'+node.id,{path,radius:0.25},this.scene);
            const sm = new BABYLON.StandardMaterial('sm-'+node.id,this.scene);
            sm.diffuseColor = new BABYLON.Color3(0.05,0.5,0.55); sm.emissiveColor=new BABYLON.Color3(0,0.2,0.25); arc.material=sm;
            this.skipArcs.push({mesh:arc, mat:sm});
        }
      }
    }
  }

  async animateForward(onLayer){
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    // Iterate actual spec order, but handle add nodes: pulse both inputs then add
    for (const node of this.spec){
      if (node.type==='add' && node.inputs){
        // highlight both incoming sources quickly + skip arc
        for (const inp of node.inputs){
          const mesh = this.nodeMeshes.get(inp);
          this._pulse(mesh, 0.9, '#ffe164');
        }
        // highlight skip arc to this add (if exists)
        const arc = this.skipArcs.find(a=>a.mesh.name==='skip-'+node.id);
        if (arc) this._pulseArc(arc, 0.9);
        await sleep(this._scaled(350));
      }
      const mesh = this.nodeMeshes.get(node.id);
      this._pulse(mesh,1.0);
      if (onLayer) onLayer(node);
      await sleep(this._scaled(260));
    }
  }

  _pulse(mesh,intensity=0.8, overrideHex){
    if(!mesh) return;
    const mat = mesh.material; if(!mat) return;
    const base = mat.diffuseColor;
    let col = base.scale(3*intensity);
    if (overrideHex){
      const c = BABYLON.Color3.FromHexString(overrideHex);
      col = c.scale(intensity);
    }
    mat.emissiveColor = col;
    setTimeout(()=>{ mat.emissiveColor = mat.emissiveColor.scale(0.2); }, this._scaled(400));
  }
  _pulseArc(arc,intensity=0.8){
    arc.mat.emissiveColor = arc.mat.diffuseColor.scale(2*intensity);
    setTimeout(()=>{ arc.mat.emissiveColor=arc.mat.emissiveColor.scale(0.2); }, this._scaled(450));
  }
  _enableHorizontalPan(){
    // Shift + drag or middle mouse to pan horizontally
    let dragging=false; let lastX=0; const canvas=this.canvas; const cam=this.camera;
    canvas.addEventListener('pointerdown',(e)=>{ if (e.button===1 || e.shiftKey){ dragging=true; lastX=e.clientX; e.preventDefault(); }});
    window.addEventListener('pointerup',()=> dragging=false);
    window.addEventListener('pointermove',(e)=>{ if(!dragging) return; const dx=e.clientX-lastX; lastX=e.clientX; cam.target.x -= dx*0.6; cam.alpha = -Math.PI/2; });
  }
  _setupPointerInteractions(){
    const hl = new BABYLON.HighlightLayer('hl', this.scene);
    this.scene.onPointerObservable.add((pointerInfo)=>{
      if (pointerInfo.pickInfo && pointerInfo.pickInfo.pickedMesh){
        const m = pointerInfo.pickInfo.pickedMesh; if (!m.metadata || !m.metadata.node) return;
        hl.removeAllMeshes(); hl.addMesh(m, BABYLON.Color3.White());
        if (!this._tooltip){ this._createTooltip(); }
        this._showTooltip(m);
      } else {
        hl.removeAllMeshes(); if (this._tooltip) this._tooltip.isVisible=false;
      }
    });
  }
  _createTooltip(){
    const plane = BABYLON.MeshBuilder.CreatePlane('tt',{size:14},this.scene);
    plane.isPickable=false; plane.position.y = 20; plane.position.z = 10;
    const dt = new BABYLON.DynamicTexture('tt-dt',{width:512,height:256},this.scene,false);
    const mat = new BABYLON.StandardMaterial('tt-mat',this.scene); mat.diffuseTexture=dt; mat.emissiveColor=new BABYLON.Color3(1,1,1); plane.material=mat; plane.isVisible=false;
    this._tooltip = plane; this._tooltipTex=dt;
  }
  _showTooltip(mesh){
    const node = mesh.metadata.node;
    const lines=[node.id, node.desc||'', node.shape];
    const ctx=this._tooltipTex.getContext(); ctx.clearRect(0,0,512,256);
    this._tooltipTex.drawText(lines[0],20,60,'40px monospace','#ffffff','transparent');
    this._tooltipTex.drawText(lines[1],20,120,'28px monospace','#aac6d7','transparent');
    this._tooltipTex.drawText(lines[2],20,190,'28px monospace','#ffd257','transparent');
    this._tooltip.position = mesh.position.add(new BABYLON.Vector3(0,10,0));
    this._tooltip.isVisible=true;
  }
  setSpeed(mult){ this.speed = mult; }
  _scaled(ms){ return ms / (this.speed||1); }
}
