import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';

// Renamed the prop from 'model' to 'modelData' for clarity
const ModelVisualizer = ({ modelData }) => {
    const containerRef = useRef(null);
    const [modelStructure, setModelStructure] = useState([]);
    const [selectedLayerIndex, setSelectedLayerIndex] = useState(null);
    const [renderError, setRenderError] = useState(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const layerMeshes = useRef([]);
    
    // Enhanced layer colors based on type
    const layerColors = {
        conv2d: 0xff00ff,        // Magenta
        depthwiseconv2d: 0xff6600, // Orange
        batchnorm: 0x9933ff,     // Purple
        activation: 0x0099ff,    // Light blue
        add: 0xff3333,           // Red
        concat: 0x33ff33,        // Green
        maxpooling2d: 0xffff00,  // Yellow
        averagepooling2d: 0xffcc00, // Gold
        flatten: 0x00ffff,       // Cyan
        dense: 0x00ff00,         // Green
        dropout: 0x999999,       // Gray
        default: 0xcccccc        // Light gray
    };

    // Initialize visualization and prepare model structure data
    useEffect(() => {
        console.log("ModelVisualizer useEffect triggered");
        
        function debugModelStructure(model) {
            try {
                if (!model) return "Model data is null or undefined";
                
                // Direct debug of what we received
                return `Model data: ${JSON.stringify(model).substring(0, 200)}...`;
            } catch (e) {
                return `Error in debug: ${e.message}`;
            }
        }

        // Extensive debugging
        console.log("Model debug:", debugModelStructure(modelData));

        if (!modelData) {
            console.warn("No model data provided to ModelVisualizer");
            setRenderError("No model data provided");
            return;
        }
        
        if (!containerRef.current) {
            console.warn("Container reference not ready yet");
            return;
        }
        
        try {
            // Extract layers from model data - handle multiple possible formats
            const layers = extractLayers(modelData);
            
            if (!layers || !Array.isArray(layers) || layers.length === 0) {
                setRenderError("No layers found in model data");
                return;
            }
            
            console.log(`Found ${layers.length} layers in model data`);
            
            // Extract model structure safely
            const processedLayers = layers.map((layer, index) => {
                const safeParse = (obj, property, defaultValue) => {
                    try {
                        return obj && obj[property] !== undefined ? obj[property] : defaultValue;
                    } catch (e) {
                        return defaultValue;
                    }
                };
                
                // Ensure all required properties have fallbacks using safeParse
                return {
                    id: index,
                    name: safeParse(layer, 'name', `layer_${index}`),
                    type: safeParse(layer, 'type', 'unknown'),
                    filters: safeParse(layer, 'filters', 0),
                    kernelSize: safeParse(layer, 'kernel_size', []),
                    units: safeParse(layer, 'units', 0),
                    activation: safeParse(layer, 'activation', 'none'),
                    strides: safeParse(layer, 'strides', [1, 1])
                };
            });
            
            setModelStructure(processedLayers);
            
            // Set up scene after layers are processed
            setTimeout(() => {
                try {
                    initThreeJsScene();
                } catch (error) {
                    console.error("Failed to initialize Three.js scene:", error);
                    setRenderError(`Three.js initialization error: ${error.message}`);
                }
            }, 100);
        } catch (error) {
            console.error("Error in ModelVisualizer effect:", error);
            setRenderError(`Error processing model: ${error.message}`);
        }
        
        return () => {
            // Clean up Three.js resources
            console.log("Cleaning up Three.js resources");
            if (rendererRef.current && containerRef.current) {
                try {
                    containerRef.current.removeChild(rendererRef.current.domElement);
                    rendererRef.current.dispose();
                } catch (e) {
                    console.warn("Error during Three.js cleanup:", e);
                }
            }
            
            if (controlsRef.current && controlsRef.current.dispose) {
                controlsRef.current.dispose();
            }
        };
    }, [modelData]);

    // Helper function to extract layers from different possible model structures
    const extractLayers = (modelData) => {
        if (!modelData) return null;
        
        console.log("Extracting layers from model data:", 
                     JSON.stringify(modelData).substring(0, 200) + "...");
        
        // Case 1: Direct layers array
        if (Array.isArray(modelData)) {
            console.log("Case 1: Direct layers array");
            return modelData;
        }
        
        // Case 2: {model: {layers: [...]}}
        if (modelData.model && Array.isArray(modelData.model.layers)) {
            console.log("Case 2: {model: {layers: [...]}}");
            return modelData.model.layers;
        }
        
        // Case 3: {layers: [...]}
        if (Array.isArray(modelData.layers)) {
            console.log("Case 3: {layers: [...]}");
            return modelData.layers;
        }
        
        // Case 4: CNNModel.model = {model: {model: {layers: [...]}}}
        if (modelData.model && modelData.model.model && Array.isArray(modelData.model.model.layers)) {
            console.log("Case 4: Deep nested structure");
            return modelData.model.model.layers;
        }
        
        console.error("Could not find layers in model data");
        return null;
    };

    const initThreeJsScene = () => {
        console.log("Initializing Three.js scene");
        const container = containerRef.current;
        if (!container) {
            console.error("Container reference is null");
            setRenderError("Visualization container not found");
            return;
        }
        
        const width = container.clientWidth;
        const height = container.clientHeight || 600;
        console.log("Container dimensions:", { width, height });
        
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf7f7f7);
        sceneRef.current = scene;
        
        // Create camera
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, 5, 20);
        cameraRef.current = camera;
        
        // Create renderer
        try {
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            
            // Check if the container already has a canvas
            const existingCanvas = container.querySelector('canvas');
            if (existingCanvas) {
                console.log("Removing existing canvas");
                container.removeChild(existingCanvas);
            }
            
            container.appendChild(renderer.domElement);
            rendererRef.current = renderer;
            
            console.log("Three.js renderer initialized successfully");
        } catch (error) {
            console.error("Failed to create WebGL renderer:", error);
            setRenderError(`WebGL initialization error: ${error.message}`);
            return;
        }
        
        // Simple manual controls for rotation and zoom since OrbitControls is not available
        let isDragging = false;
        let previousMouseX = 0;
        let previousMouseY = 0;
        
        container.addEventListener('mousedown', function(e) {
            isDragging = true;
            previousMouseX = e.clientX;
            previousMouseY = e.clientY;
        });
        
        window.addEventListener('mouseup', function() {
            isDragging = false;
        });
        
        window.addEventListener('mousemove', function(e) {
            if (isDragging) {
                const deltaX = e.clientX - previousMouseX;
                const deltaY = e.clientY - previousMouseY;
                
                scene.rotation.y += deltaX * 0.01;
                scene.rotation.x += deltaY * 0.01;
                
                previousMouseX = e.clientX;
                previousMouseY = e.clientY;
            }
        });
        
        // Add mouse wheel zoom
        container.addEventListener('wheel', function(e) {
            e.preventDefault();
            camera.position.z += e.deltaY * 0.05;
            // Keep camera from getting too close or too far
            camera.position.z = Math.max(5, Math.min(50, camera.position.z));
        });
        
        // Clear any existing content
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
        scene.add(hemisphereLight);
        
        // Add a grid for better spatial reference
        const gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0x444444);
        gridHelper.position.y = -5;
        scene.add(gridHelper);
        
        // Add a simple cube to test rendering
        const testCube = new THREE.Mesh(
            new THREE.BoxGeometry(5, 5, 5),
            new THREE.MeshPhongMaterial({ color: 0x6e8efb })
        );
        testCube.position.set(0, 0, 0);
        scene.add(testCube);
        console.log("Added test cube to scene");
        
        // Visualize model layers
        if (modelData) {
            try {
                visualizeLayers();
            } catch (error) {
                console.error("Error visualizing layers:", error);
                setRenderError(`Layer visualization error: ${error.message}`);
            }
        } else {
            console.warn("No layers found in model");
        }
        
        // Add raycaster for interactivity
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        container.addEventListener('click', function(event) {
            // Calculate mouse position in normalized device coordinates
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
            
            // Update the picking ray with the camera and mouse position
            raycaster.setFromCamera(mouse, camera);
            
            // Calculate objects intersecting the picking ray
            const intersects = raycaster.intersectObjects(layerMeshes.current);
            
            if (intersects.length > 0) {
                const object = intersects[0].object;
                const layerIndex = object.userData.layerIndex;
                setSelectedLayerIndex(layerIndex);
                
                // Highlight the selected layer
                layerMeshes.current.forEach((mesh, index) => {
                    if (index === layerIndex) {
                        mesh.material.emissive = new THREE.Color(0x555555);
                        mesh.material.emissiveIntensity = 0.5;
                    } else {
                        mesh.material.emissive = new THREE.Color(0x000000);
                        mesh.material.emissiveIntensity = 0;
                    }
                });
            }
        });
        
        // Animation loop
        const animate = () => {
            if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
                console.warn("Required Three.js objects are not available for animation");
                return;
            }
            
            // Rotate the test cube
            if (testCube) {
                testCube.rotation.x += 0.01;
                testCube.rotation.y += 0.01;
            }
            
            requestAnimationFrame(animate);
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        };
        
        animate();
        
        // Handle window resize
        const handleResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
            
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight || 600;
            
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            
            rendererRef.current.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);
    };
    
    const visualizeLayers = () => {
        console.log("Visualizing layers");
        
        // Extract layers safely using the same helper
        const layers = extractLayers(modelData);
        
        if (!layers || !sceneRef.current) {
            console.warn("Required data for layer visualization is missing");
            setRenderError("Cannot visualize layers: missing model data");
            return;
        }
        
        const scene = sceneRef.current;
        
        // Clear previous meshes
        layerMeshes.current = [];
        
        // Position variables
        let posZ = -10;
        const spacing = 2; // Reduced spacing for models with many layers
        
        // Create a group to hold all layer objects
        const modelGroup = new THREE.Group();
        
        // Add connection lines between layers
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x0088ff,
            transparent: true,
            opacity: 0.5,
            linewidth: 1
        });
        
        // Keep track of layer positions for residual connections
        const layerPositions = {};
        
        console.log(`Processing ${layers.length} layers for visualization`);
        
        // Add each layer as a 3D object
        layers.forEach((layer, index) => {
            let geometry, material, mesh;
            let layerSize;
            
            // Calculate size based on layer parameters
            const getLayerSize = (layer) => {
                if (layer.filters) return Math.min(4, Math.max(1, layer.filters / 32));
                if (layer.units) return Math.min(3, Math.max(1, layer.units / 128));
                return 2; // Default size
            };
            
            // Determine geometry and size based on layer type
            try {
                
                // switch(layer.type.toLowerCase()) {
                //     case 'conv2d':
                //         layerSize = getLayerSize(layer);
                //         geometry = new THREE.BoxGeometry(layerSize, layerSize, 0.6);
                //         break;
                //     case 'depthwiseconv2d':
                //         layerSize = getLayerSize(layer);
                //         // Use a different shape for depthwise convolution
                //         geometry = new THREE.BoxGeometry(layerSize * 1.2, layerSize * 0.8, 0.6);
                //         break;
                //     case 'maxpooling2d':
                //     case 'averagepooling2d':
                //         layerSize = 1.5;
                //         geometry = new THREE.OctahedronGeometry(layerSize, 0);
                //         break;
                //     case 'flatten':
                //         geometry = new THREE.PlaneGeometry(3, 0.5);
                //         break;
                //     case 'dense':
                //         layerSize = Math.min(3, Math.max(1, layer.units / 64));
                //         geometry = new THREE.CylinderGeometry(layerSize, layerSize, 0.8, 32);
                //         // Rotate cylinder to stand upright
                //         geometry.rotateX(Math.PI / 2);
                //         break;
                //     case 'batchnorm':
                //         geometry = new THREE.TorusGeometry(1.2, 0.3, 8, 16);
                //         break;
                //     case 'add':
                //         geometry = new THREE.TetrahedronGeometry(1.5, 0);
                //         break;
                //     case 'concat':
                //         geometry = new THREE.IcosahedronGeometry(1.5, 0);
                //         break;
                //     default:
                //         geometry = new THREE.BoxGeometry(1.8, 1.8, 0.5);
                    
                // }
                
                // Material with custom color based on layer type
                layerSize = Math.min(4, Math.max(1, (layer.filters || layer.units || 32) / 32));
geometry = new THREE.BoxGeometry(layerSize, layerSize, layerSize);
                const color = layerColors[layer.type.toLowerCase()] || layerColors.default;
                material = new THREE.MeshPhongMaterial({ 
                    color: color,
                    specular: 0x111111,
                    shininess: 30,
                    flatShading: true
                });
                
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.z = posZ;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                // Store layer index for interaction
                mesh.userData.layerIndex = index;
                
                // Store position for possible skip connections
                layerPositions[layer.name] = posZ;
                
                // Add to our reference array for raycasting
                layerMeshes.current.push(mesh);
                
                // Add text label for layer name
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 128;
                const context = canvas.getContext('2d');
                context.fillStyle = 'white';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = 'black';
                context.font = '18px Arial';
                context.textAlign = 'center';
                
                // Create a descriptive label
                let label = layer.type;
                if (layer.filters) label += ` (${layer.filters})`;
                if (layer.units) label += ` (${layer.units})`;
                
                // Draw text with line break if needed
                if (label.length > 20) {
                    const parts = label.split(' ');
                    const mid = Math.floor(parts.length / 2);
                    
                    const line1 = parts.slice(0, mid).join(' ');
                    const line2 = parts.slice(mid).join(' ');
                    
                    context.fillText(line1, canvas.width / 2, 58);
                    context.fillText(line2, canvas.width / 2, 78);
                } else {
                    context.fillText(label, canvas.width / 2, 64);
                }
                
                const texture = new THREE.CanvasTexture(canvas);
                const labelMaterial = new THREE.SpriteMaterial({ map: texture });
                const labelSprite = new THREE.Sprite(labelMaterial);
                labelSprite.position.set(0, 2.5, posZ);
                labelSprite.scale.set(4, 2, 1);
                
                // Add connection to previous layer
                if (index > 0) {
                    const prevPosZ = posZ - spacing;
                    const points = [
                        new THREE.Vector3(0, 0, prevPosZ),
                        new THREE.Vector3(0, 0, posZ)
                    ];
                    
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(lineGeometry, lineMaterial);
                    modelGroup.add(line);
                }
                
                // Handle residual / skip connections if this is an add layer
                if (layer.type === 'add' && index > 4) {  // Simplified check for potential skip connection
                    // This is a simplified way to visualize skip connections
                    const skipStartPos = posZ - spacing * 3; // Skip back a few layers
                    const skipPoints = [
                        new THREE.Vector3(2, 1, skipStartPos),
                        new THREE.Vector3(2, 1, posZ - spacing / 2),
                        new THREE.Vector3(0, 0, posZ)
                    ];
                    
                    const skipCurve = new THREE.CatmullRomCurve3(skipPoints);
                    const skipGeometry = new THREE.TubeGeometry(skipCurve, 20, 0.1, 8, false);
                    const skipMaterial = new THREE.MeshPhongMaterial({ 
                        color: 0xffaa00, 
                        transparent: true,
                        opacity: 0.7
                    });
                    const skipMesh = new THREE.Mesh(skipGeometry, skipMaterial);
                    modelGroup.add(skipMesh);
                }
                
                modelGroup.add(mesh);
                modelGroup.add(labelSprite);
                
            } catch (error) {
                console.error(`Error processing layer ${index} (${layer.type}):`, error);
            }
            
            // Update position for next layer
            posZ += spacing;
        });
        
        scene.add(modelGroup);
        console.log("Added model group to scene with", modelGroup.children.length, "elements");
        
        // Center the model
        modelGroup.position.z = layers.length * spacing / 2;
        
        // Adjust camera to see the full model
        const totalLength = layers.length * spacing;
        if (cameraRef.current) {
            cameraRef.current.position.z = totalLength / 2;
            cameraRef.current.position.y = totalLength / 4;
            cameraRef.current.lookAt(new THREE.Vector3(0, 0, totalLength / 2));
        }
    };

    // Simulate input data for visualization
    const loadSampleImageData = () => {
        console.log("Visualizing with sample data");
        const sampleData = document.createElement('img');
        sampleData.src = '/assets/images/samples/cat.jpg';
        // In a full implementation, this would animate data through the network
    };

    const reinitializeVisualization = () => {
        if (containerRef.current && modelData) {
            // Clean up existing scene
            if (rendererRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
                containerRef.current.removeChild(rendererRef.current.domElement);
            }
            
            // Reset error state
            setRenderError(null);
            
            // Reinitialize
            setTimeout(() => {
                try {
                    initThreeJsScene();
                } catch (error) {
                    console.error("Error during reinitialization:", error);
                    setRenderError(`Reinitialization error: ${error.message}`);
                }
            }, 100);
        }
    };

    // Fallback visualization for when Three.js fails or model is invalid
    const renderFallbackVisualization = () => {
        // Extract layers safely
        const layers = extractLayers(modelData);
        
        if (!layers || !Array.isArray(layers)) {
            return (
                <div className="fallback-message">
                    <p>No valid model data available</p>
                    <p>Please try selecting a different model from the dropdown menu</p>
                    <p className="debug-info">
                        <small>Debug: {modelData ? JSON.stringify(modelData).substring(0, 300) + "..." : "null"}</small>
                    </p>
                </div>
            );
        }
        
        return (
            <div className="fallback-visualization">
                <h3>Model Architecture (2D Fallback)</h3>
                <p>Showing simplified model structure:</p>
                <svg width="100%" height={layers.length * 60 + 100} style={{border: "1px solid #ddd"}}>
                    {layers.map((layer, index) => {
                        const x = 100;
                        const y = 50 + index * 60;
                        const color = layerColors[layer.type?.toLowerCase()] || layerColors.default;
                        const hexColor = `#${color.toString(16)}`;
                        
                        return (
                            <g key={index}>
                                <rect 
                                    x={x} 
                                    y={y} 
                                    width="200" 
                                    height="40" 
                                    fill={hexColor} 
                                    rx="5" 
                                    ry="5"
                                />
                                <text 
                                    x={x + 100} 
                                    y={y + 25} 
                                    textAnchor="middle" 
                                    fill="white"
                                >
                                    {layer.type || 'unknown'} {layer.filters ? `(${layer.filters})` : ''}
                                    {layer.units ? `(${layer.units})` : ''}
                                </text>
                                
                                {index > 0 && (
                                    <line 
                                        x1={x + 100} 
                                        y1={y} 
                                        x2={x + 100} 
                                        y2={y - 20} 
                                        stroke="#0088ff" 
                                        strokeWidth="2"
                                    />
                                )}
                            </g>
                        );
                    })}
                </svg>

                <div className="fallback-layer-list">
                    <h4>Model Layers:</h4>
                    <ul>
                        {layers.map((layer, index) => (
                            <li key={index}>
                                <strong>{layer.type || 'unknown'}</strong>: {layer.name || `layer_${index}`}
                                {layer.filters ? ` (Filters: ${layer.filters})` : ''}
                                {layer.units ? ` (Units: ${layer.units})` : ''}
                                {layer.activation && layer.activation !== 'none' ? ` | Activation: ${layer.activation}` : ''}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    return (
        <div className="model-visualizer">
            <h2>3D Model Visualization</h2>
            <p className="model-instructions">
                <strong>Interact with the model:</strong> Click and drag to rotate, scroll to zoom.
                Click on any layer to see its details below.
            </p>
            
            {renderError ? (
                <div className="error-message">
                    <p>Error rendering 3D visualization: {renderError}</p>
                    <button className="button" onClick={reinitializeVisualization}>Try Again</button>
                    {renderFallbackVisualization()}
                </div>
            ) : (
                <>
                    <div 
                        ref={containerRef} 
                        className="model-container-3d"
                        style={{ minHeight: '600px' }}
                    ></div>
                    
                    <div className="model-controls">
                        <button className="button" onClick={loadSampleImageData}>
                            Visualize with Sample Data
                        </button>
                        <button className="button" onClick={reinitializeVisualization} style={{marginLeft: '10px'}}>
                            Reset View
                        </button>
                    </div>
                </>
            )}
            
            <div className="model-structure">
                <h3>Model Layer Structure</h3>
                <ul className="layer-list">
                    {modelStructure.map((layer, index) => (
                        <li 
                            key={layer.id} 
                            className={selectedLayerIndex === index ? 'selected-layer' : ''}
                            onClick={() => setSelectedLayerIndex(index)}
                        >
                            <div className="layer-icon" style={{ 
                                backgroundColor: `#${(layerColors[layer.type.toLowerCase()] || layerColors.default).toString(16)}` 
                            }}></div>
                            <div className="layer-info">
                                <span className="layer-name">{layer.name}</span>
                                <span className="layer-details">
                                    {layer.filters ? `Filters: ${layer.filters}` : ''}
                                    {layer.units ? `Units: ${layer.units}` : ''}
                                    {layer.activation !== 'none' ? ` | Activation: ${layer.activation}` : ''}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
                
                {selectedLayerIndex !== null && (
                    <div className="selected-layer-details">
                        <h4>Selected Layer Details</h4>
                        <pre>{JSON.stringify(modelStructure[selectedLayerIndex], null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelVisualizer;
