<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
  
    onMount(() => {
      const svg = d3.select('#svg-container')
                    .append('svg')
                    .attr('width', 600)
                    .attr('height', 400);
  
      const images = [
        { id: 'img1', url: 'images/image_1.jpg', x: 100, y: 100 },  // Assuming image_1.jpg is in the public folder
        { id: 'img2', url: 'images/image_2.jpg', x: 400, y: 100 }  // Assuming image_2.jpg is in the public folder
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
                .attr('width', 100)
                .attr('height', 100)
                .on('mouseover', function() { d3.select(this).style('stroke', 'black').style('stroke-width', 3); })
                .on('mouseout', function() { d3.select(this).style('stroke', null); });
  
      const line = d3.line().curve(d3.curveBasis);
      const points = [
        [images[0].x + 50, images[0].y + 100],
        [(images[0].x + images[1].x) / 2, images[0].y + 150],
        [images[1].x + 50, images[1].y + 100]
      ];
  
      svg.append('path')
         .datum(points)
         .attr('d', line)
         .attr('fill', 'none')
         .attr('stroke', 'black')
         .attr('stroke-width', 2);
    });
  </script>
  
  <div id="svg-container"></div>
  