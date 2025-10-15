<script>
	import { onMount, tick } from 'svelte';
  import * as d3 from 'd3';
  import { interpolateRdBu } from 'd3-scale-chromatic';
  import { Container, Input, FormGroup, Label, FormCheck, Button, Row, Col, Modal, ModalBody, ModalHeader, ModalFooter } from 'sveltestrap';
  import Header from './Header.svelte'

  //######################################################################//
  let selectedModel = undefined;
  let selectedClass = undefined;
  let selectedModule = undefined;
  let selectedBranch = undefined;
  let moduleLayerDepth = undefined;
  let modelSVG = undefined;
  let imageNum = 8;
  let pathData = [];
  let link = undefined;
  let stepBeforeLine = undefined;
  let stepAfterLine = undefined;
  let straightLine = undefined;
  let inputImageUrl = '';
  let moduleColorScale = undefined;
  let layerMax = undefined;
  let layerMin = undefined;
  let currentModule = undefined;
  let previousSelectedBranch = undefined;

  let branches = [];
  const imagenetModels = ['alexnet', 'vgg16', 'googlenet', 'resnet18'];
  const serverIP = 'http://127.0.0.1:5000';
  let huggingFaceUrl = 'microsoft/resnet-18';
  let userImageFile = null;
  let imagenetClasses ={};

  onMount(async () => {
    const response = await fetch('/imageClasses.json');
    imagenetClasses = await response.json();
    selectedModel = imagenetModels[0];
    selectedClass = "0";
    modelSVG = d3.select('#model-container').select('svg');
    const modelZoom = d3.zoom()
      .scaleExtent([0.5, 2])  // zoom range
      .on('zoom', (event) => {
        modelSVG.select('g#model-structure').attr('transform', event.transform);
      });

    modelSVG.call(modelZoom);

    const moduleSVG = d3.select('#module-container').select('svg');
    const moduleZoom = d3.zoom()
      .scaleExtent([0.5, 2])  // zoom range
      .on('zoom', (event) => {
        moduleSVG.select('g#module-structure').attr('transform', event.transform);
      });

    moduleSVG.call(moduleZoom);

    link = d3.linkHorizontal()
    .x(d=>d[0])
    .y(d=>d[1]);

    stepBeforeLine = d3.line()
                    .x(d => d[0])
                    .y(d => d[1])
                    .curve(d3.curveStepBefore);
    stepAfterLine = d3.line()
                    .x(d => d[0])
                    .y(d => d[1])
                    .curve(d3.curveStepAfter);
    straightLine = d3.line()
                    .x(d => d[0])
                    .y(d => d[1]);

    moduleColorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 4]).domain([0.2,0.8]);
  });

  let modelData = undefined;
  const moduleXMargin = 20;
  const moduleYMargin = 200;
  const moduleWidth = 100;
  const moduleHeight = 400;

  let isExpanded = false;
  let isHuggingFaceModel = false;
  let isUserInputImage = false;
  let openModal = false;
  let batchNormActive = false;
  let reluActive = false;
  const imageHeight = 133;
  const imageWidth = 133;
  const moduleXPadding = 30;
  const moduleYPadding = 30;
  const offsetX = 100;
  const offsetY = 30;

  function updateSVGSize(newWidth, newHeight) {
    d3.select('#module-svg')
      .attr('width', newWidth + 500)
      .attr('height', newHeight);
  }

  async function loadModel() {
    const formData = new FormData();
    if(isHuggingFaceModel){
      formData.append('model_name', huggingFaceUrl);
    }
    else{
      formData.append('model_name', selectedModel);
    }

    if(isUserInputImage){
      formData.append('image_path', userImageFile.name);
    }
    else{
      formData.append('image_path', selectedClass);
    }

    try {
      const response = await fetch(`${serverIP}/infer`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        modelData = data['result']['jsonData'];

        const imageData = data['result']['imageUrl'];
        const N = imageData.length;
        const M = imageData[0].length;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = M;
        canvas.height = N;

        // Create an ImageData object
        const imageDataObj = ctx.createImageData(M, N);
        const buffer = imageDataObj.data;

        for (let i = 0; i < N; i++) {
          for (let j = 0; j < M; j++) {
            const pixel = imageData[i][j];
            const index = (i * M + j) * 4;
            buffer[index] = pixel[0];
            buffer[index + 1] = pixel[1];
            buffer[index + 2] = pixel[2];
            buffer[index + 3] = 255; // Alpha channel set to opaque
          }
        }

        // Put the ImageData object onto the canvas
        ctx.putImageData(imageDataObj, 0, 0);

        // Convert the canvas to a Blob
        canvas.toBlob((blob) => {
          inputImageUrl = URL.createObjectURL(blob);
        });
      
        console.log('Model loaded successfully');
        drawModuleView()
      } else {
        alert('Model load failed');
      }
    } catch (error) {
      console.error('Error loading model:', error);
      alert('Model load failed');
    }
  }
  
  
  function drawModuleView(){
    modelSVG.select('g#model-structure').selectAll('*').remove();
    console.log("Keys in JSON:", Object.keys(modelData));

    const moduleGroup = modelSVG.select('g#model-structure').append('g').attr('class', 'module-group');
    const modules = moduleGroup.selectAll('g')
      .data(modelData)
      .enter()
      .append('g')
      .attr('class', 'module')
      .attr('transform', (d, i) => `translate(${(i + 1)* (moduleWidth + moduleXMargin)}, ${moduleYMargin})`)
      .style('cursor', 'pointer')
      .on('mousedown', function(event) {
        event.stopPropagation();
      });;


    // 각 하위 g 요소 안에 rect 추가
    modules.append('rect')
      .attr('width', moduleWidth)
      .attr('height', moduleHeight)
      .style('fill', (d) => moduleFills(d['type']))
      .style('stroke', 'gray')
      .style('stroke-width', 0);

    // 각 하위 g 요소 안에 text 추가
    modules.append('text')
      .attr('x', moduleWidth / 2)
      .attr('y', moduleHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text((d) => capitalize(d['type']))
      .style('fill', 'black');

      modules.each(function(d, i) {
        const group = d3.select(this);

        group.select('rect')
          .on('mouseover', function() {
            let maxLength = 0
            const layerLength = d['layers'].length;
            const numBranch = d['branches'].length;
            
            for (let i = 0; i < numBranch; i++) {
              maxLength = Math.max(maxLength, d['branches'][i].length)
            }
            const expandedWidth = moduleWidth * (maxLength + layerLength); // 확장할 너비
            const shiftDistance = expandedWidth - moduleWidth; // 확장으로 인해 밀어낼 거리
            const layerWidth = moduleWidth * 0.8;
            const layerHeight = numBranch == 1 ? moduleHeight * 0.8 : moduleHeight * 0.7 / numBranch;
            const layerXOffset = (moduleWidth - layerWidth) / 2;
            const layerYOffset = (moduleHeight - layerHeight) / 2;
            const layerYMargin = numBranch == 1 ? moduleHeight * 0.2 / 2 : moduleHeight * 0.3 / (numBranch + 1);

            // Expand rect 
            d3.select(this)
              .transition()
              .duration(500)
              .attr('width', expandedWidth)
              .style('stroke-width', 3);

            // 현재 rect 오른쪽의 모든 rect를 오른쪽으로 밀어냄
            modules.filter((_, j) => j > i)
              .transition()
              .duration(500)
              .attr('transform', (d, j) => `translate(${((j + i + 1) * (moduleWidth + moduleXMargin)) + shiftDistance}, ${moduleYMargin})`);

            // Hide text
            group.select('text')
              .transition()
              .duration(500)
              .style('opacity', 0);

            // Create empty group within rect
            group.append('g')
              .attr('class', 'branch-group')
            
            // Add layers inside branch group
            const branch = group.select('g.branch-group').selectAll('g')
              .data(d['branches'])
              .enter()
              .append('g')
              .attr('class', 'branch')
              .attr('transform', (_, i) => `translate(${0}, ${i * (layerHeight + layerYMargin) + layerYMargin})`)
              .style('pointer-events','none');

            branch.append('g')
              .attr('class', 'layer-group');

            const branchLayers = branch.select('g.layer-group').selectAll('g')
              .data((d) => d)
              .enter()
              .append('g')
              .attr('class', 'branch-layer')
              .attr('transform', (_, i) => `translate(${i * (layerWidth + moduleXMargin) + layerXOffset}, ${0})`)

            //Branch layers
            branchLayers.append('rect')
              .transition()
              .delay(500)
              .attr('width', layerWidth)
              .attr('height', layerHeight)
              .attr('id', (_, j) => `branch-${i}-${j}`)
              .style('fill', '#F5F5F5')
              .style('stroke', '#BDBDBD')
              .style('stroke-width', 0)
              .attr('fill-opacity', 1);

            branchLayers.append('text')
              .attr('x', layerWidth / 2)
              .attr('y', layerHeight / 2)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .style('fill', 'black')
              .style('opacity', 0)
              .transition()
              .delay(500)
              .duration(500)
              .style('opacity', 1)
              .each(function(d) {
                const textElement = d3.select(this);

                if(['conv', 'maxpool', 'avgpool'].includes(d['layer_type'])){
                const tspan1 = textElement.append("tspan")
                  .attr("x", layerWidth / 2)
                  .attr("dy", "-0.6em")
                  .text(d.layer_type)
                  .style('opacity', 0)
                  .transition()
                  .delay(500)
                  .duration(500)
                  .style('opacity', 1);
                }

                // 두 번째 줄: 추가 정보 (if applicable)
                if (d['layer_type'] === 'conv') {
                  const tspan2 = textElement.append("tspan")
                    .attr("x", layerWidth / 2)
                    .attr("dy", "1.2em")
                    .text(`W: ${d['metadata']['kernel_size'].join('x')}`)
                    .style('opacity', 0)
                    .transition()
                    .delay(500)
                    .duration(500)
                    .style('opacity', 1);
                } else if (d['layer_type'] === 'maxpool') {
                  const tspan2 = textElement.append("tspan")
                    .attr("x", layerWidth / 2)
                    .attr("dy", "1.2em")
                    .text(`K: ${d['metadata']['kernel_size']} x ${d['metadata']['kernel_size']}`)
                    .style('opacity', 0)
                    .transition()
                    .delay(500)
                    .duration(500)
                    .style('opacity', 1);
                } else if (d['layer_type'] === 'avgpool') {
                  const tspan2 = textElement.append("tspan")
                    .attr("x", layerWidth / 2)
                    .attr("dy", "1.2em")
                    .text(`Out: ${d['metadata']['output_size'].join('x')}`)
                    .style('opacity', 0)
                    .transition()
                    .delay(500)
                    .duration(500)
                    .style('opacity', 1);
                }
                else{
                  const tspan1 = textElement.append("tspan")
                  .attr("x", layerWidth / 2)
                  .attr("dy", "0")
                  .text(d.layer_type)
                  .style('opacity', 0)
                  .transition()
                  .delay(500)
                  .duration(500)
                  .style('opacity', 1);
                }
              });

            //Remain layers
            const layers = group.select('g.layer-group').selectAll('g.layer')
              .data((d) => d['layers'])
              .enter()
              .append('g')
              .attr('class','layer')
              .attr('id', (_, j) => `layer-${j}`)
              .attr('transform', (_, i) => `translate(${(i + maxLength) * (layerWidth + moduleXMargin) + layerXOffset}, ${0})`);

            layers.append('rect')
              .transition()
              .delay(500)
              .attr('width', layerWidth)
              .attr('height', () => numBranch == 1 ? layerHeight : numBranch * (layerHeight + layerYMargin) - layerYMargin )
              .style('fill', '#F5F5F5')
              .style('stroke', '#BDBDBD')
              .style('stroke-width', 0)
              .attr('fill-opacity', 1);
             
            const parentGroup = d3.selectAll('g.module').nodes()[i];
            for(let j = 0; j < d['branches'].length; j++){
              for(let k = 0; k <= d['branches'][j].length; k++){
                const srcX = k == 0 ? 0 : k * (layerWidth + moduleXMargin) - layerXOffset;
                const initY = moduleYMargin + d3.select(parentGroup).select('rect').attr('hegiht') / 2;
                const dstX = k * (layerWidth + moduleXMargin) + layerXOffset;
                const dstY = j * (layerHeight + layerYMargin) + layerYMargin + layerHeight / 2;

                // start edge
                if(k == 0){
                  const initPath = [
                    [srcX, initY], [dstX / 2, dstY], [dstX, dstY]
                  ];                  
                  d3.select(parentGroup).append('path')
                  .attr('d',stepAfterLine(initPath))
                  .attr('fill', 'none')
                  .transition()
                  .delay(500)
                  .attr('stroke', 'black')
                  .attr('class','module-edge')
                  .attr('stroke-width', 1)
                  .style('stroke-opacity', 1);
                }
                // last edge of branches
                if(d['branches'][j].length == 0 || k == d['branches'][j].length){
                  const modulePathData = []
                  modulePathData.push([dstX, dstY]);
                  modulePathData.push([maxLength * (layerWidth + moduleXMargin) + layerXOffset, dstY]);

                  d3.select(parentGroup).append('path')
                  .attr('d',straightLine(modulePathData))
                  .attr('fill', 'none')
                  .transition()
                  .delay(500)
                  .attr('stroke', 'black')
                  .attr('class','module-edge')
                  .attr('stroke-width', 1)
                  .style('stroke-opacity', 1);
                }
                // branch edges
                if(k > 0){
                  const modulePathData = []
                  modulePathData.push([srcX, dstY]);
                  modulePathData.push([dstX, dstY]);

                  d3.select(parentGroup).append('path')
                  .attr('d',straightLine(modulePathData))
                  .attr('fill', 'none')
                  .transition()
                  .delay(500)
                  .attr('stroke', 'black')
                  .attr('class','module-edge')
                  .attr('stroke-width', 1)
                  .style('stroke-opacity', 1);
                }
              }
            }
            for(let j = 0; j < d['layers'].length; j++){
              const srcX = maxLength * (layerWidth + moduleXMargin) + (j + 1) * (layerWidth + moduleXMargin) - layerXOffset;
              const initY = moduleYMargin + d3.select(parentGroup).select('rect').attr('hegiht') / 2;
              const dstX = j == d['layers'].length - 1 ? srcX + layerXOffset : srcX + moduleXMargin;

              const modulePathData = []
              modulePathData.push([srcX, initY]);
              modulePathData.push([dstX, initY]);

              d3.select(parentGroup).append('path')
                  .attr('d',straightLine(modulePathData))
                  .attr('fill', 'none')
                  .transition()
                  .delay(500)
                  .attr('stroke', 'black')
                  .attr('class','module-edge')
                  .attr('stroke-width', 1)
                  .style('stroke-opacity', 1);
            }
    
            layers.append('text')
              .attr('x', layerWidth / 2)
              .attr('y', moduleHeight * 0.8 / 2)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .style('fill', 'black')
              .style('opacity', 0)
              .transition()
              .delay(500)
              .duration(500)
              .style('opacity', 1)
              .each(function(d) {
                const textElement = d3.select(this);

                // 첫 번째 줄: layer_type
                const tspan1 = textElement.append("tspan")
                  .attr("x", layerWidth / 2)
                  .attr("dy", "0")
                  .text(d.layer_type)
                  .style('opacity', 0)
                  .transition()
                  .delay(500)
                  .duration(500)
                  .style('opacity', 1);

                // 두 번째 줄: 추가 정보 (if applicable)
                if (d['layer_type'] === 'conv') {
                  const tspan2 = textElement.append("tspan")
                    .attr("x", layerWidth / 2)
                    .attr("dy", "1.2em")
                    .text(`W: ${d['metadata']['kernel_size'].join('x')}`)
                    .style('opacity', 0)
                    .transition()
                    .delay(500)
                    .duration(500)
                    .style('opacity', 1);
                } else if (d['layer_type'] === 'maxpool') {
                  const tspan2 = textElement.append("tspan")
                    .attr("x", layerWidth / 2)
                    .attr("dy", "1.2em")
                    .text(`K: ${d['metadata']['kernel_size']} x ${d['metadata']['kernel_size']}`)
                    .style('opacity', 0)
                    .transition()
                    .delay(500)
                    .duration(500)
                    .style('opacity', 1);
                } else if (d['layer_type'] === 'avgpool') {
                  const tspan2 = textElement.append("tspan")
                    .attr("x", layerWidth / 2)
                    .attr("dy", "1.2em")
                    .text(`Out: ${d['metadata']['output_size'].join('x')}`)
                    .style('opacity', 0)
                    .transition()
                    .delay(500)
                    .duration(500)
                    .style('opacity', 1);
                }
              });
            })
          .on('mouseout', function() {
            // 모든 rect를 원래 크기로 복원
            d3.select(this)
              .transition()
              .duration(500)
              .attr('width', moduleWidth)
              .style('stroke-width', 1);

            d3.select('svg#model-svg').selectAll('path').remove();
            d3.select('g.branch-group').remove();

            // 모든 rect를 원래 위치로 복원
            modules.transition()
              .duration(500)
              .attr('transform', (d, j) => `translate(${j * (moduleWidth + moduleXMargin)}, ${moduleYMargin})`);

            // 모든 text를 다시 표시
            modules.selectAll('text')
              .transition()
              .duration(500)
              .style('display', 'inline')
              .style('opacity', 1);
        })
        //Click Effect => Call 'showDetailView'
        .on('click', () => {
          openDetailView(d); 
        });
      });

    function moduleFills(moduleName){
      if (moduleName === 'conv'){ return moduleColorScale(0.7); }
      else if (moduleName === 'residual'){ return moduleColorScale(0.6); }
      else if (moduleName === 'inception'){ return moduleColorScale(0.5); }
      else if (moduleName.includes('pool')){ return moduleColorScale(0.4);}
      else if (moduleName === 'linear'){ return moduleColorScale(0.3); }
    }
  }

  // Open Detail View of Selected Module
  async function openDetailView(selectedModuleInfo) {
    if(openModal){
      clearDetailView();
    }
    selectedModule = selectedModuleInfo['type'];
    openModal = true;
    await tick();

    drawModuleDetail(selectedModuleInfo);
  }
  // Close Detail View 
  function clearDetailView() {
    openModal = false;  
    reluActive = false;
    batchNormActive = false;
    selectedBranch = undefined;
    pathData = [];
    branches = [];
    d3.select('g#module-structure').selectAll("*").remove();
  }

  // Call drawModule functions depending on the type of module
  function drawModuleDetail(selectedModuleInfo){
    if (selectedModuleInfo['type'] === 'conv'){
      drawConvModuleDetail(selectedModuleInfo['layers']);
      drawLayerConnections();
      setLayerEvents();
    }
    else if (selectedModuleInfo['type'] === 'avgpool'){
      drawPoolModuleDetail(selectedModuleInfo['layers']);
      drawLayerConnections();
      setLayerEvents();
    }
    else if (selectedModuleInfo['type'] === 'linear'){
      drawLinearModuleDetail(selectedModuleInfo['layers']);
      setLinearLayerEvents(selectedModuleInfo['layers']);
    }
    else if (selectedModuleInfo['type'] === 'residual'){
      drawResidualModuleDetail(selectedModuleInfo);
      drawLayerConnections();
      drawShortCuts();
      setLayerEvents();
    }
    else if (selectedModuleInfo['type'] === 'inception'){
      currentModule = selectedModuleInfo;
      selectedBranch = 'branch1';
      setLayerEvents();
    }
  }

  function drawShortCuts(){
    const residualLayer = d3.select('#module-structure').selectAll('g.IntermediateResult-add');

    residualLayer.each(function() {
      const dstIR = d3.select(this);
      const idTokens = dstIR.attr('id').split('-');
      const dstLayerIndex = idTokens[1];
      const dstImageIndex = idTokens[3];
      const srcIR = d3.select('#module-structure').select(`g#IR-0-0-${dstImageIndex}`);

      const srcGroupTranslate = srcIR.attr('transform').match(/translate\(([^)]+)\)/);
      const srcCoordinates = srcGroupTranslate[1].split(',').map(function(d) { return parseFloat(d); });

      const dstGroupTranslate = dstIR.attr('transform').match(/translate\(([^)]+)\)/);
      const dstCoordinates = dstGroupTranslate[1].split(',').map(function(d) { return parseFloat(d); });

      const leftX = srcCoordinates[0] + imageWidth / 2;
      const rightX = dstCoordinates[0] + imageWidth / 2;
      const bottomY = srcCoordinates[1];
      const topY = bottomY - offsetY / 2;

      const pathDataBeforeLine = [
        [leftX, bottomY],
        [(leftX + rightX) / 2, topY]
      ];

      const pathDataAfterLine = [
        [(leftX + rightX) / 2, topY],
        [rightX, bottomY]
      ];
        
      d3.select('#module-structure').append('path')
        .attr('d', stepBeforeLine(pathDataBeforeLine))
        .attr('fill', 'none')
        .attr('stroke', 'gray')
        .attr('class','residual-edge')
        .attr('id', `edge-0-${dstImageIndex}-${dstLayerIndex}-${dstImageIndex}`)
        .attr('stroke-width', 1)
        .style('stroke-opacity', 0.5);
        
        d3.select('#module-structure').append('path')
        .attr('d', stepAfterLine(pathDataAfterLine))
        .attr('fill', 'none')
        .attr('stroke', 'gray')
        .attr('class','residual-edge')
        .attr('id', `edge-0-${dstImageIndex}-${dstLayerIndex}-${dstImageIndex}`)
        .attr('stroke-width', 1)
        .style('stroke-opacity', 0.5);
    });
  }

  function drawLayerConnections(){
    for(let cursor = moduleLayerDepth; cursor > 0; cursor--){
      const currLayer = d3.select('#module-structure').selectAll('g').filter(function() { 
        if(!this.getAttribute('class').includes('IntermediateResult')){
          return false;
        }
        const isCurrentLayerDepth = this.getAttribute('id').split('-')[1] === String(cursor);
        const isDisplayInline = window.getComputedStyle(this).display === 'inline';
        //In case of inception --> check isInlineBranch
        if(this.getAttribute('class').includes('branch')){
          // const isInlineBranch = this.className.baseVal.includes(selectedBranch);
          const isInlineBranch = this.getAttribute('class').includes(selectedBranch);
          return isDisplayInline && isInlineBranch && isCurrentLayerDepth;
        }
        return isDisplayInline && isCurrentLayerDepth;
      });

      const prevLayer = d3.select('#module-structure').selectAll('g').filter(function() { 
        if(!this.getAttribute('class').includes('IntermediateResult')){
            return false;
        }
        const isCurrentLayerDepth = this.getAttribute('id').split('-')[1] === String(cursor - 1);
        const isDisplayInline = window.getComputedStyle(this).display === 'inline';
        //In case of inception --> check isInlineBranch
        if(this.getAttribute('class').includes('branch')){
          // const isInlineBranch = this.className.baseVal.includes(selectedBranch);
          const isInlineBranch = this.getAttribute('class').includes(selectedBranch);
          return isDisplayInline && isInlineBranch && isCurrentLayerDepth;
        }
        return isDisplayInline && isCurrentLayerDepth;
      });

      currLayer.each(function() {
        const dstIR = d3.select(this);
        const layerClass = dstIR.attr('class');
        const dstImageIndex = dstIR.attr('id').split('-')[3];

        if (layerClass.includes('IntermediateResult') && layerClass.includes('conv')) {
          prevLayer.each(function() {
            const srcIR = d3.select(this);
            const srcImageIndex = srcIR.attr('id').split('-')[3];
            addImageConnection(srcIR, dstIR, cursor - 1, cursor, srcImageIndex ,dstImageIndex);
          });
        }
        else if(layerClass === 'IntermediateResult-add' || layerClass.includes('pool')){
          const srcIR = prevLayer.filter(function() {
            return d3.select(this).attr('id').split('-')[3] === dstImageIndex;
          })
          addImageConnection(srcIR, dstIR, cursor - 1, cursor, dstImageIndex ,dstImageIndex);
        }
        else if(layerClass === 'IntermediateResult-flatten'){
          const srcIR = prevLayer.filter(function() {
            return d3.select(this).attr('id').split('-')[3] === dstImageIndex;
          })
          drawFlattenConnections(srcIR, dstIR, cursor - 1, cursor, dstImageIndex ,dstImageIndex);
        }
      });
    }
    pathData.forEach(path => {
      d3.select('#module-structure').append('path')
          .attr('d', link({
            source: path.source,
            target: path.target
          }))
          .attr('class','edge')
          .attr('fill', 'none')
          .attr('stroke', 'gray')
          .attr('stroke-width', 1)
          .attr('id', path.id)
          .style('stroke-opacity', 0.5);
    });
  }
  function drawFlattenConnections(srcImage, dstImage, srcLayerIndex, dstLayerIndex, srcImageIndex, dstImageIndex){
    let flattenPathData = [];

    const srcTranslate = srcImage.attr('transform').match(/translate\(([^)]+)\)/);
    let srcCoordinates = srcTranslate[1].split(',').map(function(d) { return parseFloat(d); });
    srcCoordinates[0] = srcCoordinates[0] + imageWidth;
    srcCoordinates[1] = srcCoordinates[1] + imageHeight / 2;

    const dstTranslate = dstImage.attr('transform').match(/translate\(([^)]+)\)/);
    let dstCoordinates_top = dstTranslate[1].split(',').map(function(d) { return parseFloat(d); });
    flattenPathData.push({ id:`edge-${srcLayerIndex}-${srcImageIndex}-${dstLayerIndex}-${dstImageIndex}`, source: srcCoordinates, target: dstCoordinates_top});

    let dstCoordinates_bottom = [];
    dstCoordinates_bottom[0] = dstCoordinates_top[0];
    dstCoordinates_bottom[1] = dstCoordinates_top[1] + imageHeight;
    flattenPathData.push({ id:`edge-${srcLayerIndex}-${srcImageIndex}-${dstLayerIndex}-${dstImageIndex}`, source: srcCoordinates, target: dstCoordinates_bottom});
    
    flattenPathData.forEach(path => {
      d3.select('#module-structure').append('path')
          .attr('d', link({
            source: path.source,
            target: path.target
          }))
          .attr('fill', 'none')
          .attr('stroke', 'gray')
          .attr('stroke-width', 1)
          .attr('id', path.id)
          .style('stroke-opacity', 0.3);
    });
  }

  function drawInceptionLayerConnections(){
    const branchLayers = d3.select('#module-structure').select(`g#${selectedBranch}`).selectAll('g').filter(function(){
      const idTokens = d3.select(this).attr('id').split('-');
      return idTokens[2] == '0' && idTokens[3] == '0';
    });
    const layers = d3.select('#module-structure').selectAll('g').filter(function(){
      const idTokens = d3.select(this).attr('id').split('-');
      const isIntermediateResult = idTokens[0] == 'IR';
      const isBranchLayer = d3.select(this).attr('class').includes('branch');
      return idTokens[2] == '0' && idTokens[3] == '0' && !isBranchLayer && isIntermediateResult;
    });
    let layerOrder = [];
    branchLayers.each(function() {
      layerOrder.push(parseInt(d3.select(this).attr('id').split('-')[1]))
    });
    layers.each(function() {
      layerOrder.push(parseInt(d3.select(this).attr('id').split('-')[1]))
    });

    layerOrder.sort((a, b) => b - a);
    console.log(layerOrder);

    for (let i = 0; i < layerOrder.length - 1; i++) {
      const cursor = layerOrder[i];
      const currLayer = d3.select('#module-structure').selectAll('g').filter(function() { 
        const idTokens = d3.select(this).attr('id').split('-');
        const isSelectedBranchLayer = (d3.select(this).attr('class').includes(selectedBranch) || !d3.select(this).attr('class').includes('branch'));
        const isIntermediateResult = idTokens[0] == 'IR';
        return parseInt(idTokens[1]) == cursor && idTokens[2] == '0' && isIntermediateResult && isSelectedBranchLayer;
      });

      const prevLayer = d3.select('#module-structure').selectAll('g').filter(function() { 
        const idTokens = d3.select(this).attr('id').split('-');
        const isIntermediateResult = idTokens[0] == 'IR';
        return parseInt(idTokens[1]) == layerOrder[i + 1] && idTokens[2] == '0' && isIntermediateResult;
      });

      currLayer.each(function() {
        const dstIR = d3.select(this);
        const layerClass = dstIR.attr('class');
        const dstImageIndex = dstIR.attr('id').split('-')[3];

        if (layerClass.includes('conv')) {
          prevLayer.each(function() {
            const srcIR = d3.select(this);
            const srcImageIndex = srcIR.attr('id').split('-')[3];
            addImageConnection(srcIR, dstIR, layerOrder[i + 1], cursor, srcImageIndex ,dstImageIndex);
          });
        }
        else if(layerClass === 'IntermediateResult-add' || layerClass === 'IntermediateResult-cat'  || layerClass.includes('pool')){
          const srcIR = prevLayer.filter(function() {
            return d3.select(this).attr('id').split('-')[3] === dstImageIndex;
          })
          addImageConnection(srcIR, dstIR, layerOrder[i + 1],cursor, dstImageIndex ,dstImageIndex);
        }
      });
    }
    pathData.forEach(path => {
      d3.select('#module-structure').append('path')
          .attr('d', link({
            source: path.source,
            target: path.target
          }))
          .attr('class','edge')
          .attr('fill', 'none')
          .attr('stroke', 'gray')
          .attr('stroke-width', 1)
          .attr('id', path.id)
          .style('stroke-opacity', 0.5);
    });
  }



  function setLayerEvents(){
    const IRs = d3.select('#module-structure').selectAll('g').filter(function() { return this.getAttribute('class').includes('IntermediateResult') });
    let paths = undefined;
    
    IRs.on('mouseover', function() {
      const idTokens = d3.select(this).attr('id').split('-');
      const layerIndex = idTokens[1];
      const IRIndex = idTokens[3];
      const IRClass = d3.select(this).attr('class');
      const rectWidth = IRClass.includes('flatten') ? 40 : imageHeight;

      paths = d3.select('#module-structure').selectAll('path').filter(function() {
        const edgeIndex = d3.select(this).attr('id').split('-');
        const isSrcLayerPath = (parseInt(edgeIndex[1]) === parseInt(layerIndex)) && (edgeIndex[2] === IRIndex);
        const isDstLayerPath = (edgeIndex[3] === layerIndex) && (edgeIndex[4] === IRIndex);

        return isDstLayerPath || isSrcLayerPath;
      });

      paths.attr('stroke-width', 3)
        .style('stroke-opacity', 0.7);

      
      const strokeFill = (IRClass.includes('relu')) ? 'black' : (IRClass.includes('bn')) ? 'black' : 'gray'

      d3.select(this).append('rect')
        .attr('class', 'IR-wrapper')
        .attr('width', rectWidth)
        .attr('height', imageHeight)
        .attr('fill', 'none')
        .attr('stroke', strokeFill)
        .attr('stroke-width', 3)
        .style('stroke-opacity', 1);

    }).on('mouseout', function() {
      paths.attr('stroke-width', 1)
        .style('stroke-opacity', 0.5);

      d3.select(this).select('rect.IR-wrapper').remove();
    });


  }

  function setLinearLayerEvents(moduleLayer){
    const blocks = d3.select('#module-structure').selectAll('rect.block');
    //linear block event handling
    blocks.on('mouseover', function() {
      d3.select(this).style('stroke-width', 3);
    }).on('mouseout',function() {
      d3.select(this).style('stroke-width', 1);
    }).on('click', function(_, __, i) {
      d3.select('#module-structure').select('g.Prediction-result').remove();
      d3.select('#module-structure').selectAll('path').remove();
      pathData = [];

      const selectedBlock = d3.select(this);
      const linearLayerGroup = d3.select(this.parentNode);
      const selectedLayerDepth = parseInt(linearLayerGroup.attr('id').split('-')[1]);

      if(linearLayerGroup.attr('class') == 'IntermediateResult-softmax'){
        //Infobox Setting --> 인덱스에 따라서 모델 변경
        const infoBoxIndex = selectedBlock.attr('id').split('-')[1];
        
        const translateValues = linearLayerGroup.attr('transform').match(/translate\(([^)]+)\)/)[1];
        // Split the values into an array and convert them to numbers
        const [groupX, groupY] = translateValues.split(',').map(Number);

        const blockX = parseFloat(d3.select(this).attr('x'));
        const blockY = parseFloat(d3.select(this).attr('y')) - (40 + parseInt(infoBoxIndex) * 0.2);
        
        const padding = { top: 40, right: 40, bottom: 40, left: 40 };
        const width = 600;
        const height = 300;        
        
        const predictionLabel = moduleLayer[moduleLayer.length - 1]['top5']; 
        // Scale for the bars
        const x = d3.scaleLinear()
                    .domain([0, 1])
                    .range([0, width - padding.left - padding.right]);
    
        const y = d3.scaleBand()
                    .domain(predictionLabel.map(d => imagenetClasses[d]))
                    .range([0, height - padding.top - padding.bottom])
                    .padding(0.1);
        
        const g = d3.select('#module-structure')
                    .append('g')
                    .attr('class', 'Prediction-result')
                    .attr('transform', `translate(${groupX + blockX + 150}, ${groupY + blockY})`);

        const gradient = g.append("defs")
                          .append("linearGradient")
                          .attr("id", "gradient")
                          .attr("x1", "0%")
                          .attr("x2", "100%")
                          .attr("y1", "0%")
                          .attr("y2", "0%");

        gradient.append("stop")
                .attr("offset", "0%")
                .attr("style", "stop-color:rgb(255,165,0);stop-opacity:1");

        gradient.append("stop")
                .attr("offset", "100%")
                .attr("style", "stop-color:rgb(255,215,0);stop-opacity:1");

        g.append('rect')
          .attr('class', 'Infobox')
          .attr('width', width)
          .attr('height',  height)
          .attr('fill', 'white')
          .attr('stroke', '#ccc')
          .attr('stroke-width', '1px');

        const maxTextWidth = width - padding.left - padding.right;

        // prob bar
        g.selectAll('.bar')
          .data(predictionLabel)
          .enter().append('rect')
          .attr('class', 'bar')
          .attr('x', padding.left)  // 막대의 x 시작 위치
          .attr('y', d => padding.top + y(imagenetClasses[d]) + y.bandwidth() / 2 + 45)  // 막대의 y 위치
          .attr('width', d => x(moduleLayer[moduleLayer.length - 1]['softmax_output'][d]))
          .attr('height', 10)  // 막대의 높이
          .attr('fill', 'url(#gradient)');

        const ordinal = ['1st','2nd','3rd','4th','5th'];

        // add labels
        g.selectAll('.label')
          .data(predictionLabel)
          .enter()
          .append('text')
          .attr('class', 'label')
          .attr('x', padding.left)  // 텍스트의 x 시작 위치
          .attr('y', d => padding.top + y(imagenetClasses[d]) + y.bandwidth() / 2 + 40)
          .attr('dy', '-0.35em')  // 텍스트를 수직으로 중앙에 정렬
          .attr('text-anchor', 'start')
          .text((d, i) => truncateText(`${ordinal[i]}: ${imagenetClasses[d]}`, maxTextWidth))
          .style('fill', 'black');

        // prob text
        g.selectAll('.value')
          .data(predictionLabel)
          .enter()
          .append('text')
          .attr('class', 'value')
          .attr('x', d => padding.left + x(moduleLayer[moduleLayer.length - 1]['softmax_output'][d]) + 5)  // 값의 x 시작 위치
          .attr('y', d => padding.top + y(imagenetClasses[d]) + y.bandwidth() / 2 + 55)
          .attr('text-anchor', 'start')
          .text(d => `${(moduleLayer[moduleLayer.length - 1]['softmax_output'][d] * 100).toFixed(2)}%`)
          .style('fill', 'black');

          
        // Selected Label
        g.append("text")
          .attr("x", width / 2)
          .attr("y", padding.top - 10)
          .attr("text-anchor", "middle")
          .attr("font-size", "24px")
          .attr("fill", "black")
          .text(truncateText(imagenetClasses[infoBoxIndex], maxTextWidth));

        // Selected label prob bar
        g.append('rect')
          .attr('class', 'bar')
          .attr('x', padding.left)  // 막대의 x 시작 위치
          .attr('y', padding.top + 20)  // 막대의 y 위치
          .attr('width', x(moduleLayer[moduleLayer.length - 1]['softmax_output'][infoBoxIndex]))
          .attr('height', 20)  // 막대의 높이
          .attr('fill', 'url(#gradient)');

        g.append('text')
          .attr('class', 'value')
          .attr("x", width / 2)
          .attr("y", padding.top + 15)
          .attr("text-anchor", "middle")
          .attr("font-size", "24px")
          .text(d => `${(moduleLayer[moduleLayer.length - 1]['softmax_output'][infoBoxIndex] * 100).toFixed(3)}%`)
          .style('fill', 'black');
      }

      //select PrevLayer Rects
      if(selectedLayerDepth > 0){
        const prevBlocks = d3.select('#module-structure').selectAll('g').filter(function(){
          if(!this.getAttribute('class').includes('IntermediateResult')){
            return false;
          }
          const isPrevLayer = parseInt(d3.select(this).attr('id').split('-')[1]) === (selectedLayerDepth - 1);
          const isDisplayInline = window.getComputedStyle(this).display === 'inline';

          return isPrevLayer && isDisplayInline;
        }).selectAll('rect');

        prevBlocks.each(function() {
            const prevBlock = d3.select(this);
            const prevBlockIndex = prevBlock.attr('id').split('-')[1];
            addBlockConnection(prevBlock, selectedBlock, selectedLayerDepth, prevBlockIndex, i);
        });
      }
      //select NextLayer Rects
      if(selectedLayerDepth < moduleLayerDepth){
        const nextBlocks = d3.select('#module-structure').selectAll('g').filter(function(){
          if(!this.getAttribute('class').includes('IntermediateResult')){
            return false;
          }
          const isNextLayer = parseInt(d3.select(this).attr('id').split('-')[1]) === (selectedLayerDepth + 1);
          const isDisplayInline = window.getComputedStyle(this).display === 'inline';

          return isNextLayer && isDisplayInline;
        }).selectAll('rect');
        
        nextBlocks.each(function() {
            const nextBlock = d3.select(this);
            const nextBlockIndex = nextBlock.attr('id').split('-')[1];
            addBlockConnection(selectedBlock, nextBlock, selectedLayerDepth + 1, i, nextBlockIndex);
        });
      }

      pathData.forEach(path => {
      d3.select('#module-structure').append('path')
          .attr('d', link({
            source: path.source,
            target: path.target
          }))
          .attr('fill', 'none')
          .attr('stroke', 'gray')
          .attr('stroke-width', 1)
          .attr('id', path.id)
          .style('stroke-opacity', 0.3);
      });
    });
  }
  function truncateText(text, maxWidth) {
    const context = document.createElement('canvas').getContext('2d');
    context.font = '24px sans-serif';
    let width = context.measureText(text).width;
    let ellipsis = '...';
    let ellipsisWidth = context.measureText(ellipsis).width;

    if (width <= maxWidth) {
      return text;
    }

    while (width >= maxWidth - ellipsisWidth && text.length > 0) {
      text = text.slice(0, -1);
      width = context.measureText(text).width;
    }

    return text + ellipsis;
  }

  function addBlockConnection(srcBlock, dstBlock, dstLayerIndex, srcBlockIndex, dstBlockIndex){
    const srcGroupTranslate = srcBlock.node().parentNode.getAttribute('transform').match(/translate\(([^)]+)\)/);
    let srcCoordinates = srcGroupTranslate[1].split(',').map(function(d) { return parseFloat(d); });
    srcCoordinates[0] = srcCoordinates[0] + parseFloat(srcBlock.attr('x')) + parseFloat(srcBlock.attr('width'));
    srcCoordinates[1] = srcCoordinates[1] + parseFloat(srcBlock.attr('y')) + parseFloat(srcBlock.attr('height')) / 2;

    const dstGroupTranslate = dstBlock.node().parentNode.getAttribute('transform').match(/translate\(([^)]+)\)/);
    let dstCoordinates = dstGroupTranslate[1].split(',').map(function(d) { return parseFloat(d); });
    dstCoordinates[0] = dstCoordinates[0] + parseFloat(dstBlock.attr('x'));
    dstCoordinates[1] = dstCoordinates[1] + parseFloat(dstBlock.attr('y')) + parseFloat(dstBlock.attr('height')) / 2;

    pathData.push({ id:`edge-${dstLayerIndex}-${srcBlockIndex}-${dstBlockIndex}`, source: srcCoordinates, target: dstCoordinates}) 
  }

  function addImageConnection(srcImage, dstImage, srcLayerIndex, dstLayerIndex, srcImageIndex, dstImageIndex){
    const srcTranslate = srcImage.attr('transform').match(/translate\(([^)]+)\)/);
    let srcCoordinates = srcTranslate[1].split(',').map(function(d) { return parseFloat(d); });
    srcCoordinates[0] = srcCoordinates[0] + imageWidth;
    srcCoordinates[1] = srcCoordinates[1] + imageHeight / 2;

    const dstTranslate = dstImage.attr('transform').match(/translate\(([^)]+)\)/);
    let dstCoordinates = dstTranslate[1].split(',').map(function(d) { return parseFloat(d); });
    dstCoordinates[1] = dstCoordinates[1] + imageHeight / 2;

    pathData.push({ id:`edge-${srcLayerIndex}-${srcImageIndex}-${dstLayerIndex}-${dstImageIndex}`, source: srcCoordinates, target: dstCoordinates}) 
  }
  // Draw Conv Module 
  function drawConvModuleDetail(moduleLayers){
    let visibleLayerIndex = 0;
    let hiddenLayerCount = 0;
    let x;
    let y;
    moduleLayers.forEach((layer, layerIndex) => {
      //Input Layer
      if(layerIndex === 0){   
        const inputX = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        const inputY = moduleYPadding + (offsetY);
        drawLayer(layer['input'], visibleLayerIndex, hiddenLayerCount, inputX, inputY, 'inline', 'input');

        visibleLayerIndex++;
        x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        y = moduleYPadding + (offsetY);
        drawLayer(layer['output'], visibleLayerIndex, hiddenLayerCount, x, y, 'inline', layer['layer_type']);
      }
      //ReLU & BatchNorm Layer
      else if(layer['layer_type'] === 'relu' || layer['layer_type'] === 'bn'){
        hiddenLayerCount++;
        x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        y = moduleYPadding + (offsetY)
        drawLayer(layer['output'], visibleLayerIndex, hiddenLayerCount, x, y, 'none', layer['layer_type']);
      }
      //Other Layers (Conv, Pool)
      else if(layer['layer_type'] === 'conv' || layer['layer_type'].includes('pool')){
        visibleLayerIndex++;
        hiddenLayerCount = 0;
        x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        y = moduleYPadding + (offsetY);
        drawLayer(layer['output'], visibleLayerIndex, hiddenLayerCount, x, y, 'inline', layer['layer_type']);
      }
    });
    moduleLayerDepth = visibleLayerIndex;
  }

  // Draw Avgpool Module
  function drawPoolModuleDetail(moduleLayers){
    let visibleLayerIndex = 0;
    let hiddenLayerCount = 0;
    let x;
    let y;
    moduleLayers.forEach((layer, layerIndex) => {
      //Input Layer 
      if(layerIndex === 0){
        const inputX = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        const inputY = moduleYPadding + (offsetY);
        drawLayer(layer['input'], visibleLayerIndex, hiddenLayerCount, inputX, inputY, 'inline', 'input');

        visibleLayerIndex++;
        x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        y = moduleYPadding + (offsetY);
        drawLayer(layer['output'], visibleLayerIndex, hiddenLayerCount, x, y, 'inline', layer['layer_type']);
      }
      //ReLU & BatchNorm Layer
      else if(layer['layer_type'] === 'relu' || layer['layer_type'] === 'bn'){
        hiddenLayerCount++;
        x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        y = moduleYPadding + (offsetY)
        drawLayer(layer['output'], visibleLayerIndex, hiddenLayerCount, x, y, 'none', layer['layer_type']);
      }
      //Other Layers (Conv, Pool)
      else if(layer['layer_type'] === 'conv' || layer['layer_type'].includes('pool')){
        visibleLayerIndex++;
        hiddenLayerCount = 0;
        x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        y = moduleYPadding + (offsetY);
        drawLayer(layer['output'], visibleLayerIndex, hiddenLayerCount, x, y, 'inline', layer['layer_type']);
      }
      else if(layer['layer_type'] === 'flatten'){
        visibleLayerIndex++;
        hiddenLayerCount = 0;
        x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        y = moduleYPadding + (offsetY);
        // drawLinear(layer['output'], visibleLayerIndex, hiddenLayerCount, x, y, 'inline', layer['layer_type']);
        drawFlatten(layer['input'], visibleLayerIndex, hiddenLayerCount, x, y, 'inline', layer['layer_type']);
      }
    });
    moduleLayerDepth = visibleLayerIndex;
  }
  
  // Draw Linear Module
  function drawLinearModuleDetail(moduleLayers){
    let visibleLayerIndex = 0;
    let hiddenLayerCount = 0;
    console.log(moduleLayers)
    moduleLayers.forEach((layer, layerIndex) => {
      //Input Layer (Flatten input)
      if(layerIndex === 0){
        const x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        const y = moduleYPadding + (offsetY);
        drawLinear(layer['input'], visibleLayerIndex, hiddenLayerCount, x, y, 'inline', 'input');
      }
      //Last Layer contains Top-10 prediction labes (output_index) and probability (output)
      if(layerIndex === (moduleLayers.length - 1)){
        visibleLayerIndex++;
        hiddenLayerCount = 0;
        const x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        const y = moduleYPadding + (offsetY);

        drawLinear(layer['softmax_output'], visibleLayerIndex, hiddenLayerCount, x, y, 'inline', 'softmax');
      }
      //ReLU Layer
      else if(layer['layer_type'] === 'relu'){
        hiddenLayerCount++;
        const x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        const y = moduleYPadding + (offsetY);
        drawLinear(layer['output'], visibleLayerIndex, hiddenLayerCount, x, y, 'none', layer['layer_type']);
      }
      //Other Layers (Linear)
      else if(layer['layer_type'] === 'linear'){
        visibleLayerIndex++;
        hiddenLayerCount = 0;
        const x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        const y = moduleYPadding + (offsetY);
        drawLinear(layer['output'], visibleLayerIndex, hiddenLayerCount, x, y, 'inline', layer['layer_type']);
      }
    });
    moduleLayerDepth = visibleLayerIndex;
  }

  // Draw Residual Module
  function drawResidualModuleDetail(moduleLayers){  
    let visibleLayerIndex = 0;
    let hiddenLayerCount = 0;
    let layer = undefined;

    const numLayers = moduleLayers['branches'][0].length + moduleLayers['layers'].length;
    for(let layerIndex = 0; layerIndex < numLayers; layerIndex++){
      layer = layerIndex < moduleLayers['branches'][0].length ? moduleLayers['branches'][0][layerIndex] : moduleLayers['layers'][layerIndex - moduleLayers['branches'][0].length];
      
      if(layerIndex == 0){
        const inputX = moduleXPadding;
        const inputY = moduleYPadding + (offsetY);
        drawLayer(layer['input'], 0, 0, inputX, inputY, 'inline', 'input');
      }
      if(layer['layer_type'] === 'conv' || layer['layer_type'].includes('pool') || layer['layer_type'] === 'add' ){
        visibleLayerIndex++;
        hiddenLayerCount = 0;
        const x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        const y = moduleYPadding + (offsetY);
        drawLayer(layer['output'], visibleLayerIndex, hiddenLayerCount, x, y, 'inline', layer['layer_type']);
      }
      else if(layer['layer_type'] === 'relu' || layer['layer_type'] === 'bn'){
        hiddenLayerCount++;
        const x = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        const y = moduleYPadding + (offsetY);

        visibleLayerIndex = visibleLayerIndex;
        drawLayer(layer['output'], visibleLayerIndex, hiddenLayerCount, x, y, 'none', layer['layer_type']);
      }
    }
    moduleLayerDepth = visibleLayerIndex;
  }

  // Draw Inception Module
  function drawInceptionModuleDetail(moduleLayers){
    console.log(moduleLayers);
    let branchName = '';
    let hiddenLayerCount = 0;
    let visibleLayerIndex = 0;
    const detailSVG = d3.select('#module-structure');
    let branchDepth = 0;

    moduleLayers['branches'].forEach((branch, branchIndex) => {
      branchName = 'branch' + (branchIndex + 1).toString();
      branches.push(branchName);
      detailSVG.append('g')
      .attr('id', `${branchName}`)
      .attr('class', 'branch');
      //Input Layer 
      hiddenLayerCount = 0;
      visibleLayerIndex = 0;
      if(branchIndex === 0){
        const inputX = moduleXPadding;
        const inputY = moduleYPadding;
        drawLayer(branch[0]['input'], visibleLayerIndex, 0, inputX, inputY, 'inline', 'Input');
      }
      branch.forEach((layer) =>{
        const layerVisible = layer['layer_type'] === 'conv' || layer['layer_type'].includes('pool') ? 'inline': 'none';
        if(layerVisible === 'inline'){
          visibleLayerIndex++;
          hiddenLayerCount = 0;
        }
        else{
          hiddenLayerCount++;
        }
        const layerX = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        const layerY = moduleYPadding;
        drawLayer(layer['output'], visibleLayerIndex, hiddenLayerCount, layerX, layerY, layerVisible, layer['layer_type'], branchName);
      });
      branchDepth = Math.max(branchDepth, visibleLayerIndex);
    });

    visibleLayerIndex = branchDepth;
    moduleLayers['layers'].forEach((layer) => {
      //Conv, Pool, cat Layer
      if(layer['layer_type'] === 'conv' || layer['layer_type'].includes('pool') || layer['layer_type'] === 'cat'){
        visibleLayerIndex++;
        hiddenLayerCount = 0;
        const layerX = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        const layerY = moduleYPadding;

        console.log(visibleLayerIndex);
        drawLayer(layer['output'], visibleLayerIndex, hiddenLayerCount, layerX, layerY, 'inline', layer['layer_type']);
      }
      //ReLU & BatchNorm Layer
      else if(layer['layer_type'] === 'relu' || layer['layer_type'] === 'bn'){
        hiddenLayerCount++;
        const layerX = moduleXPadding + (visibleLayerIndex) * (imageWidth + offsetX);
        const layerY = moduleYPadding;
        drawLayer(layer['output'], visibleLayerIndex, hiddenLayerCount, layerX, layerY, 'none', layer['layer_type']);
      }
    });
    // if(selectedBranch == undefined){
    //   selectedBranch = 'branch1';
    // }
    previousSelectedBranch = selectedBranch;
  }

  function updateInceptionBranch(){
    if(typeof selectedBranch !== 'undefined'){
      console.log('updateInception')
      //hide visible branch
      d3.select('#module-structure').selectAll('g.branch')
                      .style('display', 'none');

      d3.select('#module-structure').selectAll('g')
        .filter(function(){
          const idTokens = d3.select(this).attr('id').split('-');
          const classTokens = d3.select(this).attr('class').split('-');
          const isLegendGroup = idTokens[0] === 'Legend';
          const isBranchLegend = classTokens.length > 1 && classTokens[1].includes('branch');
          const isSelectedBranch = classTokens[1] === selectedBranch;

          return isLegendGroup && isBranchLegend && !isSelectedBranch;
        })
        .style('display', 'none');

      //show selected branch
      d3.select('#module-structure').select(`g#${selectedBranch}`)
                      .style('display', 'inline');

      d3.select('#module-structure').selectAll('g')
        .filter(function(){
          const idTokens = d3.select(this).attr('id').split('-');
          const classTokens = d3.select(this).attr('class').split('-');
          const isLegendGroup = idTokens[0] === 'Legend';
          const isBranchLegend = classTokens.length > 1 && classTokens[1].includes('branch');
          const isSelectedBranch = classTokens[1] === selectedBranch;
          const isNotOverlapped = idTokens[2] === '0';

          return isLegendGroup && isSelectedBranch && isBranchLegend && isNotOverlapped;
        })
        .style('display', 'inline');

      d3.select('#module-structure').selectAll('path').remove();
      pathData = [];
      drawInceptionLayerConnections();
    }
  }

  $: if(selectedBranch && selectedBranch !== previousSelectedBranch) {
    reluActive = false;
    batchNormActive = false;
    d3.select('g#module-structure').selectAll("*").remove();
    drawInceptionModuleDetail(currentModule);
    updateInceptionBranch();
  }

  function drawFlatten(layerImages, visibleLayerIndex, layerIndex, layerX, layerY, display = 'inline', layerClass){
    // Color Sacle of the layer images
    [layerMax, layerMin] = getLayerMaxMin3D(layerImages);
    const boundaryValue = Math.max(Math.abs(layerMin), Math.abs(layerMax));
    console.log('flatten')
    
    const colorScale = d3.scaleLinear()
    .domain([-boundaryValue, 0, boundaryValue])
    .interpolate(d3.interpolate)
    .range([interpolateRdBu(0), interpolateRdBu(0.5), interpolateRdBu(1)]);

    let ImageX = 0;
    let ImageY = 0;
    const detailSVG = d3.select('#module-structure');
    const layerHeight = imageHeight;
    const layerWidth = 40;
    const linearRectWidth = layerWidth;

    writeLayerName(layerX + imageWidth / 2, layerY - offsetY, visibleLayerIndex, layerIndex, layerClass, display);

    layerImages.forEach((image, imageIndex) => {
      ImageX = layerX + (imageWidth - layerWidth) / 2;
      ImageY = layerY + (imageHeight + offsetY) * (imageIndex);
    
      const linearLayerGroup = detailSVG.append('g')
                              .attr('class', `IntermediateResult-${layerClass}`)
                              .attr('id', `IR-${visibleLayerIndex}-${layerIndex}-${imageIndex}`)
                              .attr('transform', `translate(${ImageX}, ${ImageY})`)
                              .style('display', display);

      const flatImage = Array.isArray(image) ? image.flat() : image;

      flatImage.forEach((value, blockIndex) =>{
        const linearRectHeight = layerHeight / flatImage.length;
        linearLayerGroup.append('rect')
        .attr('x', 0)
        .attr('y', linearRectHeight * blockIndex)
        .attr('width', linearRectWidth)
        .attr('height', linearRectHeight)
        .attr('class','block')
        .attr('id', `block-${imageIndex}-${blockIndex}`)
        .style('fill', colorScale(value))
        .style('stroke', 'black')
        .style('stroke-opacity', 0.5);
      });
      if (imageIndex != layerImages.length - 1) {
        const ellipsis = detailSVG.append('text')
          .attr('x', ImageX + linearRectWidth / 2) 
          .attr('y', ImageY + imageHeight + offsetY / 2 - 9) 
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('fill', 'black');

        const dots = ['.', '.', '.'];

        ellipsis.selectAll("tspan")
          .data(dots)
          .enter()
          .append("tspan")
          .attr('x', ImageX + linearRectWidth / 2)
          .attr('dy', (d, i) => i === 0 ? 0 : '6px')
          .text(d => d);
      }
    });
    drawLegend(layerX, ImageY + imageHeight + offsetY, boundaryValue, visibleLayerIndex, layerIndex, layerClass, display);
  }

  function drawLinear(layer, visibleLayerIndex, layerIndex, x, y, display = 'inline', layerClass){
    if(layerClass != 'relu'){
      [layerMax, layerMin] = getLayerMaxMin(layer);
    }
    const boundaryValue = Math.max(Math.abs(layerMin), Math.abs(layerMax));
    const colorScale = d3.scaleLinear()
    .domain([-boundaryValue, 0, boundaryValue])
    .interpolate(d3.interpolate)
    .range([interpolateRdBu(0), interpolateRdBu(0.5), interpolateRdBu(1)]);

    const detailSVG = d3.select('#module-structure');
    const linearLayerGroup = detailSVG.append('g')
                              .attr('class', `IntermediateResult-${layerClass}`)
                              .attr('id', `IR-${visibleLayerIndex}-${layerIndex}-0`)
                              .attr('transform', `translate(${x}, ${y})`)
                              .style('display', display);

    const layerHeight = (imageHeight + offsetY) * imageNum - offsetY;
    const layerWidth = 40;
    const linearRectHeight = layerHeight / layer.length;
    const linearRectWidth = layerWidth;

    writeLayerName(x + layerWidth / 2, y - offsetY, visibleLayerIndex, layerIndex, layerClass, display);

    layer.forEach((value, index) => {
      linearLayerGroup.append('rect')
        .attr('x', 0)
        .attr('y', linearRectHeight * index)
        .attr('width', linearRectWidth)
        .attr('height', linearRectHeight)
        .attr('class','block')
        .attr('id', `block-${index}`)
        .style('fill', colorScale(value))
        .style('stroke', 'black')
        .style('stroke-opacity', 0.5);
    });

    const currentWidth = detailSVG.attr('width');
    const currentHeight = detailSVG.attr('height');
    const requiredWidth = Math.max(currentWidth, x + layerWidth);
    const requiredHeight = Math.max(currentHeight, y + layerHeight);

    updateSVGSize(requiredWidth, requiredHeight);

    drawLegend(x + (linearRectWidth - imageWidth)/2 , y + linearRectHeight * layer.length + offsetY, boundaryValue, visibleLayerIndex, layerIndex, layerClass, display);
  }

  // Draw a layer which is contains IR results (Image or Linear)
  function drawLayer(layerImages, visibleLayerIndex, layerIndex, layerX, layerY, display, layerClass, branchName = 'none'){
    // Color Sacle of the layer images
    if(layerClass != 'relu'){
      [layerMax, layerMin] = getLayerMaxMin3D(layerImages);
    }
    const boundaryValue = Math.max(Math.abs(layerMin), Math.abs(layerMax));
    
    const colorScale = d3.scaleLinear()
    .domain([-boundaryValue, 0, boundaryValue])
    .interpolate(d3.interpolate)
    .range([interpolateRdBu(0), interpolateRdBu(0.5), interpolateRdBu(1)]);

    writeLayerName(layerX + imageWidth / 2, layerY - offsetY, visibleLayerIndex, layerIndex, layerClass, display, branchName);

    let ImageX = 0;
    let ImageY = 0;
    layerImages.forEach((image, imageIndex) => {
      ImageX = layerX;
      ImageY = layerY + (imageHeight + offsetY) * (imageIndex);
      drawImage(image, visibleLayerIndex, layerIndex, imageIndex, colorScale, ImageX, ImageY, display, layerClass, branchName);
    });


    // If layers over the svg size, update svg size.
    const detailSVG = d3.select('#module-structure');
    const imageSize = 133;
    const currentWidth = detailSVG.attr('width');
    const currentHeight = detailSVG.attr('height');
    const requiredWidth = Math.max(currentWidth, ImageX + imageSize);
    const requiredHeight = Math.max(currentHeight, ImageY + imageSize);

    updateSVGSize(requiredWidth, requiredHeight);
    
    drawLegend(ImageX, ImageY + imageHeight + offsetY, boundaryValue, visibleLayerIndex, layerIndex, layerClass, display, branchName);
  }

  function capitalize(str){
    if(str != 'relu' && str != 'bn'){
      return (str.charAt(0).toUpperCase() + str.slice(1));
    }
    return str;
  }
  function writeLayerName(x, y, visibleLayerIndex, layerIndex, layerClass, display, branchName = 'none'){
    if(layerClass == 'relu' && layerClass == 'bn'){
      return;
    }
    const capitalizedName = capitalize(layerClass);
    // const className = (branchName === 'none') ? `LayerName-${layerClass}`:  `LayerName-${branchName}-${layerClass}`;
    const detailSVG = (branchName === 'none') ? d3.select('#module-structure') : d3.select('#module-structure').select(`g#${branchName}`)
    
    const layerName = detailSVG
                      .append('text')
                      .datum(capitalizedName)
                      .attr('x', x)
                      .attr('y', y)
                      .attr('name', layerClass)
                      .attr('class', 'LayerName')
                      .attr('id', `LayerName-${visibleLayerIndex}`)
                      .attr('text-anchor', 'middle')
                      .attr('dominant-baseline', 'middle')
                      .text(d => d)
                      .attr('fill', 'black')
                      .style('display', display);
  }

  function drawLegend(x, y, boundaryValue, visibleLayerIndex, layerIndex, layerClass, display, branchName = 'none'){
    const legendHeight = 10;
    const legendWidth = 133;
    const className = (branchName === 'none') ? `Legend-${layerClass}`:  `Legend-${branchName}-${layerClass}`

    const legendGroup = d3.select('#module-structure').append("g")
      .attr('class', className)
      .attr('id', `Legend-${visibleLayerIndex}-${layerIndex}`)
      .attr("transform", `translate(${x}, ${y})`)
      .style('display', display);

    const gradient = legendGroup.append("defs")
      .append("linearGradient")
      .attr("id", "linear-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", interpolateRdBu(0));

    gradient.append("stop")
      .attr("offset", "50%")
      .attr("stop-color", interpolateRdBu(0.5));

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", interpolateRdBu(1));

    legendGroup.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#linear-gradient)");

    legendGroup.append("text")
      .attr("x", 0)
      .attr("y", legendHeight + 15)
      .attr("text-anchor", "start")
      .text((-boundaryValue).toFixed(2));

    legendGroup.append("text")
      .attr("x", legendWidth)
      .attr("y", legendHeight + 15)
      .attr("text-anchor", "end")
      .text(boundaryValue.toFixed(2));
}

  //Draw an Image
  function drawImage(image, visibleLayerIndex, layerIndex, imageIndex, colorScale, x, y, display, layerClass, branchName = 'none') {
    const cellSize = 133 / image.length;
    const numRows = image.length;
    const numCols = image[0].length; 
    const strokeFill = (layerClass === 'relu') || (layerClass === 'bn') ? 'black' : 'gray'
    // const strokeWidth = 1;
    const strokeWidth = 1;
    const className = (branchName === 'none') ? `IntermediateResult-${layerClass}`:  `IntermediateResult-${branchName}-${layerClass}`
    const detailSVG = (branchName === 'none') ? d3.select('#module-structure') : d3.select('#module-structure').select(`g#${branchName}`)

    const imageCells = detailSVG.append('g')
    .attr('class', className)
    .attr('id', `IR-${visibleLayerIndex}-${layerIndex}-${imageIndex}`)
    .attr('transform', `translate(${x}, ${y})`)
    .style('display', display);

    
    image.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        const cell = imageCells.append('rect')
          .attr('x', colIndex * cellSize)
          .attr('y', rowIndex * cellSize)
          .attr('id', `blcok-${rowIndex}-${colIndex}`)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .style('fill', colorScale(value));
          
        // Adding Outline for Edge Cells
        if (rowIndex === 0) { // Top
          drawLine(colIndex, rowIndex, colIndex + 1, rowIndex, strokeFill, strokeWidth);
        }
        if (rowIndex === numRows - 1) { // Bottom
          drawLine(colIndex, rowIndex + 1, colIndex + 1, rowIndex + 1, strokeFill, strokeWidth);
        }
        if (colIndex === 0) { // Left
          drawLine(colIndex, rowIndex, colIndex, rowIndex + 1, strokeFill, strokeWidth);
        }
        if (colIndex === numCols - 1) { // Right
          drawLine(colIndex + 1, rowIndex, colIndex + 1, rowIndex + 1, strokeFill, strokeWidth);
        }
      });
    });
    function drawLine(x1, y1, x2, y2, strokeFill, strokeWidth) {
      imageCells.append('line')
        .attr('x1', x1 * cellSize)
        .attr('y1', y1 * cellSize)
        .attr('x2', x2 * cellSize)
        .attr('y2', y2 * cellSize)
        .style('stroke', strokeFill)
        .style('stroke-width', strokeWidth)
        .style('stroke-opacity', 1);
    }
  }
  function getLayerMaxMin3D(layerImages) {
      let flattenedData = layerImages.flat(Infinity);
      const max = flattenedData.reduce((a, b) => Math.max(a, b));
      const min = flattenedData.reduce((a, b) => Math.min(a, b));

      return [max,min];
  }
  function getLayerMaxMin(layerImages) {
      const flattenedData = layerImages.flat();
      const max = flattenedData.reduce((a, b) => Math.max(a, b));
      const min = flattenedData.reduce((a, b) => Math.min(a, b));

      return [max,min];
  }
  function toggleReLU(){
    let targetLegendId = new Set();
    let detailSVG = d3.select('#module-structure');
    let reluClassSelector = 'g.IntermediateResult-relu';
    detailSVG.selectAll(reluClassSelector).each(function() {
        const id = d3.select(this).attr('id');
        const tokens = id.split('-');
        const LayerId = `IR-${tokens[1]}-0-${tokens[3]}`;
        const Layer = d3.select(`#${LayerId}`);
        targetLegendId.add(`Legend-${tokens[1]}-${tokens[2]}`);

        if(!reluActive){      
          Layer.transition().style('display', 'none')
              .on('start', () => {
                  d3.select(this).transition().style('display', 'inline');
              });
        }
        else{
          d3.select(this).transition().style('display', 'none')
              .on('start', () => {
                Layer.transition().style('display', 'inline');
              });
        }
    });

    targetLegendId.forEach(legendId => {
      const idTokens = legendId.split('-');
      const layerText = detailSVG.select(`text.LayerName#LayerName-${idTokens[1]}`);

      if(batchNormActive){
        const visibleLegend = detailSVG.selectAll('g').filter(function() {
          const gId = d3.select(this).attr('id');
          const tokens = gId.split('-');

          const isLegend =  tokens[0] == 'Legend';
          const isReluLegend = tokens[1] == idTokens[1] && tokens[2] != idTokens[2];
          return isLegend && isReluLegend;
        })
        const currentLegend = d3.select(visibleLegend.nodes()[visibleLegend.size() - 1]);
        if(!reluActive) { 
          currentLegend.transition().style('display', 'none');
          detailSVG.select(`g#${legendId}`).transition().style('display', 'inline'); 
          layerText.text('relu');
        }
        else{
          if(currentLegend.attr('class').includes('bn')){
            currentLegend.transition().style('display', 'none');
            detailSVG.select(`g#${legendId}`).transition().style('display', 'inline');
            layerText.text('bn');

          }
          else{
            detailSVG.select(`g#${legendId}`).transition().style('display', 'none');
            currentLegend.transition().style('display', 'inline');
            layerText.text(capitalize(layerText.attr('name')));
          }
        }
      }
      else{
        const visibleLegend = detailSVG.selectAll('g').filter(function() {
          const gId = d3.select(this).attr('id');
          const tokens = gId.split('-');

          const isLegend =  tokens[0] == 'Legend';
          const isNonReluLegend = tokens[1] == idTokens[1] && tokens[2] == '0';
          return isLegend && isNonReluLegend;
        })
        if(!reluActive) { 
          visibleLegend.transition().style('display', 'none');
          detailSVG.select(`g#${legendId}`).transition().style('display', 'inline'); 
          layerText.text('relu');
        }
        else{
          console.log(visibleLegend)
          visibleLegend.transition().style('display', 'inline');
          detailSVG.select(`g#${legendId}`).transition().style('display', 'none'); 
          layerText.text(capitalize(layerText.attr('name')));
        }
      }
    });

    if(typeof selectedBranch !== 'undefined'){
      targetLegendId = new Set();
      detailSVG = d3.select(`g#${selectedBranch}`);
      reluClassSelector = `g.IntermediateResult-${selectedBranch}-relu`;
    
      detailSVG.selectAll(reluClassSelector).each(function() {
          const id = d3.select(this).attr('id');
          const tokens = id.split('-');
          const LayerId = `IR-${tokens[1]}-0-${tokens[3]}`;
          const Layer = d3.select(`#${LayerId}`);
          targetLegendId.add(`Legend-${tokens[1]}-${tokens[2]}`);

          if(!reluActive){      
            Layer.transition().style('display', 'none')
                .on('start', () => {
                    d3.select(this).transition().style('display', 'inline');
                });
          }
          else{
            d3.select(this).transition().style('display', 'none')
                .on('start', () => {
                  Layer.transition().style('display', 'inline');
                });
          }
      });

      reluClassSelector = `.Legend-${selectedBranch}-relu`;
      detailSVG = d3.select('#module-structure');
      targetLegendId.forEach(legendId => {
        const idTokens = legendId.split('-');
        const layerText = detailSVG.select(`text.LayerName#LayerName-${idTokens[1]}`);

        if(batchNormActive){
          const visibleLegend = detailSVG.selectAll('g').filter(function() {
            const gId = d3.select(this).attr('id');
            const tokens = gId.split('-');

            const isLegend =  tokens[0] == 'Legend';
            const isReluLegend = tokens[1] == idTokens[1] && tokens[2] != idTokens[2];
            return isLegend && isReluLegend;
          })
          const currentLegend = d3.select(visibleLegend.nodes()[visibleLegend.size() - 1]);
          if(!reluActive) { 
            currentLegend.transition().style('display', 'none');
            detailSVG.select(`g#${legendId}`).transition().style('display', 'inline'); 
            layerText.text('relu');
          }
          else{
            if(currentLegend.attr('class').includes('bn')){
              currentLegend.transition().style('display', 'none');
              detailSVG.select(`g#${legendId}`).transition().style('display', 'inline');
              layerText.text('bn');

            }
            else{
              detailSVG.select(`g#${legendId}`).transition().style('display', 'none');
              currentLegend.transition().style('display', 'inline');
              layerText.text(capitalize(layerText.attr('name')));
            }
          }
        }
        else{
          const visibleLegend = detailSVG.selectAll('g').filter(function() {
            const gId = d3.select(this).attr('id');
            const tokens = gId.split('-');

            const isLegend =  tokens[0] == 'Legend';
            const isNonReluLegend = tokens[1] == idTokens[1] && tokens[2] == '0';
            return isLegend && isNonReluLegend;
          })
          if(!reluActive) { 
            visibleLegend.transition().style('display', 'none');
            detailSVG.select(`g#${legendId}`).transition().style('display', 'inline'); 
            layerText.text('relu');
          }
          else{
            console.log(visibleLegend)
            visibleLegend.transition().style('display', 'inline');
            detailSVG.select(`g#${legendId}`).transition().style('display', 'none'); 
            layerText.text(capitalize(layerText.attr('name')));
          }
        }
      });
    }
  }
  function toggleBN(){
    let targetLegendId = new Set();
    let detailSVG = d3.select('#module-structure');
    let bnClassSelector = 'g.IntermediateResult-bn';
    detailSVG.selectAll(bnClassSelector).each(function() {
      const id = d3.select(this).attr('id');
      const tokens = id.split('-');
      const LayerId = `IR-${tokens[1]}-0-${tokens[3]}`;
      const Layer = detailSVG.select(`#${LayerId}`);
      targetLegendId.add(`Legend-${tokens[1]}-${tokens[2]}`);

        if(!batchNormActive){      
          Layer.transition().style('display', 'none')
              .on('start', () => {
                  d3.select(this).transition().style('display', 'inline');
              });
        }
        else{
          d3.select(this).transition().style('display', 'none')
              .on('start', () => {
                Layer.transition().style('display', 'inline');
              });
        }
    });

    targetLegendId.forEach(legendId => {
      const idTokens = legendId.split('-');
      const layerText = detailSVG.select(`text.LayerName#LayerName-${idTokens[1]}`);

      if(reluActive){
        const visibleLegend = detailSVG.selectAll('g').filter(function() {
          const gId = d3.select(this).attr('id');
          const tokens = gId.split('-');

          const isLegend =  tokens[0] == 'Legend';
          const isReluLegend = tokens[1] == idTokens[1] && tokens[2] != idTokens[2];
          return isLegend && isReluLegend;
        })
        const currentLegend = d3.select(visibleLegend.nodes()[visibleLegend.size() - 1]);
        if(!batchNormActive) { 
          currentLegend.transition().style('display', 'none');
          detailSVG.select(`g#${legendId}`).transition().style('display', 'inline'); 
          layerText.text('bn');
        }
        else{
          if(currentLegend.attr('class').includes('relu')){
            currentLegend.transition().style('display', 'none');
            detailSVG.select(`g#${legendId}`).transition().style('display', 'inline');
            layerText.text('relu');

          }
          else{
            detailSVG.select(`g#${legendId}`).transition().style('display', 'none');
            currentLegend.transition().style('display', 'inline');
            layerText.text(capitalize(layerText.attr('name')));
          }
        }
      }
      else{
        const visibleLegend = detailSVG.selectAll('g').filter(function() {
          const gId = d3.select(this).attr('id');
          const tokens = gId.split('-');

          const isLegend =  tokens[0] == 'Legend';
          const isNonReluLegend = tokens[1] == idTokens[1] && tokens[2] == '0';
          return isLegend && isNonReluLegend;
        })
        if(!batchNormActive) { 
          visibleLegend.transition().style('display', 'none');
          detailSVG.select(`g#${legendId}`).transition().style('display', 'inline'); 
          layerText.text('bn');
        }
        else{
          detailSVG.select(`g#${legendId}`).transition().style('display', 'none'); 
          visibleLegend.transition().style('display', 'inline');
          layerText.text(capitalize(layerText.attr('name')));
        }
      }
    });


    if(typeof selectedBranch !== 'undefined'){
      targetLegendId = new Set();
      detailSVG = d3.select('#module-structure').select(`g#${selectedBranch}`);
      bnClassSelector = `g.IntermediateResult-${selectedBranch}-bn`;
    
      detailSVG.selectAll(bnClassSelector).each(function() {
          const id = d3.select(this).attr('id');
          const tokens = id.split('-');
          const LayerId = `IR-${tokens[1]}-0-${tokens[3]}`;
          const Layer = detailSVG.select(`#${LayerId}`);
          targetLegendId.add(`Legend-${tokens[1]}-${tokens[2]}`);

          if(!batchNormActive){      
            Layer.transition().style('display', 'none')
                .on('start', () => {
                    d3.select(this).transition().style('display', 'inline');
                });
          }
          else{
            d3.select(this).transition().style('display', 'none')
                .on('start', () => {
                  Layer.transition().style('display', 'inline');
                });
          }
      });


      bnClassSelector = `.Legend-${selectedBranch}-bn`;
      detailSVG = d3.select('#module-structure');
      
      targetLegendId.forEach(legendId => {
        const idTokens = legendId.split('-');
        const layerText = detailSVG.select(`text.LayerName#LayerName-${idTokens[1]}`);

        if(reluActive){
          const visibleLegend = detailSVG.selectAll('g').filter(function() {
            const gId = d3.select(this).attr('id');
            const tokens = gId.split('-');

            const isLegend =  tokens[0] == 'Legend';
            const isReluLegend = tokens[1] == idTokens[1] && tokens[2] != idTokens[2];
            return isLegend && isReluLegend;
          })
          const currentLegend = d3.select(visibleLegend.nodes()[visibleLegend.size() - 1]);
          if(!batchNormActive) { 
            currentLegend.transition().style('display', 'none');
            detailSVG.select(`g#${legendId}`).transition().style('display', 'inline'); 
            layerText.text('bn');
          }
          else{
            if(currentLegend.attr('class').includes('relu')){
              currentLegend.transition().style('display', 'none');
              detailSVG.select(`g#${legendId}`).transition().style('display', 'inline');
              layerText.text('relu');

            }
            else{
              detailSVG.select(`g#${legendId}`).transition().style('display', 'none');
              currentLegend.transition().style('display', 'inline');
              layerText.text(capitalize(layerText.attr('name')));
            }
          }
        }
        else{
          const visibleLegend = detailSVG.selectAll('g').filter(function() {
            const gId = d3.select(this).attr('id');
            const tokens = gId.split('-');

            const isLegend =  tokens[0] == 'Legend';
            const isNonReluLegend = tokens[1] == idTokens[1] && tokens[2] == '0';
            return isLegend && isNonReluLegend;
          })
          if(!batchNormActive) { 
            visibleLegend.transition().style('display', 'none');
            detailSVG.select(`g#${legendId}`).transition().style('display', 'inline'); 
            layerText.text('bn');
          }
          else{
            detailSVG.select(`g#${legendId}`).transition().style('display', 'none'); 
            visibleLegend.transition().style('display', 'inline');
            layerText.text(capitalize(layerText.attr('name')));
          }
        }
      });
    }
  }

  async function uploadImage(event) {
    const file = event.target.files[0];
    if (file) {
      userImageFile = file;
      await uploadFile(userImageFile);
    }
  }

  async function uploadFile(file) {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch(`${serverIP}/upload_image`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        console.log('File uploaded successfully');
      } else {
        alert('File upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('File upload failed');
    }
  }

  function toggleExpand() {
    isExpanded = !isExpanded;
    const modelContainer = document.getElementById('model-container');
    const moduleContainer = document.getElementById('module-container');

    const toggleButton = document.getElementById('toggle-button');

    if (isExpanded) {
      modelContainer.style.height = 'calc(30px)';
      moduleContainer.style.height = 'calc(100vh - 30px)';
      toggleButton.style.top = 'calc(20px)';
    } else {
      modelContainer.style.height = 'calc(50vh - 30px)';
      moduleContainer.style.height = 'calc(50vh - 30px)';
      toggleButton.style.top = 'calc(50vh - 40px)';
    }
  }
</script>

<style>
  #module-container {
    overflow: hidden;
    height: 100%;
    width: 100%;
  }
  #model-svg {
    cursor: grab;
  }
  #model-svg:active {
    cursor: grabbing;
  }
  #module-svg {
    cursor: grab;
  }
  #module-svg:active {
    cursor: grabbing;
  }
  .toggle-button {
    position: absolute;
    width: 250px;
    height: 20px;
    top: calc(50% - 10px);
    left: calc(50% - 75px);
    background-color: #e0e0e0;
    color: black;
    text-align: center;
    line-height: 20px;
    cursor: pointer;
    z-index: 1;
    border: 1px solid rgba(200, 200, 200, 255);
    border-radius: 5px;
    transition: top 0.5s ease, background-color 0.5s ease;
  }

  .toggle-button:hover {
    background-color: #d0d0d0;
  }

  #model-container, #module-container {
    transition: height 0.5s ease;
  }
  
