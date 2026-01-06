/**
 * ConnectionRenderer
 * Renders connections between layers as 3D lines or tubes
 */

class ConnectionRenderer {
    constructor(scene) {
        this.scene = scene;
        this.connections = [];
        this.connectionMeshes = [];
    }

    /**
     * Render a single connection
     * @param {Object} sourcePoint - { position: Vector3 }
     * @param {Object} targetPoint - { position: Vector3 }
     * @param {Object} connectionData - Connection metadata
     * @param {Object} options - Rendering options
     * @returns {BABYLON.Mesh} Connection mesh
     */
    renderConnection(sourcePoint, targetPoint, connectionData, options = {}) {
        const connectionType = connectionData.connection_type || 'sequential';
        const visualizationData = connectionData.visualization || {};

        // Determine connection style
        let color, lineWidth, isDashed;

        switch (connectionType) {
            case 'skip':
                color = ColorUtils.parseColor(visualizationData.color || '#FFA500'); // Orange
                lineWidth = 3.0;
                isDashed = true;
                break;
            case 'branch':
                color = ColorUtils.parseColor(visualizationData.color || '#00CED1'); // Cyan
                lineWidth = 2.5;
                isDashed = false;
                break;
            case 'sequential':
            default:
                color = ColorUtils.parseColor(visualizationData.color || '#999999'); // Gray
                lineWidth = visualizationData.width || 2.0;
                isDashed = false;
                break;
        }

        // Create the connection line
        let connectionMesh;

        if (connectionType === 'skip') {
            // Use curved line for skip connections
            connectionMesh = this._createCurvedConnection(
                sourcePoint.position,
                targetPoint.position,
                color,
                lineWidth
            );
        } else {
            // Use straight line for sequential and branch connections
            connectionMesh = this._createStraightConnection(
                sourcePoint.position,
                targetPoint.position,
                color,
                lineWidth
            );
        }

        // Store metadata
        connectionMesh.metadata = {
            connectionId: connectionData.id,
            sourceLayer: connectionData.source_layer || connectionData.from_layer,
            targetLayer: connectionData.target_layer || connectionData.to_layer,
            connectionType: connectionType
        };

        this.connectionMeshes.push(connectionMesh);
        return connectionMesh;
    }

    /**
     * Create a straight line connection
     * @private
     */
    _createStraightConnection(start, end, color, width) {
        const points = [start, end];

        const line = BABYLON.MeshBuilder.CreateLines(
            'connection_' + Math.random().toString(36).substr(2, 9),
            {
                points: points,
                updatable: false
            },
            this.scene
        );

        line.color = new BABYLON.Color3(color.r, color.g, color.b);
        line.alpha = 0.7;

        return line;
    }

    /**
     * Create a curved line connection using Bezier curve
     * @private
     */
    _createCurvedConnection(start, end, color, width) {
        // Calculate control point for curve
        const midPoint = BABYLON.Vector3.Lerp(start, end, 0.5);
        const direction = end.subtract(start);
        const distance = direction.length();

        // Offset control point perpendicular to connection
        const offset = new BABYLON.Vector3(0, distance * 0.2, 0);
        const controlPoint = midPoint.add(offset);

        // Generate curve points
        const curvePoints = [];
        const segments = 20;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = this._quadraticBezier(start, controlPoint, end, t);
            curvePoints.push(point);
        }

        const curve = BABYLON.MeshBuilder.CreateLines(
            'curved_connection_' + Math.random().toString(36).substr(2, 9),
            {
                points: curvePoints,
                updatable: false
            },
            this.scene
        );

        curve.color = new BABYLON.Color3(color.r, color.g, color.b);
        curve.alpha = 0.8;

        return curve;
    }

    /**
     * Quadratic Bezier curve calculation
     * @private
     */
    _quadraticBezier(p0, p1, p2, t) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;

        return new BABYLON.Vector3(
            uu * p0.x + 2 * u * t * p1.x + tt * p2.x,
            uu * p0.y + 2 * u * t * p1.y + tt * p2.y,
            uu * p0.z + 2 * u * t * p1.z + tt * p2.z
        );
    }

    /**
     * Render all connections between layers
     * @param {Map} layerMeshMap - Map of layer IDs to their mesh data
     * @param {Array} connections - Array of connection objects
     */
    renderAllConnections(layerMeshMap, connections) {
        connections.forEach(conn => {
            const sourceId = conn.source_layer || conn.from_layer;
            const targetId = conn.target_layer || conn.to_layer;

            const sourceMeshData = layerMeshMap.get(sourceId);
            const targetMeshData = layerMeshMap.get(targetId);

            if (!sourceMeshData || !targetMeshData) {
                console.warn(`Cannot render connection from ${sourceId} to ${targetId}: mesh not found`);
                return;
            }

            // Use connection points if available, otherwise use mesh positions
            const sourcePoint = {
                position: sourceMeshData.connectionPoints?.output || sourceMeshData.mesh.position
            };
            const targetPoint = {
                position: targetMeshData.connectionPoints?.input || targetMeshData.mesh.position
            };

            this.renderConnection(sourcePoint, targetPoint, conn);
        });

        console.log(`Rendered ${this.connectionMeshes.length} connections`);
    }

    /**
     * Set visibility of all connections
     * @param {boolean} visible - Whether connections should be visible
     */
    setConnectionVisibility(visible) {
        this.connectionMeshes.forEach(mesh => {
            mesh.isVisible = visible;
        });
    }

    /**
     * Clear all connection meshes
     */
    clear() {
        this.connectionMeshes.forEach(mesh => {
            mesh.dispose();
        });
        this.connectionMeshes = [];
        this.connections = [];
    }

    /**
     * Get count of rendered connections
     * @returns {number}
     */
    getConnectionCount() {
        return this.connectionMeshes.length;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConnectionRenderer;
}
