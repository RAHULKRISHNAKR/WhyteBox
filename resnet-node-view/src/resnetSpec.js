// Simplified ResNet-50 specification focusing on node-level structure.
// Each bottleneck block: conv1x1_reduce -> bn -> relu -> conv3x3 -> bn -> relu -> conv1x1_expand -> bn -> add (with skip)
// We abstract BN+ReLU as separate nodes for clarity.

export function buildResNetSpec(){
  const spec=[]; const push=o=>{ spec.push(o); return o; };
  // Track spatial dims
  let H=224,W=224;
  push({id:'input',type:'input',stage:0,shape:fmt(3,H,W),desc:'Input tensor'});
  // conv1 7x7 stride2
  H/=2; W/=2; push({id:'conv1',type:'conv',k:'7x7',s:2,out:64,stage:1,shape:fmt(64,H,W),desc:'Stem conv 7x7 s2'});
  push({id:'bn1',type:'bn',stage:1,shape:fmt(64,H,W),desc:'BatchNorm'});
  push({id:'relu1',type:'relu',stage:1,shape:fmt(64,H,W),desc:'ReLU'});
  // pool1 3x3 s2
  H/=2; W/=2; push({id:'pool1',type:'pool',k:'3x3',s:2,stage:1,shape:fmt(64,H,W),desc:'MaxPool 3x3 s2'});

  function bottleneck(stage, idx, inC, midC, outC, downsample){
    if (downsample){ H/=2; W/=2; }
    const base=`s${stage}b${idx}`; const inputId = spec[spec.length-1].id;
    const conv1 = push({id:base+'_conv1',type:'conv',k:'1x1',s:downsample?2:1,out:midC,stage,shape:fmt(midC,H,W),desc:'Reduce 1x1'});
    const bn1 = push({id:base+'_bn1',type:'bn',stage,shape:conv1.shape,desc:'BN'});
    const relu1 = push({id:base+'_relu1',type:'relu',stage,shape:bn1.shape,desc:'ReLU'});
    const conv2 = push({id:base+'_conv2',type:'conv',k:'3x3',s:1,out:midC,stage,shape:fmt(midC,H,W),desc:'Conv 3x3'});
    const bn2 = push({id:base+'_bn2',type:'bn',stage,shape:conv2.shape,desc:'BN'});
    const relu2 = push({id:base+'_relu2',type:'relu',stage,shape:bn2.shape,desc:'ReLU'});
    const conv3 = push({id:base+'_conv3',type:'conv',k:'1x1',s:1,out:outC,stage,shape:fmt(outC,H,W),desc:'Expand 1x1'});
    const bn3 = push({id:base+'_bn3',type:'bn',stage,shape:conv3.shape,desc:'BN'});
    let skipId=inputId; if (downsample || inC!==outC){
      const skip = push({id:base+'_skip_conv',type:'conv',k:'1x1',s:downsample?2:1,out:outC,stage,shape:fmt(outC,H,W),desc:'Projection skip',skip:true});
      skipId = skip.id;
    }
    const add = push({id:base+'_add',type:'add',stage,inputs:[bn3.id,skipId],shape:fmt(outC,H,W),desc:'Elementwise add'});
    push({id:base+'_out',type:'relu',stage,shape:fmt(outC,H,W),desc:'ReLU'});
  }
  // Stage 2 (3 blocks)
  bottleneck(2,1,64,64,256,true);
  bottleneck(2,2,256,64,256,false);
  bottleneck(2,3,256,64,256,false);
  // Stage 3 (4 blocks)
  bottleneck(3,1,256,128,512,true);
  bottleneck(3,2,512,128,512,false);
  bottleneck(3,3,512,128,512,false);
  bottleneck(3,4,512,128,512,false);
  // Stage 4 (4 blocks simplified)
  bottleneck(4,1,512,256,1024,true);
  bottleneck(4,2,1024,256,1024,false);
  bottleneck(4,3,1024,256,1024,false);
  bottleneck(4,4,1024,256,1024,false);
  // Stage 5 (3 blocks)
  bottleneck(5,1,1024,512,2048,true);
  bottleneck(5,2,2048,512,2048,false);
  bottleneck(5,3,2048,512,2048,false);
  push({id:'avgpool',type:'gap',stage:6,shape:'(1,2048,1,1)',desc:'Global AvgPool'});
  push({id:'fc',type:'fc',stage:6,out:1000,shape:'(1,1000)',desc:'Fully-connected 1000'});
  push({id:'output',type:'output',stage:6,shape:'(1,1000)',desc:'Softmax output'});
  return spec;
}

function fmt(c,h,w){ return `(1,${c},${Math.round(h)},${Math.round(w)})`; }
