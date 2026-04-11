const { v4: uuidv4 } = require('uuid');

class CameraModule {
    constructor() {
        this.cameras = new Map();
        this.activeCameraId = 'default_orbit';
        
        // Add a default orbit camera (representing the renderer's manual control)
        this.cameras.set('default_orbit', {
            id: 'default_orbit',
            name: 'Orbit Camera',
            type: 'orbit', // Special type for manual orbit control
            fov: 75
        });
    }

    createCamera(params) {
        const {
            name = 'New Camera',
            type = 'static', // static, follow
            position = { x: 5, y: 5, z: 5 },
            rotation = { x: 0, y: 0, z: 0, w: 1 },
            targetId = null,
            offset = { x: 0, y: 2, z: 5 },
            fov = 75
        } = params;

        const id = uuidv4();
        const camera = {
            id,
            name,
            type,
            position,
            rotation,
            targetId,
            offset,
            fov,
            metadata: {
                createdAt: new Date()
            }
        };

        this.cameras.set(id, camera);
        return camera;
    }

    getCamera(id) {
        return this.cameras.get(id);
    }

    getAllCameras() {
        return Array.from(this.cameras.values());
    }

    deleteCamera(id) {
        if (id === 'default_orbit') return false;
        if (this.activeCameraId === id) this.activeCameraId = 'default_orbit';
        return this.cameras.delete(id);
    }

    setActiveCamera(id) {
        if (this.cameras.has(id)) {
            this.activeCameraId = id;
            return true;
        }
        return false;
    }

    getActiveCamera() {
        return this.cameras.get(this.activeCameraId) || this.cameras.get('default_orbit');
    }

    updateCamera(id, updates) {
        const cam = this.cameras.get(id);
        if (cam) {
            Object.assign(cam, updates);
            return cam;
        }
        return null;
    }

    getSyncData() {
        return {
            activeCameraId: this.activeCameraId,
            cameras: Array.from(this.cameras.values())
        };
    }

    clearAll() {
        this.cameras.clear();
        this.cameras.set('default_orbit', {
            id: 'default_orbit',
            name: 'Orbit Camera',
            type: 'orbit',
            fov: 75
        });
        this.activeCameraId = 'default_orbit';
    }
}

module.exports = new CameraModule();
