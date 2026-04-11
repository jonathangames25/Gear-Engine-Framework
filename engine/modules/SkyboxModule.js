
class SkyboxModule {
    constructor() {
        this.config = {
            type: 'color', // 'color', 'cubemap', 'equirectangular'
            color: '#1a1a2e',
            assetPath: null, // for equirectangular
            cubemapPaths: null, // array of 6 paths for cubemap
            intensity: 1.0
        };
    }

    setSkybox(config) {
        // Validation and normalization
        if (config.type) this.config.type = config.type;
        if (config.color) this.config.color = config.color;
        if (config.assetPath) this.config.assetPath = config.assetPath;
        if (config.cubemapPaths) this.config.cubemapPaths = config.cubemapPaths;
        if (config.intensity !== undefined) this.config.intensity = config.intensity;

        console.log(`[SkyboxModule] Updated configuration:`, this.config);
        return this.config;
    }

    getSkybox() {
        return this.config;
    }

    // Helper for scripts to easily change skybox
    setColor(hex) {
        return this.setSkybox({ type: 'color', color: hex });
    }

    setEquirectangular(assetPath) {
        return this.setSkybox({ type: 'equirectangular', assetPath: assetPath });
    }

    setCubemap(paths) {
        if (!Array.isArray(paths) || paths.length !== 6) {
            throw new Error('Cubemap paths must be an array of 6 strings');
        }
        return this.setSkybox({ type: 'cubemap', cubemapPaths: paths });
    }
}

module.exports = new SkyboxModule();
