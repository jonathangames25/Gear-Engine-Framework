const { v4: uuidv4 } = require('uuid');

class LightModule {
    constructor() {
        this.lights = new Map();
    }

    createLight(params) {
        const {
            name = 'New Light',
            type = 'point', // point, directional, spot
            color = '#ffffff',
            intensity = 1,
            position = { x: 0, y: 5, z: 0 },
            range = 10
        } = params;

        const id = uuidv4();
        const light = {
            id,
            name,
            type,
            color,
            intensity,
            position,
            range
        };

        this.lights.set(id, light);
        return light;
    }

    getLight(id) {
        return this.lights.get(id);
    }

    getAllLights() {
        return Array.from(this.lights.values());
    }

    updateLight(id, updates) {
        const light = this.lights.get(id);
        if (light) {
            Object.assign(light, updates);
            return light;
        }
        return null;
    }

    deleteLight(id) {
        return this.lights.delete(id);
    }

    clearAll() {
        this.lights.clear();
    }
}

module.exports = new LightModule();
