import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as tf from '@tensorflow/tfjs';
import LayerInfoPanel from './LayerInfoPanel';
import ModelPerformanceMetrics from './ModelPerformanceMetrics';
import MobileNetV2Explainer from './MobileNetV2Explainer';

const ThreeJSCNNVisualizer = ({ model, modelType, onLayerSelect }) => {
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const animationRef = useRef(null);
    const layerMeshesRef = useRef([]);
    const mouseRef = useRef(new THREE.Vector2());
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLayer, setSelectedLayer] = useState(null);
    const [showLayerInfo, setShowLayerInfo] = useState(false);
    const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);
    const [showArchitectureExplainer, setShowArchitectureExplainer] = useState(false);
    
    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current) return;
        
        // Clear previous visualization
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }
        
        // Cancel any ongoing animations
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        
        // Setup the new visualization
        try {
            setIsLoading(true);
            setError(null);
            
            // Get container dimensions
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight || 600;
            
            // Create scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf0f0f0);
            sceneRef.current = scene;
            
            // Create camera
            const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            camera.position.set(0, 20, 50);
            camera.lookAt(0, 0, 0);
            cameraRef.current = camera;
            
            // Create renderer
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            containerRef.current.appendChild(renderer.domElement);
            rendererRef.current = renderer;
            
            // Add lights
            const ambientLight = new THREE.AmbientLight(0x404040, 1);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1).normalize();
            scene.add(directionalLight);
            
            // Add grid for reference
            const gridHelper = new THREE.GridHelper(100, 10);
            scene.add(gridHelper);
            
            // Create CNN visualization
            createCNNVisualization(modelType);
            
            // Setup mouse interaction
            setupMouseInteraction();
            
            // Start animation loop
            animate();
            
            setIsLoading(false);
        } catch (err) {
            console.error("Error initializing 3D visualization:", err);
            setError(`Failed to initialize 3D visualization: ${err.message}`);
            setIsLoading(false);
        }
        
        // Cleanup on unmount
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (rendererRef.current && rendererRef.current.dispose) {
                rendererRef.current.dispose();
            }
        };
    }, [modelType]);
    
    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
            
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight || 600;
            
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    
    // Create CNN visualization based on model type
    const createCNNVisualization = (modelType) => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;
        
        // Clear existing layer meshes
        layerMeshesRef.current.forEach(mesh => {
            scene.remove(mesh);
        });
        layerMeshesRef.current = [];
        
        // Get layers based on model type
        let layers = [];
        switch(modelType) {
            case 'mobilenetv2-vis': // Handle our detailed MobileNetV2 model
                layers = createMobileNetV2DetailedLayers();
                break;
            case 'mobilenetv2':
                layers = createMobileNetV2Layers();
                break;
            case 'mobilenetv1':
                layers = createMobileNetV1Layers();
                break;
            case 'embedded':
                layers = createSimpleCNNLayers();
                break;
            case 'custom':
                layers = createCustomLayers();
                break;
            default:
                layers = createSimpleCNNLayers();
        }
        
        // Create 3D visualization for each layer
        // Use a smaller spacing for the MobileNetV2 model since it has more layers
        const layerSpacing = modelType === 'mobilenetv2-vis' ? 6 : 10;
        let positionZ = -layerSpacing * (layers.length - 1) / 2;
        layers.forEach((layer, index) => {
            const mesh = createLayerMesh(layer);
            mesh.position.z = positionZ;
            positionZ += layerSpacing;
            // Store layer info for interactivity
            mesh.userData = {
                layerIndex: index,
                layerType: layer.type,
                layerName: layer.name,
                ...layer
            };
            scene.add(mesh);
            layerMeshesRef.current.push(mesh);
        });
        
        // Add connections between layers
        createLayerConnections(layers, layerSpacing);
        
        // Adjust camera to fit all layers
        adjustCameraToFit(layers.length, layerSpacing);
    };
    
    // Create detailed MobileNetV2 layers based on our model definition
    const createMobileNetV2DetailedLayers = () => {
        // Check if we have a model with mobilenetv2-vis structure
        if (model && model.model && model.model.layers && 
            model.modelType === 'mobilenetv2-vis') {
            try {
                return model.model.layers.map(layer => ({
                    type: layer.type || 'unknown',
                    name: layer.name || 'unnamed',
                    filters: layer.filters,
                    kernelSize: layer.kernel_size,
                    units: layer.units,
                    activation: layer.activation,
                    strides: layer.strides
                }));
            } catch (e) {
                console.warn("Error parsing mobilenetv2-vis model layers:", e);
            }
        }
        
        // Fallback to a more accurate but hardcoded MobileNetV2 representation
        return [
            { type: 'input', name: 'input', shape: [224, 224, 3] },
            { type: 'conv2d', name: 'Conv1', filters: 32, kernelSize: [3, 3], strides: [2, 2], activation: 'relu6' },
            { type: 'batchnorm', name: 'bn_Conv1' },
            { type: 'depthwiseConv2d', name: 'expanded_conv_depthwise', kernelSize: [3, 3], strides: [1, 1] },
            { type: 'batchnorm', name: 'expanded_conv_depthwise_BN' },
            { type: 'activation', name: 'expanded_conv_depthwise_relu', activation: 'relu6' },
            { type: 'conv2d', name: 'expanded_conv_project', filters: 16, kernelSize: [1, 1], strides: [1, 1] },
            { type: 'batchnorm', name: 'expanded_conv_project_BN' },
    
            // Block 2 
            { type: 'conv2d', name: 'block_1_expand', filters: 96, kernelSize: [1, 1], strides: [1, 1], activation: 'relu6' },
            { type: 'batchnorm', name: 'block_1_expand_BN' },
            { type: 'depthwiseConv2d', name: 'block_1_depthwise', kernelSize: [3, 3], strides: [2, 2] },
            { type: 'batchnorm', name: 'block_1_depthwise_BN' },
            { type: 'conv2d', name: 'block_1_project', filters: 24, kernelSize: [1, 1], strides: [1, 1] },
            { type: 'batchnorm', name: 'block_1_project_BN' },
    
            // Block 3
            { type: 'conv2d', name: 'block_2_expand', filters: 144, kernelSize: [1, 1], strides: [1, 1], activation: 'relu6' },
            { type: 'batchnorm', name: 'block_2_expand_BN' },
            { type: 'depthwiseConv2d', name: 'block_2_depthwise', kernelSize: [3, 3], strides: [1, 1] },
            { type: 'batchnorm', name: 'block_2_depthwise_BN' },
            { type: 'conv2d', name: 'block_2_project', filters: 24, kernelSize: [1, 1], strides: [1, 1] },
            { type: 'batchnorm', name: 'block_2_project_BN' },
            { type: 'add', name: 'block_2_add' },
    
            // Block 4
            { type: 'conv2d', name: 'block_3_expand', filters: 144, kernelSize: [1, 1], strides: [1, 1], activation: 'relu6' },
            { type: 'batchnorm', name: 'block_3_expand_BN' },
            { type: 'depthwiseConv2d', name: 'block_3_depthwise', kernelSize: [3, 3], strides: [2, 2] },
            { type: 'batchnorm', name: 'block_3_depthwise_BN' },
            { type: 'conv2d', name: 'block_3_project', filters: 32, kernelSize: [1, 1], strides: [1, 1] },
            { type: 'batchnorm', name: 'block_3_project_BN' },
    
            // Block 5
            { type: 'conv2d', name: 'block_4_expand', filters: 192, kernelSize: [1, 1], strides: [1, 1], activation: 'relu6' },
            { type: 'batchnorm', name: 'block_4_expand_BN' },
            { type: 'depthwiseConv2d', name: 'block_4_depthwise', kernelSize: [3, 3], strides: [1, 1] },
            { type: 'batchnorm', name: 'block_4_depthwise_BN' },
            { type: 'conv2d', name: 'block_4_project', filters: 32, kernelSize: [1, 1], strides: [1, 1] },
            { type: 'batchnorm', name: 'block_4_project_BN' },
            { type: 'add', name: 'block_4_add' },
    
            // Final layers
            { type: 'conv2d', name: 'Conv_1', filters: 1280, kernelSize: [1, 1], strides: [1, 1], activation: 'relu6' },
            { type: 'pooling2d', name: 'global_pool', poolSize: [7, 7], poolType: 'avg' },
            { type: 'conv2d', name: 'Conv_2', filters: 1000, kernelSize: [1, 1], strides: [1, 1] },
            { type: 'flatten', name: 'flatten' },
            { type: 'dense', name: 'Logits', units: 1000, activation: 'softmax' }
        ];
    };
    
    // Create a 3D mesh for a CNN layer
    // const createLayerMesh = (layer) => {
    //     let geometry, material, mesh;
        
    //     // Create different geometries based on layer type
    //     switch(layer.type) {
    //         case 'input':
    //             // Input layer as a box
    //             geometry = new THREE.BoxGeometry(10, 10, 1);
    //             material = new THREE.MeshPhongMaterial({ 
    //                 color: 0x6495ED, // Blue
    //                 transparent: true,
    //                 opacity: 0.8,
    //                 side: THREE.DoubleSide
    //             });
    //             break;
    //         case 'conv2d':
    //             // Conv layer as a box with size based on filters
    //             const size = Math.min(Math.max(layer.filters / 10, 5), 15);
    //             geometry = new THREE.BoxGeometry(size, size, 1);
    //             material = new THREE.MeshPhongMaterial({ 
    //                 color: 0xFF6347, // Red
    //                 transparent: true,
    //                 opacity: 0.8
    //             });
    //             break;
    //         case 'depthwiseConv2d':
    //             // Depthwise conv as a cylinder 
    //             geometry = new THREE.CylinderGeometry(3, 3, 1, 16);
    //             material = new THREE.MeshPhongMaterial({ 
    //                 color: 0xFF9500, // Orange
    //                 transparent: true,
    //                 opacity: 0.8
    //             });
    //             break;
    //         case 'batchnorm':
    //             // BatchNorm as a small sphere
    //             geometry = new THREE.SphereGeometry(2, 16, 16);
    //             material = new THREE.MeshPhongMaterial({ 
    //                 color: 0x9933FF, // Purple
    //                 transparent: true,
    //                 opacity: 0.7
    //             });
    //             break;
    //         case 'activation':
    //             // Activation as a torus
    //             geometry = new THREE.TorusGeometry(3, 1, 8, 16);
    //             material = new THREE.MeshPhongMaterial({ 
    //                 color: 0x00AAFF, // Light blue
    //                 transparent: true,
    //                 opacity: 0.8
    //             });
    //             break;
    //         case 'add':
    //             // Add layer as a pyramid
    //             geometry = new THREE.ConeGeometry(4, 4, 4);
    //             material = new THREE.MeshPhongMaterial({ 
    //                 color: 0xFF3333, // Red
    //                 transparent: true,
    //                 opacity: 0.8
    //             });
    //             break;
    //         case 'maxpooling2d':
    //         case 'pooling2d':
    //             // Pooling layer as an octahedron
    //             geometry = new THREE.OctahedronGeometry(5, 0);
    //             material = new THREE.MeshPhongMaterial({ 
    //                 color: 0x9370DB, // Purple
    //                 transparent: true,
    //                 opacity: 0.8
    //             });
    //             break;
    //         case 'flatten':
    //             // Flatten layer as a plane
    //             geometry = new THREE.PlaneGeometry(10, 5);
    //             material = new THREE.MeshPhongMaterial({ 
    //                 color: 0x90EE90, // Light green
    //                 transparent: true,
    //                 opacity: 0.8,
    //                 side: THREE.DoubleSide
    //             });
    //             break;
    //         case 'dense':
    //             // Dense layer as a sphere with size based on units
    //             const radius = Math.min(Math.max(layer.units / 100, 3), 10);
    //             geometry = new THREE.SphereGeometry(radius, 32, 32);
    //             material = new THREE.MeshPhongMaterial({ 
    //                 color: 0xFFA500, // Orange
    //                 transparent: true,
    //                 opacity: 0.8
    //             });
    //             break;
    //         default:
    //             // Default to a small box
    //             geometry = new THREE.BoxGeometry(5, 5, 1);
    //             material = new THREE.MeshPhongMaterial({ 
    //                 color: 0x808080, // Gray
    //                 transparent: true,
    //                 opacity: 0.8
    //             });
    //     }
        
    //     mesh = new THREE.Mesh(geometry, material);
        
    //     // Add text label
    //     addLayerLabel(mesh, layer);
        
    //     return mesh;
    // };

    const createLayerMesh = (layer) => {
        let geometry, material, mesh;
        
        // Define a base size, adjust per layer type
        let width = 5, height = 5, depth = 2;
    
        // Adjust dimensions based on layer properties
        if (layer.filters) {
            width = Math.min(Math.max(layer.filters / 10, 3), 15);
            height = width;
        } else if (layer.units) {
            width = Math.min(Math.max(layer.units / 100, 3), 12);
            height = width;
        }
    
        // Create cuboid geometry for all layers
        geometry = new THREE.BoxGeometry(width, height, depth);
    
        // Assign colors based on layer type
        const colorMap = {
            input: 0x6495ED, // Blue
            conv2d: 0xFF6347, // Red
            depthwiseConv2d: 0xFF9500, // Orange
            batchnorm: 0x9933FF, // Purple
            activation: 0x00AAFF, // Light blue
            add: 0xFF3333, // Dark red
            maxpooling2d: 0x9370DB, // Light purple
            pooling2d: 0x9370DB, // Light purple
            flatten: 0x90EE90, // Light green
            dense: 0xFFA500, // Orange
            default: 0x808080 // Gray
        };
    
        material = new THREE.MeshPhongMaterial({ 
            color: colorMap[layer.type] || colorMap.default,
            transparent: true,
            opacity: 0.8
        });
    
        mesh = new THREE.Mesh(geometry, material);
    
        // Add text label
        addLayerLabel(mesh, layer);
    
        return mesh;
    };
    
    
    // Add text label to layer
    const addLayerLabel = (mesh, layer) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = '24px Arial';
        context.fillStyle = '#000000';
        context.textAlign = 'center';
        context.fillText(layer.name, canvas.width/2, 40);
        
        context.font = '18px Arial';
        context.fillText(layer.type, canvas.width/2, 70);
        
        // Display additional info if available
        if (layer.filters) {
            context.fillText(`Filters: ${layer.filters}`, canvas.width/2, 100);
        } else if (layer.units) {
            context.fillText(`Units: ${layer.units}`, canvas.width/2, 100);
        } else if (layer.type === 'depthwiseConv2d' && layer.strides) {
            context.fillText(`Strides: ${layer.strides[0]}x${layer.strides[1]}`, canvas.width/2, 100);
        } else if (layer.type === 'add') {
            context.fillText(`Residual Connection`, canvas.width/2, 100);
        } else if (layer.activation) {
            context.fillText(`Activation: ${layer.activation}`, canvas.width/2, 100);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
        });
        const labelGeometry = new THREE.PlaneGeometry(10, 5);
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.y = -10;
        labelMesh.rotation.x = -Math.PI / 2;
        mesh.add(labelMesh);
    };
    
    // Create connections between layers
    const createLayerConnections = (layers, spacing) => {
        if (!sceneRef.current) return;
        
        for (let i = 0; i < layerMeshesRef.current.length - 1; i++) {
            const startMesh = layerMeshesRef.current[i];
            const endMesh = layerMeshesRef.current[i + 1];
            
            // Create a line between layers
            const material = new THREE.LineBasicMaterial({
                color: 0x0088ff,
                transparent: true,
                opacity: 0.6
            });
            
            const points = [];
            points.push(new THREE.Vector3(0, 0, startMesh.position.z));
            points.push(new THREE.Vector3(0, 0, endMesh.position.z));
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            sceneRef.current.add(line);
        }
        
        // Add connections for 'add' layers, which indicate residual connections
        layerMeshesRef.current.forEach((mesh, index) => {
            if (mesh.userData.layerType === 'add') {
                const residualStartIndex = Math.max(0, index - 6); // Approximate position of layer to connect from
                const startMesh = layerMeshesRef.current[residualStartIndex];
                
                const material = new THREE.LineBasicMaterial({
                    color: 0xff3333, // Red for residual connections
                    transparent: true,
                    opacity: 0.6
                });
                
                const points = [];
                points.push(new THREE.Vector3(0, 0, startMesh.position.z));
                points.push(new THREE.Vector3(0, 0, mesh.position.z));
                
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, material);
                sceneRef.current.add(line);
            }
        });
    };
    
    // Setup mouse interaction
    const setupMouseInteraction = () => {
        const container = containerRef.current;
        if (!container) return;
        
        // Setup raycaster for mouse intersection
        const raycaster = new THREE.Raycaster();
        
        // Mouse move for hover effect
        container.addEventListener('mousemove', (event) => {
            const rect = container.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
            
            if (!cameraRef.current || !sceneRef.current) return;
            
            raycaster.setFromCamera(mouseRef.current, cameraRef.current);
            const intersects = raycaster.intersectObjects(layerMeshesRef.current, true);
            
            // Reset all materials
            layerMeshesRef.current.forEach(mesh => {
                if (mesh.material && mesh !== selectedLayer) {
                    mesh.material.emissive = new THREE.Color(0x000000);
                }
            });
            
            // Highlight hovered mesh
            if (intersects.length > 0) {
                let object = intersects[0].object;
                // Find the parent mesh if we hit a label
                while (object && !layerMeshesRef.current.includes(object)) {
                    object = object.parent;
                }
                
                if (object && object.material) {
                    object.material.emissive = new THREE.Color(0x333333);
                    document.body.style.cursor = 'pointer';
                }
            } else {
                document.body.style.cursor = 'default';
            }
        });
        
        // Click to select a layer
        container.addEventListener('click', (event) => {
            const rect = container.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
            
            if (!cameraRef.current || !sceneRef.current) return;
            
            raycaster.setFromCamera(mouseRef.current, cameraRef.current);
            const intersects = raycaster.intersectObjects(layerMeshesRef.current, true);
            
            if (intersects.length > 0) {
                let object = intersects[0].object;
                // Find the parent mesh if we hit a label
                while (object && !layerMeshesRef.current.includes(object)) {
                    object = object.parent;
                }
                
                if (object) {
                    // Deselect previous
                    if (selectedLayer && selectedLayer.material) {
                        selectedLayer.material.emissive = new THREE.Color(0x000000);
                    }
                    
                    // Select new
                    setSelectedLayer(object);
                    setShowLayerInfo(true);
                    if (object.material) {
                        object.material.emissive = new THREE.Color(0x555555);
                    }
                    
                    // Notify parent component
                    if (onLayerSelect && object.userData) {
                        onLayerSelect({
                            index: object.userData.layerIndex,
                            name: object.userData.layerName,
                            type: object.userData.layerType,
                            config: {
                                filters: object.userData.filters,
                                kernelSize: object.userData.kernelSize,
                                units: object.userData.units,
                                activation: object.userData.activation
                            }
                        });
                    }
                }
            }
        });
        
        // Mouse controls for rotation and zoom
        let isDragging = false;
        let previousMouseX = 0;
        let previousMouseY = 0;
        
        container.addEventListener('mousedown', (event) => {
            isDragging = true;
            previousMouseX = event.clientX;
            previousMouseY = event.clientY;
        });
        
        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        window.addEventListener('mousemove', (event) => {
            if (!isDragging || !sceneRef.current) return;
            
            const deltaX = event.clientX - previousMouseX;
            const deltaY = event.clientY - previousMouseY;
            
            sceneRef.current.rotation.y += deltaX * 0.01;
            sceneRef.current.rotation.x += deltaY * 0.01;
            
            previousMouseX = event.clientX;
            previousMouseY = event.clientY;
        });
        
        // Mouse wheel for zoom
        container.addEventListener('wheel', (event) => {
            if (!cameraRef.current) return;
            event.preventDefault();
            
            cameraRef.current.position.z += event.deltaY * 0.1;
            cameraRef.current.position.z = Math.max(10, Math.min(200, cameraRef.current.position.z));
        });
    };
    
    // Animation loop
    const animate = () => {
        animationRef.current = requestAnimationFrame(animate);
        
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
    };
    
    // Create sample layers for different model types
    const createSimpleCNNLayers = () => {
        return [
            { type: 'input', name: 'input', shape: [224, 224, 3] },
            { type: 'conv2d', name: 'conv1', filters: 32, kernelSize: [3, 3], activation: 'relu' },
            { type: 'pooling2d', name: 'pool1', poolSize: [2, 2] },
            { type: 'conv2d', name: 'conv2', filters: 64, kernelSize: [3, 3], activation: 'relu' },
            { type: 'pooling2d', name: 'pool2', poolSize: [2, 2] },
            { type: 'conv2d', name: 'conv3', filters: 128, kernelSize: [3, 3], activation: 'relu' },
            { type: 'pooling2d', name: 'pool3', poolSize: [2, 2] },
            { type: 'flatten', name: 'flatten' },
            { type: 'dense', name: 'dense1', units: 128, activation: 'relu' },
            { type: 'dense', name: 'output', units: 10, activation: 'softmax' }
        ];
    };
    
    const createMobileNetV1Layers = () => {
        return [
            { type: 'input', name: 'input', shape: [224, 224, 3] },
            { type: 'conv2d', name: 'conv1', filters: 32, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'conv_dw_1', filters: 32, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'conv_pw_1', filters: 64, kernelSize: [1, 1], activation: 'relu' },
            { type: 'conv2d', name: 'conv_dw_2', filters: 64, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'conv_pw_2', filters: 128, kernelSize: [1, 1], activation: 'relu' },
            { type: 'conv2d', name: 'conv_dw_3', filters: 128, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'conv_pw_3', filters: 128, kernelSize: [1, 1], activation: 'relu' },
            { type: 'conv2d', name: 'conv_dw_4', filters: 128, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'conv_pw_4', filters: 256, kernelSize: [1, 1], activation: 'relu' },
            { type: 'pooling2d', name: 'global_pool', poolSize: [7, 7] },
            { type: 'dense', name: 'output', units: 1000, activation: 'softmax' }
        ];
    };
    
    const createMobileNetV2Layers = () => {
        return [
            { type: 'input', name: 'input', shape: [224, 224, 3] },
            { type: 'conv2d', name: 'conv1', filters: 32, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'inverted_res1', filters: 16, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'inverted_res2', filters: 24, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'inverted_res3', filters: 32, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'inverted_res4', filters: 64, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'inverted_res5', filters: 96, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'inverted_res6', filters: 160, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'inverted_res7', filters: 320, kernelSize: [3, 3], activation: 'relu' },
            { type: 'conv2d', name: 'conv_last', filters: 1280, kernelSize: [1, 1], activation: 'relu' },
            { type: 'pooling2d', name: 'global_pool', poolSize: [7, 7] },
            { type: 'dense', name: 'output', units: 1000, activation: 'softmax' }
        ];
    };
    
    const createCustomLayers = () => {
        // If real model data is available, parse it from model prop
        if (model && model.model && model.model.layers) {
            try {
                return model.model.layers.map(layer => ({
                    type: layer.type || 'unknown',
                    name: layer.name || 'unnamed',
                    filters: layer.filters,
                    kernelSize: layer.kernel_size,
                    units: layer.units,
                    activation: layer.activation
                }));
            } catch (e) {
                console.warn("Error parsing custom model layers:", e);
            }
        }
        
        // Fallback to simple CNN
        return createSimpleCNNLayers();
    };
    
    // Adjust camera to fit all layers
    const adjustCameraToFit = (layerCount, spacing) => {
        if (!cameraRef.current) return;
        
        // Calculate desired camera position based on layer count
        const depth = layerCount * spacing;
        const camera = cameraRef.current;
        
        // Position camera to see all layers - increased distance for MobileNetV2
        camera.position.z = depth / 2 + 50; // Move further back
        camera.position.y = depth / 4 + 10;  // Higher vantage point
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix(); // Required after changing FOV
    };
    
    // Visualize data flow through the network
    const visualizeDataFlow = () => {
        if (!sceneRef.current || !layerMeshesRef.current.length) return;
        
        // Create animation of data flowing through the network
        const animatePulse = () => {
            const pulse = new THREE.Mesh(
                new THREE.SphereGeometry(2, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0x00ff00 })
            );
            sceneRef.current.add(pulse);
            
            // Start at the first layer
            pulse.position.copy(layerMeshesRef.current[0].position);
            
            // Animate through all layers
            for (let i = 1; i < layerMeshesRef.current.length; i++) {
                const targetPos = layerMeshesRef.current[i].position.clone();
                
                setTimeout(() => {
                    // Simple animation to move from one layer to the next
                    const startPos = pulse.position.clone();
                    const animate = (time) => {
                        const t = Math.min(time / 500, 1);
                        pulse.position.lerpVectors(startPos, targetPos, t);
                        
                        if (t < 1) {
                            requestAnimationFrame(animate);
                        }
                    };
                    
                    requestAnimationFrame(animate);
                    
                    // Highlight the current layer
                    layerMeshesRef.current[i].material.emissive = new THREE.Color(0x00ff00);
                    setTimeout(() => {
                        layerMeshesRef.current[i].material.emissive = new THREE.Color(0x000000);
                    }, 500);
                }, i * 500);
            }
            
            // Remove the pulse after animation completes
            setTimeout(() => {
                sceneRef.current.remove(pulse);
                pulse.geometry.dispose();
                pulse.material.dispose();
            }, layerMeshesRef.current.length * 500 + 1000);
        };
        
        animatePulse();
    };
    
    // Reset view to default position
    const resetView = () => {
        if (!sceneRef.current || !cameraRef.current) return;
        
        // Reset scene rotation
        sceneRef.current.rotation.x = 0;
        sceneRef.current.rotation.y = 0;
        sceneRef.current.rotation.z = 0;
        
        // Reset camera position
        const layerCount = layerMeshesRef.current.length;
        const spacing = 10;
        adjustCameraToFit(layerCount, spacing);
    };
    
    // Handle layer info panel close
    const handleLayerInfoClose = () => {
        setShowLayerInfo(false);
    };
    
    // Handle performance metrics panel
    const togglePerformanceMetrics = () => {
        setShowPerformanceMetrics(prev => !prev);
    };
    
    // Handle architecture explainer
    const toggleArchitectureExplainer = () => {
        setShowArchitectureExplainer(prev => !prev);
    };
    
    return (
        <div className="threejs-cnn-visualizer">
            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Initializing 3D visualization...</p>
                </div>
            )}
            
            {error && (
                <div className="error-overlay">
                    <h3>Visualization Error</h3>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Retry</button>
                </div>
            )}
            
            <div 
                ref={containerRef} 
                className="visualization-container"
                style={{ 
                    width: '100%', 
                    height: '600px',
                    position: 'relative',
                    background: 'linear-gradient(to bottom, #f7f7f7 0%, #e9f2ff 100%)'
                }}
            >
                {selectedLayer && showLayerInfo && (
                    <LayerInfoPanel
                        layerInfo={{
                            name: selectedLayer.userData.layerName,
                            type: selectedLayer.userData.layerType,
                            config: {
                                filters: selectedLayer.userData.filters,
                                kernelSize: selectedLayer.userData.kernelSize,
                                units: selectedLayer.userData.units,
                                activation: selectedLayer.userData.activation
                            }
                        }}
                        onClose={handleLayerInfoClose}
                    />
                )}
                
                {showPerformanceMetrics && (
                    <ModelPerformanceMetrics 
                        modelType={modelType}
                        onClose={togglePerformanceMetrics}
                    />
                )}
                
                {showArchitectureExplainer && (
                    <MobileNetV2Explainer
                        onClose={toggleArchitectureExplainer}
                    />
                )}
            </div>
            
            <div className="visualization-controls">
                <button onClick={visualizeDataFlow} className="control-button">
                    Visualize Data Flow
                </button>
                <button onClick={resetView} className="control-button">
                    Reset View
                </button>
                <button onClick={togglePerformanceMetrics} className="control-button">
                    Performance Metrics
                </button>
                <button onClick={toggleArchitectureExplainer} className="control-button learn-button">
                    Learn About MobileNetV2
                </button>
            </div>
        </div>
    );
};

export default ThreeJSCNNVisualizer;
