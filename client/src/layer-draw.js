
function drawImage(image, max, min, offsetX, offsetY) {
    const cellSize = 1;
    const g = svg.append('g')
      .attr('transform', `translate(${offsetX}, ${offsetY})`);
    
    console.log(image)
    image.forEach((row, i) => {
      row.forEach((value, j) => {
        g.append('rect')
          .attr('x', j * cellSize)
          .attr('y', i * cellSize)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr('fill', getFillColor(value));
      });
    });
  }
  // TODO(YSKIM): LayerImage대신 Layerindex를 쓰는걸로
  function drawLayer(layerImages, offsetX, offestY) {
    const [max, min] = getLayerMaxMin(layerImages);
    const imageHeight = 113;
    const padding = 10;

    layerImages.forEach((image, index) => {
      const offsetX = 10;
      const offsetY = index * (imageHeight + padding);
      drawImage(image, max, min, offsetX, offsetY);
    });
  }

  // 배열의 각 요소를 그레이스케일 색상으로 변환하는 함수
  function getFillColor(value) {
    const color = Math.floor(value/255);
    return `rgb(${color},${color},${color})`;
  }

  // TODO(YSKIM): Module Max Min으로 바꿔야함
  function getLayerMaxMin(layerImages) {
    const flatImages = layerImages.flat(3);

    const sortedImages = flatImages.sort((a, b) => a - b);

    console.log(sortedImages)
    const max = Math.max(...flatImages);
    const min = Math.min(...flatImages);
    console.log(max)
    console.log(min)
    
    return [max, min];
  }

  function getImageMaxMin(image) {
    const flatImage = image.flat(2);

    const max = Math.max(...flatImage);
    const min = Math.min(...flatImage);

    return [max, min];
  }

  function normalizeAndScale(image, max, min) {
    return image.map(row =>
      row.map(value => (value - min) / (max - min) * 255)
    );
  }
  /*
  function drawModule() {
    for (moduleType in moduleLists) {
      if (moduleType === 'conv') {
        //색상 파랑
      } 
      else if (moduleType === 'dense') {
        //색상 노랑
      }
      else if (moduleType === 'inception') {
        //색상 회색
      }
      else if (moduleType === 'residual') {
        //색상 녹색
      }
    }
  }
  */