</style>

<Header/>

<Container fluid>
  <Row class="h-100" style="height: calc(100vh - 60px);">
    <Col style="max-width: 280px; height: calc(100vh - 60px); overflow-y: auto; border: 1px solid rgba(225,225,225,255); background-color: rgba(249,249,249,255); padding: 10px; font-family: Arial, sans-serif;">
      <Row style="margin-bottom: 5px; align-items: center;">
        <Col>
          <FormCheck type="switch" id="form-model" label="Hugging Face Model URL" bind:checked={isHuggingFaceModel} />
        </Col>
      </Row>
      <Row style="align-items: center;">
        <Col xs="3">
          <FormGroup>
            <Label class="d-flex align-items-center" for="model-select">Model</Label>
          </FormGroup>
        </Col>
        <Col xs="9">
          <FormGroup>
            <Input type="select" bind:value={selectedModel} id="model-select" disabled={isHuggingFaceModel}>
              {#each imagenetModels as modelName}
                <option value={modelName}>{modelName}</option>
              {/each}
            </Input>
          </FormGroup>
        </Col>
      </Row>
      <Row style="margin-bottom: 5px; align-items: center;">
        <Col xs="3">
          <FormGroup>
            <Label class="d-flex align-items-center" for="HuggingFace-url">URL</Label>
          </FormGroup>
        </Col>
        <Col xs="9">
          <FormGroup>
            <Input type="text" id="model-url" placeholder="microsoft/resnet-18" bind:value={huggingFaceUrl} disabled={!isHuggingFaceModel} />
          </FormGroup>
        </Col>
      </Row>
      <Row style="margin-bottom: 5px; align-items: center;">
        <Col>
          <FormCheck type="switch" id="form-model" label="User Image Input" bind:checked={isUserInputImage} />
        </Col>
      </Row>
      <Row style="align-items: center;">
        <Col xs="3">
          <FormGroup>
            <Label class="d-flex align-items-center" for="class-select">Class</Label>
          </FormGroup>
        </Col>
        <Col xs="9">
          <FormGroup>
            <Input type="select" bind:value={selectedClass} id="class-select" disabled={isUserInputImage}>
              {#each Object.entries(imagenetClasses) as [index, className]}
                <option value={index}>{index}: {className}</option>
              {/each}
            </Input>
          </FormGroup>
        </Col>
      </Row>

      <Row style="margin-bottom: 5px; align-items: center;">
        <Col xs="3">
          <FormGroup>
            <Label class="d-flex align-items-center" for="class-select">Image Input</Label>
          </FormGroup>
        </Col>
        <Col xs="9">
          <FormGroup>
            <Input type="file" id="image-upload" accept="image/*" on:change={uploadImage} disabled={!isUserInputImage} />
          </FormGroup>
        </Col>
      </Row>
      <Row class="justify-content-center" style="margin-bottom: 5px; align-items: center;">
        <Button class="text-bg-primary" style="width: 90%; margin-top: 10px;" on:click={loadModel}>
          Load Model
        </Button>
      </Row>
      <Row style="margin-bottom: 5px; align-items: center;">
        <Col class="justify-content-end">
          <div class="align-items-center" style="gap: 10px;">
            <FormCheck type="switch" id="form-ReLU" label="ReLU" bind:checked={reluActive} on:change={toggleReLU} disabled={!openModal} />
          </div>
          <div class="align-items-center" style="gap: 10px;">
            <FormCheck type="switch" id="form-BN" label="BatchNorm" bind:checked={batchNormActive} on:change={toggleBN} disabled={!openModal} />
          </div>
        </Col>
      </Row>
      <Row>
        <Col class="justify-content-end" style="min-height: 24px;"> 
          {#if selectedModule == "inception" && selectedBranch != undefined}
            <div>
              <Input type="select" bind:value={selectedBranch} id="branch-select" style="width: auto;">
                {#each branches as branch}
                  <option value={branch}>{branch}</option>
                {/each}
              </Input>
            </div>
          {/if}
        </Col>
      </Row>
      <Row class="align-items-center" style="justify-content: flex-center;">
        <Col>
          {#if inputImageUrl}
            <img src={inputImageUrl} style="max-width: 100%; height: auto;" />
          {/if}
        </Col>
      </Row>
    </Col>
    <Col class="p-0" style="flex-grow: 1; height: calc(100vh - 60px); position: relative;">
      <div id="model-container" style="width: 100%; height: calc(50vh - 30px); border: 1px solid rgba(225,225,225,255); overflow: auto;">
        <svg id="model-svg" style="width: 100%; height: 100%; display: block; min-width: 100%; min-height: 100%;">
          <g id="model-structure"></g>
        </svg>
      </div>
      <div id="toggle-button" class="toggle-button" on:click={toggleExpand}>{isExpanded ? 'Collapse Layer View' : 'Expand Layer View'}</div>
      <div id="module-container" style="width: 100%; height: calc(50vh - 30px); border: 1px solid rgba(225,225,225,255); overflow: auto;">
        <svg id="module-svg" style="width: 100%; height: 100%; display: block; min-width: 100%; min-height: 100%;">
          <g id="module-structure"></g>
        </svg>
      </div>
    </Col>
  </Row>
</Container>