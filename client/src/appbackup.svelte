let lines;  
let svg = undefined;

onMount(() => {
    svg = d3.select('#model-container')
                  .append('svg')
                  .attr('width', 1000)
                  .attr('height', 1000);

    const images = [
      { id: 'img1', url: 'images/image_1.jpg', x: 100, y: 100, width: 100, height: 100 },  // Assuming image_1.jpg is in the public folder
      { id: 'img2', url: 'images/image_2.jpg', x: 400, y: 100, width: 100, height: 100 },  // Assuming image_2.jpg is in the public folder
      { id: 'img3', url: 'images/image_3.jpg', x: 400, y: 300, width: 100, height: 100 },  // Assuming image_3.jpg is in the public folder
      { id: 'img4', url: 'images/image_4.jpg', x: 400, y: 500, width: 100, height: 100 },  // Assuming image_4.jpg is in the public folder
      { id: 'img5', url: 'images/image_5.jpg', x: 700, y: 100, width: 100, height: 100 }  // Assuming image_5.jpg is in the public folder
    ];
    
    //TODO(yskim): Need to make a connections using for loop. Image naming rule is needed. 
    const connections = [
      { source: 'img1', target: 'img2' },
      { source: 'img1', target: 'img3' },
      { source: 'img1', target: 'img4' },
      { source: 'img2', target: 'img5' },
      { source: 'img3', target: 'img5' },
      { source: 'img4', target: 'img5' }
    ];

    const imageGroup = svg.selectAll('.image-group')
                          .data(images)
                          .enter()
                          .append('g')
                          .attr('class', 'image-group');

    imageGroup.append('image')
              .attr('xlink:href', d => d.url)
              .attr('x', d => d.x)
              .attr('y', d => d.y)
              .attr('width', d => d.width)
              .attr('height', d => d.height);

    const border = imageGroup.append('rect')
                  .attr('x', d => d.x)
                  .attr('y', d => d.y)
                  .attr('width', d => d.width)
                  .attr('height', d => d.height)
                  .attr('id', d => d.id)
                  .style('fill', 'none')
                  .style('stroke', 'gray')
                  .style('stroke-width', 1);

    // Draw lines
    lines = connections.map(conn => {
      const sourceImage = images.find(img => img.id === conn.source);
      const targetImage = images.find(img => img.id === conn.target);

      const link = d3.linkHorizontal()
                      .source(() => [sourceImage.x + sourceImage.width, sourceImage.y + sourceImage.height / 2])
                      .target(() => [targetImage.x, targetImage.y + targetImage.height / 2]);

      return svg.append('path')
              .attr('d', link())
              .attr('fill', 'none')
              .attr('stroke', 'gray')
              .attr('stroke-width', 1)
              .attr('id', `line-${conn.source}-${conn.target}`);
  });

  // Event handlers for images
  imageGroup.on('mouseover', function(d) {
    d3.select(this).select('rect').style('stroke-width', 3); // Bold border
    const rectId = d3.select(this).select('rect').attr('id')

    // Bold connected lines
    lines.forEach(line => {
      if (line.attr('id').includes(rectId)) {
        line.style('stroke-width', 3);
      }
    });
  }).on('mouseout', function(d) {
    d3.select(this).select('rect').style('stroke-width', 1); // Revert border width
    const rectId = d3.select(this).select('rect').attr('id')

    // Revert line width
    lines.forEach(line => {
      if (line.attr('id').includes(rectId)) {
        line.style('stroke-width', 1);
      }
    });
  });

  // Create a rect covering specific images
  const overlayRect = svg.append('rect')
                         .attr('x', 350) // Starting x-coordinate
                         .attr('y', 50)  // Starting y-coordinate
                         .attr('width', 500) // Width
                         .attr('height', 200) // Height
                         .attr('id', 'overlay1')
                         .style('fill', 'none')
                         .style('stroke', 'black')
                         .style('stroke-width', 2)
                         .style('stroke-dasharray', "10,5") // Dash pattern: 10px dash, 5px gap
                         .style('pointer-events', 'all')
                         .style('cursor', 'pointer');

  // Function to check if an image is inside the rectangle
  function isImageInsideRect(image, overlay) {
    const right = overlay.x.baseVal.value + overlay.width.baseVal.value;
    const bottom = overlay.y.baseVal.value + overlay.height.baseVal.value;
    return (
      image.x >= overlay.x.baseVal.value &&
      image.y >= overlay.y.baseVal.value &&
      image.x + image.width <= right &&
      image.y + image.height <= bottom
    );
  }


  // Mouseover and mouseout event handlers for the overlay rect
  overlayRect.on('mouseover', function() {
    images.forEach(image => {
      if (isImageInsideRect(image, this)) {
        svg.select(`#${image.id}`).style('stroke-width', 3); // Bold border for covered images
        coveredImageIds.push(image.id);
      }  
    });
    // Bold connected lines
    connections.forEach(conn => {
      if (coveredImageIds.includes(conn.source) && coveredImageIds.includes(conn.target)) {
        svg.select(`#line-${conn.source}-${conn.target}`).style('stroke-width', 3);
      }
    });
  }).on('mouseout', function() {
    images.forEach(image => {
      if (coveredImageIds.includes(image.id)) {
        svg.select(`#${image.id}`).style('stroke-width', 1); // Revert border width for covered images
      }
    });
    // Revert line width
    connections.forEach(conn => {
      if (coveredImageIds.includes(conn.source) && coveredImageIds.includes(conn.target)) {
        svg.select(`#line-${conn.source}-${conn.target}`).style('stroke-width', 1);
      }
    });
    coveredImageIds = [];
  }).on('click', function(){      
    // 이미 클릭된 상태라면 해제
    if (this.id === clickedOverlayRect) {
        d3.select(this).style('fill', 'none');
        clickedOverlayRect = null;
        return;
    }

    // 이전에 클릭된 rect가 있다면, 그 스타일을 해제
    if (clickedOverlayRect) {
      d3.select(`#${clickedOverlayRect}`).style('fill', 'none');
    }

    // 현재 rect의 스타일 설정 및 추적
    d3.select(this).style('fill', 'gray');
    clickedOverlayRect = this.id;
  });
}); //End of on mount function
