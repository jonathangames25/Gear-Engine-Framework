class MeshModule {
    constructor() {
        this.meshes = new Map(); // Stores mesh metadata and animation lists
    }

    registerMesh(id, data) {
        // data: { modelUrl, animations: [], bones: [] }
        this.meshes.set(id, {
            id,
            modelUrl: data.modelUrl,
            animations: data.animations || [],
            metadata: data.metadata || {}
        });
    }

    getMesh(id) {
        return this.meshes.get(id);
    }

    getAnimations(id) {
        const mesh = this.meshes.get(id);
        return mesh ? mesh.animations : [];
    }
}

module.exports = new MeshModule();
