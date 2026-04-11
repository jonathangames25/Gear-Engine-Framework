class MaterialModule {
    constructor() {
        this.materials = new Map();
        this.initDefaultMaterials();
    }

    initDefaultMaterials() {
        this.createMaterial('default', {
            color: '#ffffff',
            wireframe: false,
            opacity: 1,
            transparent: false
        });
    }

    createMaterial(id, props) {
        this.materials.set(id, {
            id,
            ...props
        });
        return this.materials.get(id);
    }

    getMaterial(id) {
        return this.materials.get(id);
    }

    updateMaterial(id, props) {
        const mat = this.materials.get(id);
        if (mat) {
            Object.assign(mat, props);
            return mat;
        }
        return null;
    }

    clearAll() {
        this.materials.clear();
        this.initDefaultMaterials();
    }
}

module.exports = new MaterialModule();
