/**
 * Scene3DManager
 * Manages BabylonJS scene, camera, lighting, and render loop
 */

class Scene3DManager {
    constructor() {
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.canvas = null;
    }

    /**
     * Initialize the 3D scene
     * @param {string} canvasId - ID of the canvas element
     * @returns {boolean} Success status
     */
    initialize(canvasId) {
        try {
            // Get canvas element
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) {
                console.error(`Canvas element with id '${canvasId}' not found`);
                return false;
            }

            // Create BabylonJS engine
            this.engine = new BABYLON.Engine(this.canvas, true, {
                preserveDrawingBuffer: true,
                stencil: true
            });

            // Create scene
            this.scene = new BABYLON.Scene(this.engine);
            this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1.0); // Dark blue-gray background

            // Setup camera
            this._setupCamera();

            // Setup lighting
            this._setupLighting();

            // Handle window resize
            window.addEventListener('resize', () => {
                this.engine.resize();
            });

            console.log('Scene3DManager initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Scene3DManager:', error);
            return false;
        }
    }

    /**
     * Setup camera
     * @private
     */
    _setupCamera() {
        // Create an ArcRotateCamera (orbiting camera)
        this.camera = new BABYLON.ArcRotateCamera(
            'camera',
            Math.PI / 2,  // alpha (horizontal rotation)
            Math.PI / 3,  // beta (vertical rotation)
            30,           // radius (distance from target)
            new BABYLON.Vector3(0, 0, 0), // target position
            this.scene
        );

        // Camera limits
        this.camera.lowerRadiusLimit = 5;
        this.camera.upperRadiusLimit = 150;
        this.camera.lowerBetaLimit = 0.1;
        this.camera.upperBetaLimit = Math.PI / 2 + 0.5;

        // Attach camera controls to canvas
        this.camera.attachControl(this.canvas, true);

        // Smooth camera movements
        this.camera.inertia = 0.9;
        this.camera.wheelPrecision = 50;
        this.camera.pinchPrecision = 50;
        this.camera.panningSensibility = 100;
    }

    /**
     * Setup lighting
     * @private
     */
    _setupLighting() {
        // Hemispheric light for ambient lighting
        const hemisphericLight = new BABYLON.HemisphericLight(
            'hemisphericLight',
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        hemisphericLight.intensity = 0.6;
        hemisphericLight.diffuse = new BABYLON.Color3(1, 1, 1);
        hemisphericLight.groundColor = new BABYLON.Color3(0.3, 0.3, 0.4);

        // Directional light for depth and shadows
        const directionalLight = new BABYLON.DirectionalLight(
            'directionalLight',
            new BABYLON.Vector3(-1, -2, -1),
            this.scene
        );
        directionalLight.intensity = 0.7;
        directionalLight.diffuse = new BABYLON.Color3(1, 1, 1);
    }

    /**
     * Set camera position from visualization hints
     * @param {Array<number>} position - [x, y, z] coordinates
     */
    setCameraPosition(position) {
        if (position && position.length === 3) {
            const targetPos = this.camera.target;
            const cameraPos = new BABYLON.Vector3(position[0], position[1], position[2]);
            
            // Calculate spherical coordinates from cartesian
            const direction = cameraPos.subtract(targetPos);
            const radius = direction.length();
            
            this.camera.radius = radius;
            this.camera.alpha = Math.atan2(direction.x, direction.z);
            this.camera.beta = Math.acos(direction.y / radius);
        }
    }

    /**
     * Set camera target
     * @param {BABYLON.Vector3} target - Target position
     */
    setCameraTarget(target) {
        if (this.camera) {
            this.camera.setTarget(target);
        }
    }

    /**
     * Focus camera on a specific mesh
     * @param {BABYLON.Mesh} mesh - Mesh to focus on
     * @param {number} distance - Distance from mesh (optional)
     */
    focusOnMesh(mesh, distance = 10) {
        if (!mesh || !this.camera) return;

        const boundingInfo = mesh.getBoundingInfo();
        const center = boundingInfo.boundingBox.centerWorld;
        
        this.camera.setTarget(center);
        this.camera.radius = distance;
    }

    /**
     * Add mesh to scene
     * @param {BABYLON.Mesh} mesh - Mesh to add
     */
    addToScene(mesh) {
        // Mesh is automatically added to scene when created
        // This method is here for API completeness
        return mesh;
    }

    /**
     * Get the scene instance
     * @returns {BABYLON.Scene}
     */
    getScene() {
        return this.scene;
    }

    /**
     * Get the camera instance
     * @returns {BABYLON.Camera}
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Get the engine instance
     * @returns {BABYLON.Engine}
     */
    getEngine() {
        return this.engine;
    }

    /**
     * Start the render loop
     */
    startRenderLoop() {
        if (!this.engine || !this.scene) {
            console.error('Scene not initialized');
            return;
        }

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    /**
     * Stop the render loop
     */
    stopRenderLoop() {
        if (this.engine) {
            this.engine.stopRenderLoop();
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.stopRenderLoop();
        
        if (this.scene) {
            this.scene.dispose();
            this.scene = null;
        }
        
        if (this.engine) {
            this.engine.dispose();
            this.engine = null;
        }

        this.camera = null;
        this.canvas = null;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Scene3DManager;
}
