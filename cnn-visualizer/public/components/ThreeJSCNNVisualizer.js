import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import * as THREE from 'three';
import * as tf from '@tensorflow/tfjs';
import LayerInfoPanel from './LayerInfoPanel';
import ModelPerformanceMetrics from './ModelPerformanceMetrics';
import MobileNetV2Explainer from './MobileNetV2Explainer';
import ModelInferenceHelper from '../utils/ModelInferenceHelper';
import AnimationStateManager from '../utils/AnimationStateManager';

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
    
    const [inferenceHelper, setInferenceHelper] = useState(null);
    const animationManagerRef = useRef(new AnimationStateManager());
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [animationControls, setAnimationControls] = useState({
        isPlaying: false,
        currentLayer: 0,
        speed: 1.0
    });
    const [imageData, setImageData] = useState(null);
    
    // Flow particles for animation
    const particleSystemRef = useRef(null);
    const particleGeometryRef = useRef(null);
    const particleMaterialRef = useRef(null);
    
    // Add initialization check/debug state
    const [initAttempts, setInitAttempts] = useState(0);
    const initTimeoutRef = useRef(null);
    
    const [modelData, setModelData] = useState(null);
    
    // Add state to track DOM ready status
    const [containerMounted, setContainerMounted] = useState(false);
    
    console.log(`ThreeJSCNNVisualizer rendering - Model loaded: ${!!model}, Type: ${modelType}`);
    console.log('Model type:', modelType);
    
    // Process model directly in main component instead of in effect
    useEffect(() => {
        if (!model) {
            console.warn("No model provided, will use fallback");
            return;
        }
        
        // Debug the model structure more thoroughly
        console.log("DEBUG - Full model object type:", Object.prototype.toString.call(model));
        console.log("DEBUG - Model keys:", Object.keys(model));
        
        // Use our extractLayers function to find the layers
        const extractedLayers = extractLayers(model);
        
        if (extractedLayers && Array.isArray(extractedLayers) && extractedLayers.length > 0) {
            console.log(`SUCCESS: Extracted ${extractedLayers.length} layers from model`);
            // Store the extracted layers for use in visualization
            setModelData({
                model: {
                    layers: extractedLayers
                }
            });
        } else {
            console.warn("Failed to extract layers from model, will use fallback");
            
            if (modelType === 'mobilenetv2-vis') {
                // For MobileNetV2, use our detailed layers directly
                console.log("Using hardcoded MobileNetV2 layers since extraction failed");
                setModelData({
                    model: {
                        layers: createMobileNetV2DetailedLayers()
                    }
                });
            } else {
                // For other models, use simple CNN layers
                setModelData({
                    model: {
                        layers: createSimpleCNNLayers() 
                    }
                });
            }
        }
    }, [model, modelType]);
    
    // Use callback ref instead of useRef for guaranteed notification when DOM is available
    const setContainerRef = useCallback(node => {
        containerRef.current = node;
        
        if (node) {
            console.log("Container ref is now available:", 
                node.clientWidth, node.clientHeight);
            
            // Force dimensions immediately to ensure the container is ready
            node.style.width = "100%";
            node.style.minHeight = "600px"; 
            node.style.display = "block";
            
            // Wait a short moment for styles to apply before checking dimensions
            setTimeout(() => {
                if (node.clientWidth && node.clientHeight) {
                    console.log("Container dimensions confirmed:", 
                        node.clientWidth, "x", node.clientHeight);
                    setContainerMounted(true);
                } else {
                    console.warn("Container still has no dimensions, forcing manual dimensions");
                    node.style.width = "800px";  // Set explicit fallback width
                    node.style.height = "600px"; // Set explicit fallback height
                    
                    // Try one more time
                    setTimeout(() => {
                        console.log("Second attempt - Container dimensions:", 
                            node.clientWidth, "x", node.clientHeight);
                        setContainerMounted(true); // Force mounting even if dimensions are still off
                    }, 50);
                }
            }, 50);
        } else {
            setContainerMounted(false);
        }
    }, []);

    // Add this after the containerRef setup but before the useEffect
    const addDebugInfo = () => {
        if (!containerRef.current) return;
        
        // Check if debug overlay already exists
        if (containerRef.current.querySelector('.container-debug')) return;
        
        const debugDiv = document.createElement('div');
        debugDiv.className = 'container-debug';
        
        const updateDebugInfo = () => {
            if (!containerRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            const hasCanvas = containerRef.current.querySelector('canvas') !== null;
            
            debugDiv.innerHTML = `
                Container: ${width}x${height}<br>
                Renderer: ${rendererRef.current ? 'Active' : 'Not Created'}<br>
                Canvas: ${hasCanvas ? 'Present' : 'Missing'}<br>
                THREE.js: ${typeof THREE !== 'undefined' ? 'Loaded' : 'Missing'}<br>
                Scene: ${sceneRef.current ? 'Created' : 'Not Created'}<br>
            `;
        };
        
        containerRef.current.appendChild(debugDiv);
        const intervalId = setInterval(updateDebugInfo, 1000);
        updateDebugInfo();
        
        // Return interval ID for cleanup
        return intervalId;
    };

    // Replace the problematic useEffect with this corrected version
    useEffect(() => {
        // Only proceed if container is actually mounted and we have model data
        if (!containerMounted) {
            console.log("Waiting for container to be mounted...");
            // Add a fallback initialization after a reasonable timeout
            // to handle cases where the mounting detection might fail
            if (!initTimeoutRef.current) {
                initTimeoutRef.current = setTimeout(() => {
                    console.log("Using fallback initialization after timeout");
                    if (containerRef.current && containerRef.current.clientWidth) {
                        setContainerMounted(true);
                    }
                }, 1000);
            }
            return;
        }

        // Clear the fallback timeout if we've reached this point normally
        if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
        }
        
        if (!modelData) {
            console.log("Waiting for model data to be processed...");
            return;
        }
        
        // Add debug overlay when container is mounted
        const debugIntervalId = addDebugInfo();
        
        console.log("Container is mounted and model data is ready. Model type:", modelType);
        
        if (!containerRef.current) {
            console.error("Container ref is null despite mounted flag being true");
            setError("Container reference issue. Please refresh the page.");
            return;
        }

        console.log("Starting ThreeJS visualization initialization");
        console.log("Container dimensions:", 
                   containerRef.current.clientWidth, 
                   containerRef.current.clientHeight);

        // Clear any existing content
        try {
            while (containerRef.current.firstChild) {
                containerRef.current.removeChild(containerRef.current.firstChild);
            }
        } catch (err) {
            console.warn("Error clearing container:", err);
        }

        // Setup the new visualization
        try {
            setIsLoading(true);
            setError(null);
            
            // Check WebGL compatibility before proceeding
            let webglSupported = false;
            try {
                const canvas = document.createElement('canvas');
                webglSupported = !!(window.WebGLRenderingContext && 
                    (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
                console.log("WebGL support check:", webglSupported ? "Supported" : "Not supported");
            } catch (e) {
                console.error("WebGL support check failed:", e);
            }
            
            if (!webglSupported) {
                setError("WebGL is not supported in your browser. Please try using a modern browser with WebGL support.");
                setIsLoading(false);
                return;
            }
            
            // Force the container to have size before creating renderer
            const containerWidth = containerRef.current.clientWidth || window.innerWidth * 0.8 || 800;
            const containerHeight = containerRef.current.clientHeight || window.innerHeight * 0.6 || 600;
            containerRef.current.style.width = `${containerWidth}px`;
            containerRef.current.style.height = `${containerHeight}px`;
            
            console.log("Using dimensions:", containerWidth, containerHeight);
            
            // Create scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf0f0f0);
            sceneRef.current = scene;
            console.log("Scene created");
            
            // Create camera
            const camera = new THREE.PerspectiveCamera(75, containerWidth/containerHeight, 0.1, 1000);
            camera.position.set(0, 20, 50);
            camera.lookAt(0, 0, 0);
            cameraRef.current = camera;
            console.log("Camera created");
            
            // Create renderer with extensive error handling
            try {
                if (typeof containerRef.current.appendChild !== 'function') {
                    throw new Error("Container is not ready for DOM operations");
                }
                if (typeof THREE.WebGLRenderer !== 'function') {
                    throw new Error("THREE.js not properly loaded");
                }
                
                // Now add the renderer
                const renderer = new THREE.WebGLRenderer({ 
                    alpha: true,
                    preserveDrawingBuffer: true
                });
                renderer.setSize(containerWidth, containerHeight);
                renderer.setPixelRatio(window.devicePixelRatio || 1);
                
                // Test if we can append to container
                try {
                    const testElement = document.createElement('div');
                    containerRef.current.appendChild(testElement);
                    console.log("Container successfully tested for DOM operations");
                    containerRef.current.removeChild(testElement);
                } catch (domError) {
                    console.error("Container DOM operations failed:", domError);
                    throw new Error("Container is not ready for DOM operations");
                }
                
                containerRef.current.appendChild(renderer.domElement);
                rendererRef.current = renderer;
                console.log("Renderer created and attached");
                
                // Verify the canvas was actually added
                const canvasElement = containerRef.current.querySelector('canvas');
                if (!canvasElement) {
                    throw new Error("Canvas element not found after renderer attachment");
                }
                console.log("Canvas dimensions:", canvasElement.width, canvasElement.height);
            } catch (rendererError) {
                console.error("WebGL renderer creation failed:", rendererError);
                setError(`Failed to create WebGL context: ${rendererError.message}. Your browser might not support WebGL or have it disabled.`);
                setIsLoading(false);
                return;
            }
            
            // Add lights
            const ambientLight = new THREE.AmbientLight(0x404040, 1);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1).normalize();
            scene.add(directionalLight);
            console.log("Lights added");
            
            // Add grid for reference
            const gridHelper = new THREE.GridHelper(100, 10);
            scene.add(gridHelper);
            console.log("Grid helper added");
            
            // Create CNN visualization - with guaranteed layers
            console.log("Creating CNN visualization with model type:", modelType || 'default');
            createCNNVisualization(modelType || 'default');
            
            // Setup mouse interaction
            setupMouseInteraction();
            
            // Start animation loop
            console.log("Starting animation loop");
            animate();
            setIsLoading(false);
            console.log("Visualization initialization complete");
        } catch (err) {
            console.error("Error initializing 3D visualization:", err);
            setError(`Failed to initialize 3D visualization: ${err.message}`);
            setIsLoading(false);
        }
        
        return () => {
            // Clear any initialization timeout
            if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
            }
            
            // Clear debug interval if it exists
            if (debugIntervalId) {
                clearInterval(debugIntervalId);
            }
            
            // Make sure we cleanup properly
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            
            if (rendererRef.current && rendererRef.current.dispose) {
                try {
                    rendererRef.current.dispose();
                } catch (e) {
                    console.warn("Error disposing renderer:", e);
                }
            }
        };
    }, [modelType, modelData, containerMounted]); // Make sure modelData is in the dependencies

    // Initialize model inference helper
    useEffect(() => {
        if (model && model.tfModel) {
            const helper = new ModelInferenceHelper(model);
            setInferenceHelper(helper);
            
            // Set up animation manager callback
            animationManagerRef.current.setOnStepChangeCallback(handleAnimationStep);
        }
        
        return () => {
            animationManagerRef.current.pause();
        };
    }, [model]);
    
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
    
    // Create CNN visualization based on model type with improved error handling
    const createCNNVisualization = (modelType) => {
        if (!sceneRef.current) {
            console.error("Scene reference is null, cannot create visualization");
            setError("Failed to initialize 3D scene");
            return;
        }
        const scene = sceneRef.current;
        
        // Clear existing layer meshes
        layerMeshesRef.current.forEach(mesh => {
            try {
                scene.remove(mesh);
            } catch (e) {
                console.warn("Error removing mesh:", e);
            }
        });
        layerMeshesRef.current = [];
        
        // Get layers based on model type with fallback
        let layers = [];
        try {
            // If we have model data with layers, use that first
            if (modelData && modelData.model && Array.isArray(modelData.model.layers) && modelData.model.layers.length > 0) {
                console.log(`Using ${modelData.model.layers.length} layers from model data`);
                layers = modelData.model.layers;
            } else {
                // Otherwise fall back to our type-specific layer generators
                switch(modelType) {
                    case 'mobilenetv2-vis':
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
                        break;
                }
            }
            
            // Validate layers before proceeding
            if (!layers || layers.length === 0) {
                console.error("Failed to create layers array");
                layers = createSimpleCNNLayers(); // Use fallback
            }
            
            console.log(`Created ${layers.length} layers for visualization`);
            
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
        } catch (error) {
            console.error("Error in createCNNVisualization:", error);
            setError(`Failed to create visualization: ${error.message}`);
        }
    };
    
    // Create detailed MobileNetV2 layers based on our model definition
    const createMobileNetV2DetailedLayers = () => {
        // Always return hardcoded layers to guarantee visualization works
        console.log("Creating hardcoded MobileNetV2 layer structure for reliability");
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
        // Safe check for component unmount
        if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
            console.log("Animation stopped - missing references");
            return;
        }
        
        // Store animation frame ID so we can cancel it later
        animationRef.current = requestAnimationFrame(animate);
        
        try {
            if (rendererRef.current.render) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            } else {
                console.error("Renderer missing render method");
                cancelAnimationFrame(animationRef.current);
            }
        } catch (error) {
            console.error("Error in animation render loop:", error);
            // Stop animation if there's an error to prevent console spam
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
                setError(`Rendering error: ${error.message}`);
            }
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
    
    // Handle animation step changes
    const handleAnimationStep = (step) => {
        setAnimationControls(prev => ({
            ...prev,
            currentLayer: step
        }));
        updateLayerVisualization(step);
    };
    
    // Update layer visualization based on activations
    const updateLayerVisualization = (step) => {
        if (!animationManagerRef.current || !layerMeshesRef.current) return;
        
        // Reset all layers to default appearance
        layerMeshesRef.current.forEach(mesh => {
            if (mesh.material) {
                mesh.material.emissive = new THREE.Color(0x000000);
                mesh.material.emissiveIntensity = 0;
                // Reset any size/color changes
                mesh.scale.set(1, 1, 1);
            }
        });
        
        // Get current activation
        const activation = animationManagerRef.current.getCurrentActivation();
        if (!activation) return;
        
        // Find the corresponding layer mesh
        const layerMesh = layerMeshesRef.current.find(mesh => 
            mesh.userData && mesh.userData.layerName === activation.layerName);
        
        if (layerMesh) {
            // Highlight active layer
            layerMesh.material.emissive = new THREE.Color(0x00ff00);
            layerMesh.material.emissiveIntensity = 0.5;
            
            // Scale the layer based on activation intensity
            if (activation.data) {
                // Compute average activation for visualization
                const avgActivation = Array.from(activation.data)
                    .reduce((sum, val) => sum + Math.abs(val), 0) / activation.data.length;
                
                // Enhance the scale to make it visible (adjust scale factor as needed)
                const scaleFactor = 1 + Math.min(avgActivation * 5, 0.5);
                layerMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
            }
            
            // Create flow particles to the next layer if not last layer
            if (step < layerMeshesRef.current.length) {
                createFlowAnimation(step - 1, step);
            }
        }
    };
    
    // Create animation of data flowing between layers
    const createFlowAnimation = (fromLayerIdx, toLayerIdx) => {
        if (fromLayerIdx < 0 || !layerMeshesRef.current) return;
        
        // Remove previous particle system if exists
        if (particleSystemRef.current) {
            sceneRef.current.remove(particleSystemRef.current);
            if (particleGeometryRef.current) particleGeometryRef.current.dispose();
            if (particleMaterialRef.current) particleMaterialRef.current.dispose();
        }
        
        const fromLayer = layerMeshesRef.current[fromLayerIdx];
        const toLayer = layerMeshesRef.current[toLayerIdx];
        
        if (!fromLayer || !toLayer) return;
        
        // Create particles
        const particleCount = 50;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        // Start positions for all particles (at the source layer)
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = fromLayer.position.x + (Math.random() - 0.5);
            positions[i+1] = fromLayer.position.y + (Math.random() - 0.5);
            positions[i+2] = fromLayer.position.z + (Math.random() - 0.5);
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Create particle material
        const material = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 0.2,
            transparent: true,
            opacity: 0.8
        });
        
        // Create particle system
        const particleSystem = new THREE.Points(particles, material);
        sceneRef.current.add(particleSystem);
        
        // Store references for cleanup
        particleSystemRef.current = particleSystem;
        particleGeometryRef.current = particles;
        particleMaterialRef.current = material;
        
        // Animation of particles flowing to the next layer
        const startTime = Date.now();
        const animateFlow = () => {
            if (!particleSystemRef.current) return;
            
            const elapsed = Date.now() - startTime;
            // Animation duration in ms
            const duration = 1000 / animationManagerRef.current.animationSpeed;
            
            if (elapsed < duration) {
                // Update each particle position
                const positions = particleSystemRef.current.geometry.attributes.position.array;
                for (let i = 0; i < particleCount * 3; i += 3) {
                    const progress = elapsed / duration; // 0 to 1
                    
                    // Lerp from start to end position
                    positions[i] = fromLayer.position.x + (toLayer.position.x - fromLayer.position.x) * progress + (Math.random() - 0.5) * 0.2;
                    positions[i+1] = fromLayer.position.y + (toLayer.position.y - fromLayer.position.y) * progress + (Math.random() - 0.5) * 0.2;
                    positions[i+2] = fromLayer.position.z + (toLayer.position.z - fromLayer.position.z) * progress + (Math.random() - 0.5) * 0.2;
                }
                particleSystemRef.current.geometry.attributes.position.needsUpdate = true;
                requestAnimationFrame(animateFlow);
            } else {
                // Animation complete
                sceneRef.current.remove(particleSystemRef.current);
                particleSystemRef.current = null;
            }
        };
        
        animateFlow();
    };
    
    // Process an image through the model and get activations for animation
    const processImage = async (imageElement) => {
        if (!inferenceHelper || !imageElement) return;
        
        setIsProcessingImage(true);
        
        try {
            // Get activations for all layers
            const activations = await inferenceHelper.getLayerActivations(imageElement);
            
            // Set the activations in the animation manager
            animationManagerRef.current.setActivations(activations);
            
            // Store the image for display
            setImageData(imageElement);
            
            // Reset animation state
            animationManagerRef.current.reset();
            setAnimationControls({
                isPlaying: false,
                currentLayer: 0,
                speed: 1.0
            });
        } catch (error) {
            console.error("Error processing image:", error);
        } finally {
            setIsProcessingImage(false);
        }
    };
    
    // Handle animation controls
    const handlePlay = () => {
        animationManagerRef.current.start();
        setAnimationControls(prev => ({ ...prev, isPlaying: true }));
    };
    
    const handlePause = () => {
        animationManagerRef.current.pause();
        setAnimationControls(prev => ({ ...prev, isPlaying: false }));
    };
    
    const handleReset = () => {
        animationManagerRef.current.reset();
        setAnimationControls(prev => ({ ...prev, isPlaying: false, currentLayer: 0 }));
    };
    
    const handleNext = () => {
        animationManagerRef.current.nextStep();
    };
    
    const handlePrevious = () => {
        animationManagerRef.current.previousStep();
    };
    
    const handleSpeedChange = (event) => {
        const speed = parseFloat(event.target.value);
        animationManagerRef.current.setSpeed(speed);
        setAnimationControls(prev => ({ ...prev, speed }));
    };
    
    // Load sample image for processing
    const handleLoadSampleImage = () => {
        // Implement sample image loading
        const sampleImage = new Image();
        sampleImage.src = "/assets/images/samples/cat.jpg";
        sampleImage.onload = () => {
            processImage(sampleImage);
        };
    };
    
    const handleImageUpload = (event) => {
        if (event.target.files && event.target.files[0]) {
            setIsProcessingImage(true);
            
            const file = event.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    processImage(img);
                };
            };
            
            reader.readAsDataURL(file);
        }
    };
    
    // Find the extractLayers function and modify it:
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
        
        // NEW CASE - For MobileNetV2-vis: {model: {model: {layers: [...]}}}
        if (modelData.model && modelData.model.model && Array.isArray(modelData.model.model.layers)) {
            console.log("Case 4: Nested model structure - found layers in model.model.model.layers");
            return modelData.model.model.layers;
        }
        
        console.error("Could not find layers in model data");
        console.log("Model structure:", JSON.stringify(modelData).substring(0, 300));
        return null;
    };
    
    return (
        <div className="threejs-cnn-visualizer">
            {isLoading ? (
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p className="loading-tip">This may take a few moments...</p>
                    <p className="loading-progress">Container mounted: {containerMounted ? 'Yes' : 'No'}</p>
                    <p className="loading-debug">
                        WebGL: {typeof WebGLRenderingContext !== 'undefined' ? 'Supported' : 'Not detected'} | 
                        THREE.js: {typeof THREE !== 'undefined' ? 'Loaded' : 'Not loaded'} |
                        Model: {model ? `Ready (${modelData?.model?.layers?.length || 0} extracted layers)` : 'Not ready'}
                    </p>
                </div>
            ) : error ? (
                <div className="error">
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Try again</button>
                </div>
            ) : (
                <>
                    {/* Use the callback ref approach with enhanced styling */}
                    <div 
                        className="visualization-container" 
                        ref={setContainerRef}
                        style={{
                            width: "100%", 
                            minHeight: "600px", 
                            display: "block",
                            position: "relative" // Add this to ensure proper positioning
                        }}
                    ></div>
                    
                    <div className="animation-controls">
                        <h3>Activation Flow Animation</h3>
                        <div className="input-controls">
                            <input 
                                type="file" 
                                id="imageUpload" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                disabled={isProcessingImage}
                            />
                            <button 
                                className="sample-image-btn"
                                onClick={handleLoadSampleImage}
                                disabled={isProcessingImage}
                            >
                                Load Sample Image
                            </button>
                        </div>
                        
                        {isProcessingImage && <p>Processing image...</p>}
                        
                        {imageData && (
                            <div className="image-preview">
                                <h4>Input Image:</h4>
                                <img 
                                    src={imageData.src || imageData} 
                                    alt="Input" 
                                    style={{ maxWidth: '200px', maxHeight: '200px' }} 
                                />
                            </div>
                        )}
                        
                        <div className="playback-controls">
                            <button onClick={handlePrevious} disabled={animationControls.currentLayer <= 0}>
                                &lt; Previous
                            </button>
                            {animationControls.isPlaying ? (
                                <button onClick={handlePause}>Pause</button>
                            ) : (
                                <button onClick={handlePlay} disabled={animationManagerRef.current.activations.length === 0}>
                                    Play
                                </button>
                            )}
                            <button onClick={handleReset}>Reset</button>
                            <button onClick={handleNext} disabled={
                                animationControls.currentLayer >= animationManagerRef.current.activations.length
                            }>
                                Next &gt;
                            </button>
                            <select value={animationControls.speed} onChange={handleSpeedChange}>
                                <option value="0.5">0.5x Speed</option>
                                <option value="1.0">1.0x Speed</option>
                                <option value="1.5">1.5x Speed</option>
                                <option value="2.0">2.0x Speed</option>
                            </select>
                            <div className="progress-indicator">
                                Layer: {animationControls.currentLayer} / {animationManagerRef.current.activations.length}
                            </div>
                        </div>
                        
                        {/* Show activation details for current layer */}
                        {animationManagerRef.current.getCurrentActivation() && (
                            <div className="activation-info">
                                <h4>Layer: {animationManagerRef.current.getCurrentActivation().layerName}</h4>
                                <p>Type: {animationManagerRef.current.getCurrentActivation().type}</p>
                                <p>Shape: {JSON.stringify(animationManagerRef.current.getCurrentActivation().shape)}</p>
                                <p>Activation Summary: {
                                    animationManagerRef.current.getCurrentActivation().data ? 
                                    `Min: ${Math.min(...Array.from(animationManagerRef.current.getCurrentActivation().data)).toFixed(4)}, 
                                     Max: ${Math.max(...Array.from(animationManagerRef.current.getCurrentActivation().data)).toFixed(4)}, 
                                     Mean: ${(Array.from(animationManagerRef.current.getCurrentActivation().data)
                                         .reduce((a, b) => a + b, 0) / 
                                         animationManagerRef.current.getCurrentActivation().data.length).toFixed(4)}`
                                         : 'No data available'
                                }</p>
                            </div>
                        )}
                    </div>
                    
                    {showLayerInfo && selectedLayer && (
                        <LayerInfoPanel 
                            layer={selectedLayer.userData}
                            onClose={handleLayerInfoClose}
                        />
                    )}
                    
                    {showPerformanceMetrics && (
                        <ModelPerformanceMetrics model={model} />
                    )}
                    
                    {showArchitectureExplainer && modelType === 'mobilenetv2-vis' && (
                        <MobileNetV2Explainer />
                    )}
                </>
            )}
        </div>
    );
};

export default ThreeJSCNNVisualizer;
